"""
Portal API - Customer/Tenant Portal Access System
Handles invitation-based account activation and portal authentication
"""

import secrets
import string
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, status, Header
from passlib.context import CryptContext
from jose import JWTError, jwt

from models.account import (
    PortalInvitationResponse, 
    PortalActivation, 
    PortalLogin, 
    PortalLoginResponse,
    AccountResponse
)
from dependencies import get_current_user, db
from services.tenant_service import TenantService

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings (reuse from main auth)
import os
from dotenv import load_dotenv
load_dotenv()

SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter(prefix="/portal", tags=["portal"])


def generate_portal_code() -> str:
    """Generate a random 7-character portal invitation code"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(7))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash password for storage"""
    return pwd_context.hash(password)


def create_portal_access_token(account_id: str, email: str) -> str:
    """Create JWT token for portal access"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": account_id,
        "email": email,
        "type": "portal",  # Distinguish from admin tokens
        "exp": expire
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_portal_user(authorization: str = Header(None)):
    """
    Dependency to get current authenticated portal user
    Similar to get_current_user but for portal tokens
    """
    from fastapi.security.utils import get_authorization_scheme_param
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate portal credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not authorization:
        raise credentials_exception
    
    scheme, token = get_authorization_scheme_param(authorization)
    if scheme.lower() != "bearer":
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        account_id: str = payload.get("sub")
        email: str = payload.get("email")
        token_type: str = payload.get("type")
        
        if account_id is None or token_type != "portal":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Get tenant account using TenantService
    tenant_service = TenantService(db)
    tenant_account = await tenant_service.get_tenant_by_id(account_id)
    
    if tenant_account is None or tenant_account.is_archived:
        raise credentials_exception
    
    # Check portal access in tenant profile data
    portal_active = False
    portal_email = None
    if tenant_account.profile_data:
        portal_active = tenant_account.profile_data.get("portal_active", False)
        portal_email = tenant_account.profile_data.get("portal_email")
    
    # Verify portal is active and email matches
    if not portal_active or portal_email != email:
        raise credentials_exception
    
    # Convert to dict format for backward compatibility
    account_dict = {
        "id": tenant_account.id,
        "email": tenant_account.email,
        "first_name": tenant_account.first_name,
        "last_name": tenant_account.last_name,
        "account_type": tenant_account.account_type,
        "is_archived": tenant_account.is_archived
    }
    
    # Add profile data fields
    if tenant_account.profile_data:
        account_dict.update(tenant_account.profile_data)
    
    return account_dict


@router.get("/invite/{portal_code}", response_model=PortalInvitationResponse)
async def get_portal_invitation(portal_code: str):
    """
    Validate portal invitation code and return account information for activation
    URL: GET /api/v1/portal/invite/ZJD1ML0
    """
    # Find tenant with this portal code using TenantService
    tenant_service = TenantService(db)
    tenant_account = await tenant_service.get_tenant_by_portal_code(portal_code)
    
    if not tenant_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invitation code"
        )
    
    # Check if already activated (from profile data)
    portal_active = False
    if tenant_account.profile_data:
        portal_active = tenant_account.profile_data.get("portal_active", False)
    
    is_valid = not portal_active
    
    return PortalInvitationResponse(
        account_id=tenant_account.id,
        first_name=tenant_account.first_name,
        last_name=tenant_account.last_name,
        email=tenant_account.email,
        address=tenant_account.address,
        account_type=tenant_account.account_type,
        is_valid=is_valid
    )


@router.post("/activate", response_model=PortalLoginResponse)
async def activate_portal_account(activation: PortalActivation):
    """
    Activate portal account with password creation
    This invalidates the invitation code and enables regular login
    """
    # Find tenant with portal code using TenantService
    tenant_service = TenantService(db)
    tenant_account = await tenant_service.get_tenant_by_portal_code(activation.portal_code)
    
    if not tenant_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invitation code"
        )
    
    # Check if already activated (from profile data)
    portal_active = False
    if tenant_account.profile_data:
        portal_active = tenant_account.profile_data.get("portal_active", False)
    
    if portal_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account already activated. Please use regular login."
        )
    
    # Hash password and activate account
    password_hash = get_password_hash(activation.password)
    
    # Allow custom email or use account's existing email
    portal_email = activation.email if activation.email else tenant_account.email
    
    # TODO: Check if this portal_email is already in use by another tenant
    # For now, we'll skip this check to focus on the core architectural cleanup
    
    # Activate portal account using TenantService
    success = await tenant_service.activate_portal_account(
        portal_code=activation.portal_code,
        email=portal_email,
        password_hash=password_hash
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate portal account"
        )
    
    # Create access token
    access_token = create_portal_access_token(tenant_account.id, tenant_account.email)
    
    # Get updated tenant account data
    updated_tenant = await tenant_service.get_tenant_by_id(tenant_account.id)
    
    # Return login response
    return PortalLoginResponse(
        access_token=access_token,
        account=updated_tenant
    )


@router.post("/login", response_model=PortalLoginResponse)
async def portal_login(login: PortalLogin):
    """
    Regular portal login for activated accounts
    """
    # Find tenant by portal_email using TenantService
    tenant_service = TenantService(db)
    
    # For simplicity during this architectural cleanup, we'll find by looking through all tenants
    # TODO: Add optimized email lookup method to TenantService  
    all_tenants = await tenant_service.get_tenants(limit=1000)  # Get all tenants
    
    matching_tenant = None
    for tenant in all_tenants:
        if tenant.profile_data:
            portal_email = tenant.profile_data.get("portal_email")
            portal_active = tenant.profile_data.get("portal_active", False)
            
            # Check if this tenant matches login email and is active
            if portal_active and (portal_email == login.email or tenant.email == login.email):
                matching_tenant = tenant
                break
    
    if not matching_tenant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    portal_password_hash = None
    if matching_tenant.profile_data:
        portal_password_hash = matching_tenant.profile_data.get("portal_password_hash")
    
    if not portal_password_hash or not verify_password(login.password, portal_password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update last login using TenantService
    await tenant_service.update_tenant_profile(matching_tenant.id, {
        "portal_last_login": datetime.now(timezone.utc)
    })
    
    # Create access token
    access_token = create_portal_access_token(matching_tenant.id, matching_tenant.email)
    
    # Return login response
    return PortalLoginResponse(
        access_token=access_token,
        account=matching_tenant
    )


@router.get("/me", response_model=AccountResponse)
async def get_portal_user_info(current_account=Depends(get_current_portal_user)):
    """
    Get current portal user information
    Used for authentication validation and user context
    """
    return AccountResponse(
        id=current_account["id"],
        account_type=current_account.get("account_type", "tenant"),
        status=current_account.get("status", "active"),
        first_name=current_account.get("first_name", ""),
        last_name=current_account.get("last_name", ""),
        email=current_account.get("email", ""),
        phone=current_account.get("phone"),
        address=current_account.get("address"),
        created_at=current_account.get("created_at"),
        updated_at=current_account.get("updated_at"),
        is_archived=current_account.get("is_archived", False),
        portal_code=current_account.get("portal_code"),
        portal_active=current_account.get("portal_active", True),
        portal_last_login=current_account.get("portal_last_login"),
        full_name=f"{current_account.get('first_name', '')} {current_account.get('last_name', '')}".strip()
    )


@router.get("/dashboard")
async def get_portal_dashboard(current_account=Depends(get_current_portal_user)):
    """
    Get portal dashboard data for authenticated tenant
    Returns contracts, invoices, and basic account info
    """
    # This will be implemented in the next step
    return {
        "message": "Portal dashboard endpoint - to be implemented",
        "account_id": current_account["id"],
        "account_name": f"{current_account['first_name']} {current_account['last_name']}"
    }


@router.get("/contracts")
async def get_portal_contracts(current_account=Depends(get_current_portal_user)):
    """
    Get all active contracts for the authenticated portal user (tenant)
    Used for service request contract selection
    """
    from services.account_service import AccountService
    
    account_service = AccountService(db)
    
    try:
        contracts = await account_service.get_active_contracts_for_account(current_account["id"])
        return contracts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve portal contracts: {str(e)}"
        )


@router.get("/furnished-items/property/{property_id}")
async def get_portal_furnished_items(
    property_id: str,
    current_account=Depends(get_current_portal_user)
):
    """
    Get furnished items for a specific property (portal access)
    Used for service request furnished item selection
    """
    from services.property_service import PropertyService
    from services.account_service import AccountService
    
    property_service = PropertyService(db)
    account_service = AccountService(db)
    
    try:
        # Verify tenant has access to this property through active contracts
        contracts = await account_service.get_active_contracts_for_account(current_account["id"])
        
        # Check if tenant has a contract for this property
        has_access = any(contract.get("property_id") == property_id for contract in contracts)
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to furnished items for this property"
            )
        
        # Get furnished items for the property
        items = await property_service.get_furnished_items_by_property(property_id)
        return items
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve furnished items: {str(e)}"
        )