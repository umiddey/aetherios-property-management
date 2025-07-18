from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from datetime import datetime
import logging
import uuid

from services.base_service import BaseService
from utils.auth import hash_password, verify_password

logger = logging.getLogger(__name__)


class UserService(BaseService):
    """Service for managing user operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "users")
        self.setup_indexes()
    
    def setup_indexes(self):
        """Setup indexes for user collection."""
        try:
            # Username and email indexes for uniqueness
            self.db.users.create_index("username", unique=True, background=True)
            self.db.users.create_index("email", unique=True, background=True)
            # Performance indexes
            self.db.users.create_index("created_at", background=True)
            self.db.users.create_index("role", background=True)
            self.db.users.create_index("is_active", background=True)
            logger.info("User service indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create user indexes: {str(e)}")
    
    async def validate_create_data(self, data) -> None:
        """Validate user creation data."""
        # Check if username already exists
        existing_user = await self.collection.find_one({"username": data.username})
        if existing_user:
            raise HTTPException(status_code=400, detail=f"Username '{data.username}' already exists")
        
        # Check if email already exists
        existing_email = await self.collection.find_one({"email": data.email})
        if existing_email:
            raise HTTPException(status_code=400, detail=f"Email '{data.email}' already exists")
        
        # Validate password strength
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
        # Validate role
        valid_roles = ["super_admin", "admin", "user"]
        if data.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Role must be one of: {valid_roles}")
    
    async def validate_update_data(self, user_id: str, update_data: Dict[str, Any]) -> None:
        """Validate user update data."""
        if "username" in update_data:
            # Check if username already exists (excluding current user)
            existing_user = await self.collection.find_one({"username": update_data["username"]})
            if existing_user and existing_user.get("id") != user_id:
                raise HTTPException(status_code=400, detail=f"Username '{update_data['username']}' already exists")
        
        if "email" in update_data:
            # Check if email already exists (excluding current user)
            existing_email = await self.collection.find_one({"email": update_data["email"]})
            if existing_email and existing_email.get("id") != user_id:
                raise HTTPException(status_code=400, detail=f"Email '{update_data['email']}' already exists")
        
        if "password" in update_data and len(update_data["password"]) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
        if "role" in update_data:
            valid_roles = ["super_admin", "admin", "user"]
            if update_data["role"] not in valid_roles:
                raise HTTPException(status_code=400, detail=f"Role must be one of: {valid_roles}")
    
    async def create_user(self, user_data, created_by: str = None) -> Dict[str, Any]:
        """Create a new user."""
        await self.validate_create_data(user_data)
        
        # Hash password
        user_dict = user_data.model_dump()
        user_dict["hashed_password"] = hash_password(user_dict.pop("password"))
        
        # Handle first user as super admin
        users_count = await self.collection.count_documents({})
        if users_count == 0:
            user_dict["role"] = "super_admin"
        
        # Create user
        user_dict["id"] = str(uuid.uuid4())
        user_dict["created_at"] = datetime.utcnow()
        user_dict["is_active"] = True
        
        await self.collection.insert_one(user_dict)
        
        # Remove password from response
        user_dict.pop("hashed_password", None)
        
        logger.info(f"Created user: {user_data.username}")
        return user_dict
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        user = await self.get_by_id(user_id)
        if user:
            # Remove sensitive data from response
            user.pop("hashed_password", None)
        return user
    
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username."""
        user = await self.collection.find_one({"username": username})
        if user and "_id" in user:
            del user["_id"]
        return user
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        user = await self.collection.find_one({"email": email})
        if user and "_id" in user:
            del user["_id"]
        return user
    
    async def get_all_users(self, **kwargs) -> List[Dict[str, Any]]:
        """Get all users."""
        # Map offset to skip for base service compatibility
        if 'offset' in kwargs:
            kwargs['skip'] = kwargs.pop('offset')
        
        users = await self.get_all({}, **kwargs)
        
        # Remove sensitive data from all users
        for user in users:
            user.pop("hashed_password", None)
        
        return users
    
    async def update_user(self, user_id: str, update_data) -> Optional[Dict[str, Any]]:
        """Update a user."""
        if hasattr(update_data, 'model_dump'):
            update_dict = update_data.model_dump(exclude_unset=True)
        else:
            update_dict = update_data
        
        await self.validate_update_data(user_id, update_dict)
        
        # Hash password if provided
        if "password" in update_dict:
            update_dict["hashed_password"] = hash_password(update_dict.pop("password"))
        
        result = await self.update(user_id, update_dict)
        if result:
            # Remove sensitive data from response
            result.pop("hashed_password", None)
            logger.info(f"Updated user: {user_id}")
        return result
    
    async def delete_user(self, user_id: str, current_user_id: str) -> bool:
        """Delete a user."""
        # Prevent self-deletion
        if user_id == current_user_id:
            raise HTTPException(status_code=400, detail="Cannot delete own account")
        
        result = await self.delete(user_id)
        if result:
            logger.info(f"Deleted user: {user_id}")
            return True
        return False
    
    async def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate a user by username and password."""
        try:
            # Try to find user with exact username first
            user = await self.collection.find_one({"username": username})
            
            # If not found, try case-insensitive search
            if not user:
                user = await self.collection.find_one({
                    "username": {"$regex": f"^{username}$", "$options": "i"}
                })
            
            if not user:
                return None
            
            if not verify_password(password, user["hashed_password"]):
                return None
            
            if not user.get("is_active", True):
                return None
            
            # Remove sensitive data from response
            user.pop("hashed_password", None)
            if "_id" in user:
                del user["_id"]
            
            return user
        except Exception as e:
            logger.error(f"Authentication error for user '{username}': {str(e)}")
            return None
    
    async def get_user_stats(self) -> Dict[str, Any]:
        """Get user statistics."""
        try:
            stats = await self.collection.aggregate([
                {
                    "$group": {
                        "_id": None,
                        "total_users": {"$sum": 1},
                        "active_users": {
                            "$sum": {"$cond": [{"$eq": ["$is_active", True]}, 1, 0]}
                        },
                        "super_admins": {
                            "$sum": {"$cond": [{"$eq": ["$role", "super_admin"]}, 1, 0]}
                        },
                        "admins": {
                            "$sum": {"$cond": [{"$eq": ["$role", "admin"]}, 1, 0]}
                        },
                        "regular_users": {
                            "$sum": {"$cond": [{"$eq": ["$role", "user"]}, 1, 0]}
                        }
                    }
                }
            ]).to_list(1)
            
            if stats:
                return stats[0]
            else:
                return {
                    "total_users": 0,
                    "active_users": 0,
                    "super_admins": 0,
                    "admins": 0,
                    "regular_users": 0
                }
        except Exception as e:
            logger.error(f"Error getting user stats: {str(e)}")
            raise