from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import os
from typing import Optional, Dict, Any

from utils.database import get_database

# JWT Configuration (must be set via environment)
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET must be set and at least 32 characters long")
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

class User:
    def __init__(self, id: str, username: str, email: str, full_name: str, role: str, is_active: bool = True):
        self.id = id
        self.username = username
        self.email = email
        self.full_name = full_name
        self.role = role
        self.is_active = is_active

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(
    data: Dict[str, Any],
    *,
    token_type: str = "admin",
    expires_minutes: Optional[int] = None,
    expires_hours: Optional[int] = None,
) -> str:
    """
    Create a JWT access token with a standard set of claims.

    - token_type: distinguishes admin vs portal tokens
    - expiration: choose minutes or hours; defaults to JWT_EXPIRATION_HOURS
    """
    to_encode = data.copy()
    # Compute expiry
    if expires_minutes is not None:
        expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    elif expires_hours is not None:
        expire = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)

    to_encode.update({
        "exp": expire,
        "type": token_type,
    })
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def create_portal_access_token(account_id: str, email: str, *, expires_hours: int = 24) -> str:
    """Helper to create a typed portal token with default 24h expiry."""
    return create_access_token({"sub": account_id, "email": normalize_email(email)}, token_type="portal", expires_hours=expires_hours)

def decode_token(token: str) -> Dict[str, Any]:
    """Decode JWT token and return its payload (raises on failure)."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

def normalize_email(value: Optional[str]) -> str:
    """Normalize email for consistent matching and storage."""
    return (value or "").strip().lower()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> User:
    """Get the current authenticated user."""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return User(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        is_active=user["is_active"]
    )

async def get_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require super admin privileges."""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges"
        )
    return current_user

async def get_property_manager_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require property manager admin or higher privileges."""
    if current_user.role not in ["property_manager_admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Property manager admin privileges required"
        )
    return current_user

async def get_normal_user(current_user: User = Depends(get_current_user)) -> User:
    """Require normal user or higher privileges (all logged in users)."""
    if current_user.role not in ["user", "property_manager_admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User privileges required"
        )
    return current_user

async def get_portal_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """
    Validate portal JWT tokens for tenant service request submissions.
    
    Portal tokens are separate from admin tokens and only allow service request creation.
    Maintains security isolation between tenant portal and admin ERP system.
    """
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Verify this is a portal token (not admin token)
        token_type = payload.get("type")
        if token_type != "portal":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type - portal access required"
            )
        
        # Extract portal user information
        account_id = payload.get("sub")
        if account_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid portal authentication credentials"
            )
        
        # Verify account exists and is actually a tenant account
        tenant_doc = await db.accounts.find_one({"id": account_id})
        
        if tenant_doc is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Portal account not found or inactive"
            )
        
        # Security check: verify account is actually a tenant type
        if tenant_doc.get("account_type") != "tenant":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Portal access is only available for tenant accounts"
            )
        
        # Check portal access in tenant profile data
        portal_active = False
        profile_data = await db.tenant_profiles.find_one({"account_id": account_id})
        if profile_data:
            portal_active = profile_data.get("portal_active", False)
        
        if not portal_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Portal access is not active for this account"
            )
        
        # Return portal user context for service request creation
        return {
            "account_id": account_id,
            "email": payload.get("email"),
            "type": "portal",
            "account_type": tenant_doc.get("account_type"),
            "company_id": None
        }
        
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid portal authentication credentials"
        )