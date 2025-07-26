from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import jwt
import os
import logging
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from services.property_service import PropertyService
from repositories.property_repository import PropertyRepository

logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/erp_db')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'


class User:
    """User model for dependency injection."""
    def __init__(self, id: str, username: str, email: str, role: str):
        self.id = id
        self.username = username
        self.email = email
        self.role = role


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user."""
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
    
    user_doc = await db.users.find_one({"id": user_id})
    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return User(
        id=user_doc["id"],
        username=user_doc["username"],
        email=user_doc["email"],
        role=user_doc["role"]
    )


async def get_portal_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
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
        
        # Verify account exists in accounts collection
        account_doc = await db.accounts.find_one({"id": account_id})
        if account_doc is None or not account_doc.get("portal_active"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Portal account not found or inactive"
            )
        
        # Return portal user context for service request creation
        return {
            "account_id": account_id,
            "email": payload.get("email"),
            "type": "portal",
            "account_type": account_doc.get("account_type", "tenant"),
            "company_id": account_doc.get("company_id")
        }
        
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid portal authentication credentials"
        )


async def get_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Get current user and verify super admin role."""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges"
        )
    return current_user


# Service Dependencies
async def get_property_repository() -> PropertyRepository:
    """Get property repository instance."""
    return PropertyRepository(db)


async def get_property_service(
    property_repository: PropertyRepository = Depends(get_property_repository)
) -> PropertyService:
    """Get property service instance."""
    return PropertyService(db)