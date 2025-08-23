"""
Portal API - Customer/Tenant Portal Access System
Handles invitation-based account activation and portal authentication
Unified to use central auth utilities (JWT + bcrypt) and provide refresh.
"""

import secrets
import string
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, status, Header

from models.account import (
    PortalInvitationResponse, 
    PortalActivation, 
    PortalLogin, 
    PortalLoginResponse,
    AccountResponse
)
from motor.motor_asyncio import AsyncIOMotorDatabase
from utils.dependencies import get_database
from utils.auth import (
    create_portal_access_token,
    decode_token,
    verify_password as verify_bcrypt_password,
    hash_password as bcrypt_hash_password,
    normalize_email,
    get_portal_user,
)
from services.accounts.tenant_service import TenantService

router = APIRouter(prefix="/portal", tags=["portal"])


def generate_portal_code() -> str:
    """Generate a random 7-character portal invitation code"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(7))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash (bcrypt)."""
    return verify_bcrypt_password(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash password for storage (bcrypt)."""
    return bcrypt_hash_password(password)


def _create_portal_token(account_id: str, email_for_token: str) -> str:
    """Create a typed portal JWT using central auth util (24h by default)."""
    return create_portal_access_token(account_id, email_for_token, expires_hours=24)


async def get_current_portal_user(
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
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
        payload = decode_token(token)
        account_id: str = payload.get("sub")
        email: str = normalize_email(payload.get("email"))
        token_type: str = payload.get("type")
        
        if account_id is None or token_type != "portal":
            raise credentials_exception
    except Exception:
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
        portal_email = normalize_email(tenant_account.profile_data.get("portal_email"))
    
    # Verify portal is active and token email matches the configured portal email (or base email for backward compatibility)
    if not portal_active:
        raise credentials_exception
    if portal_email and email != portal_email:
        raise credentials_exception
    if not portal_email and email != normalize_email(tenant_account.email):
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
async def get_portal_invitation(
    portal_code: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
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
async def activate_portal_account(
    activation: PortalActivation,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
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
    portal_email = normalize_email(activation.email) if activation.email else normalize_email(tenant_account.email)
    
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
    
    # Get updated tenant account data
    updated_tenant = await tenant_service.get_tenant_by_id(tenant_account.id)

    # Create access token using portal email if configured
    token_email = (
        normalize_email((updated_tenant.profile_data or {}).get("portal_email"))
        if updated_tenant and updated_tenant.profile_data else normalize_email(tenant_account.email)
    )
    access_token = _create_portal_token(tenant_account.id, token_email)
    
    # Return login response
    return PortalLoginResponse(
        access_token=access_token,
        account=updated_tenant
    )


@router.post("/login", response_model=PortalLoginResponse)
async def portal_login(
    login: PortalLogin,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Regular portal login for activated accounts
    """
    # Find tenant by portal_email using TenantService
    tenant_service = TenantService(db)
    
    # Optimized lookup: try portal_email match, then base account email
    matching_tenant = await tenant_service.get_tenant_by_portal_email(login.email)
    if not matching_tenant:
        matching_tenant = await tenant_service.get_tenant_by_account_email(login.email)
    
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
    
    # Determine which email to embed in token: prefer configured portal email
    token_email = (
        normalize_email((matching_tenant.profile_data or {}).get("portal_email"))
        if matching_tenant and matching_tenant.profile_data else normalize_email(matching_tenant.email)
    )
    # Create access token
    access_token = _create_portal_token(matching_tenant.id, token_email)
    
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


@router.post("/refresh", response_model=PortalLoginResponse)
async def refresh_portal_token(
    authorization: str = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Refresh a valid portal token, returning a new token with sliding expiration."""
    from fastapi.security.utils import get_authorization_scheme_param

    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials")

    scheme, token = get_authorization_scheme_param(authorization)
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Validate existing token
    try:
        payload = decode_token(token)
        if payload.get("type") != "portal":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        account_id = payload.get("sub")
        email = payload.get("email")
        if not account_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    tenant_service = TenantService(db)
    tenant_account = await tenant_service.get_tenant_by_id(account_id)
    if not tenant_account or tenant_account.is_archived:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not available")

    portal_active = False
    portal_email = None
    if tenant_account.profile_data:
        portal_active = tenant_account.profile_data.get("portal_active", False)
        portal_email = normalize_email(tenant_account.profile_data.get("portal_email"))

    if not portal_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Portal access disabled")

    # Backward compatibility: accept base email or configured portal email from prior token
    token_email = portal_email or normalize_email(tenant_account.email)
    if email not in {token_email, normalize_email(tenant_account.email)}:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email mismatch")

    # Issue new token
    new_token = _create_portal_token(account_id, token_email)

    return PortalLoginResponse(
        access_token=new_token,
        account=tenant_account
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
async def get_portal_contracts(
    current_account=Depends(get_current_portal_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Get all active contracts for the authenticated portal user (tenant)
    Used for service request contract selection
    """
    from services.accounts.account_service import AccountService
    
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
    current_account=Depends(get_current_portal_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Get furnished items for a specific property (portal access)
    Used for service request furnished item selection
    """
    from services.core.property_service import PropertyService
    from services.accounts.account_service import AccountService
    
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


@router.get("/service-request-metadata")
async def get_service_request_metadata(portal_user = Depends(get_portal_user)):
    """
    Get service request metadata for portal form dropdowns
    
    Returns the available service request types, priorities, and statuses
    for authenticated portal users (tenants) to populate form dropdowns.
    
    SECURITY: Replaces public endpoints that exposed internal business logic.
    Only authenticated portal users can access this operational data.
    """
    try:
        # Import service request enums
        from models.service_request import ServiceRequestType, ServiceRequestPriority, ServiceRequestStatus
        
        return {
            "types": [request_type.value for request_type in ServiceRequestType],
            "priorities": [priority.value for priority in ServiceRequestPriority], 
            "statuses": [status.value for status in ServiceRequestStatus]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve service request metadata: {str(e)}"
        )