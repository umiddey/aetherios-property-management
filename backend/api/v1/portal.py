"""
Portal API - Customer/Tenant Portal Access System
Handles invitation-based account activation and portal authentication
"""

import secrets
import string
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, status
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

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings (reuse from main auth)
SECRET_KEY = "your-secret-key"  # Should be from environment
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
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": account_id,
        "email": email,
        "type": "portal",  # Distinguish from admin tokens
        "exp": expire
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_portal_user():
    """
    Dependency to get current authenticated portal user
    Similar to get_current_user but for portal tokens
    """
    # This will be implemented to validate portal JWT tokens
    # For now, return a placeholder
    return {"id": "test", "first_name": "Test", "last_name": "User"}


@router.get("/invite/{portal_code}", response_model=PortalInvitationResponse)
async def get_portal_invitation(portal_code: str):
    """
    Validate portal invitation code and return account information for activation
    URL: GET /api/v1/portal/invite/ZJD1ML0
    """
    # Find account with this portal code (check both accounts and tenants collections)
    account = await db.accounts.find_one({
        "portal_code": portal_code,
        "is_archived": False
    })
    
    # If not found in accounts, check tenants collection (backward compatibility)
    if not account:
        account = await db.tenants.find_one({
            "portal_code": portal_code,
            "is_archived": False
        })
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invitation code"
        )
    
    # Check if already activated
    is_valid = not account.get("portal_active", False)
    
    return PortalInvitationResponse(
        account_id=account["id"],
        first_name=account["first_name"],
        last_name=account["last_name"],
        email=account["email"],
        address=account.get("address"),
        account_type=account["account_type"],
        is_valid=is_valid
    )


@router.post("/activate", response_model=PortalLoginResponse)
async def activate_portal_account(activation: PortalActivation):
    """
    Activate portal account with password creation
    This invalidates the invitation code and enables regular login
    """
    # Find account with portal code (check both accounts and tenants collections)
    account = await db.accounts.find_one({
        "portal_code": activation.portal_code,
        "is_archived": False
    })
    
    # If not found in accounts, check tenants collection (backward compatibility)
    if not account:
        account = await db.tenants.find_one({
            "portal_code": activation.portal_code,
            "is_archived": False
        })
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invitation code"
        )
    
    # Check if already activated
    if account.get("portal_active", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account already activated. Please use regular login."
        )
    
    # Hash password and activate account
    password_hash = get_password_hash(activation.password)
    
    # Allow custom email or use account's existing email
    portal_email = activation.email if activation.email else account.get("email")
    
    # Check if this portal_email is already in use by another account's portal_email
    existing_portal_account = await db.accounts.find_one({
        "portal_email": portal_email,
        "portal_active": True,
        "id": {"$ne": account["id"]}  # Exclude current account
    })
    
    # Also check tenants collection for backward compatibility
    if not existing_portal_account:
        existing_portal_account = await db.tenants.find_one({
            "portal_email": portal_email,
            "portal_active": True,
            "id": {"$ne": account.get("id", account.get("_id"))}  # Exclude current account
        })
    
    if existing_portal_account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email address is already in use for portal access. Please choose a different email."
        )
    
    # Determine which collection to update (fix: use _id instead of id)
    collection = db.accounts if await db.accounts.find_one({"_id": account["_id"]}) else db.tenants
    
    await collection.update_one(
        {"_id": account["_id"]},
        {
            "$set": {
                "portal_email": portal_email,  # Store the chosen email for portal login
                "portal_password_hash": password_hash,
                "portal_active": True,
                "portal_last_login": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            "$unset": {
                "portal_code": ""  # Remove the invitation code
            }
        }
    )
    
    # Create access token
    access_token = create_portal_access_token(account["id"], account["email"])
    
    # Ensure portal fields exist with defaults for AccountResponse compatibility
    account.setdefault("portal_code", None)  # Removed during activation
    account.setdefault("portal_active", True)
    account.setdefault("portal_last_login", datetime.utcnow())
    
    # Return login response
    account_response = AccountResponse(**account)
    return PortalLoginResponse(
        access_token=access_token,
        account=account_response
    )


@router.post("/login", response_model=PortalLoginResponse)
async def portal_login(login: PortalLogin):
    """
    Regular portal login for activated accounts
    """
    # Find account by portal_email (primary) or fallback to email (backward compatibility)
    account = await db.accounts.find_one({
        "$or": [
            {"portal_email": login.email},
            {"email": login.email}
        ],
        "is_archived": False,
        "portal_active": True
    })
    
    # If not found in accounts, check tenants collection (backward compatibility)
    if not account:
        account = await db.tenants.find_one({
            "$or": [
                {"portal_email": login.email},
                {"email": login.email}
            ],
            "is_archived": False,
            "portal_active": True
        })
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not account.get("portal_password_hash") or not verify_password(login.password, account["portal_password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update last login
    # Determine which collection to update (fix: use _id instead of id)
    collection = db.accounts if await db.accounts.find_one({"_id": account["_id"]}) else db.tenants
    
    await collection.update_one(
        {"_id": account["_id"]},
        {
            "$set": {
                "portal_last_login": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Create access token
    access_token = create_portal_access_token(account["id"], account["email"])
    
    # Ensure portal fields exist with defaults for AccountResponse compatibility
    account.setdefault("portal_code", None)
    account.setdefault("portal_active", True)
    account.setdefault("portal_last_login", datetime.utcnow())
    
    # Return login response
    account_response = AccountResponse(**account)
    return PortalLoginResponse(
        access_token=access_token,
        account=account_response
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