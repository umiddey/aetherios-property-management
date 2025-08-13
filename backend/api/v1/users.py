from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import logging

from services.user_service import UserService
from models.user import User, UserCreate, UserUpdate, UserResponse, UserLogin, Token
from utils.auth import get_current_user, get_super_admin, create_access_token
from utils.dependencies import get_database

logger = logging.getLogger(__name__)

router = APIRouter()

# Auth routes
@router.post("/auth/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Register a new user."""
    try:
        user_service = UserService(db)
        
        # Check if this is the first user (auto super admin)
        users_count = await db.users.count_documents({})
        if users_count > 0 and user_data.role.value == "super_admin":
            raise HTTPException(
                status_code=403, 
                detail="Cannot create another super admin via public registration"
            )
        
        user = await user_service.create_user(user_data)
        return UserResponse(**user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")

@router.post("/auth/login", response_model=Token)
async def login(
    user_data: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Login user."""
    try:
        user_service = UserService(db)
        user = await user_service.authenticate_user(user_data.username, user_data.password)
        
        if not user:
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        
        access_token = create_access_token(data={"sub": user["id"]})
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(**user)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")

# User management routes
@router.post("/users/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    super_admin = Depends(get_super_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new user (super admin only)."""
    try:
        user_service = UserService(db)
        user = await user_service.create_user(user_data, super_admin.id)
        return UserResponse(**user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.get("/users/", response_model=List[UserResponse])
async def get_users(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all users."""
    try:
        user_service = UserService(db)
        users = await user_service.get_all_users(offset=offset, limit=limit)
        return [UserResponse(**user) for user in users]
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@router.get("/users/me", response_model=UserResponse)
async def get_me(
    current_user = Depends(get_current_user)
):
    """Get current user info."""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        created_at=datetime.now(timezone.utc),  # Note: this would need to be fetched from DB for accurate created_at
        is_active=current_user.is_active
    )

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific user by ID."""
    try:
        user_service = UserService(db)
        user = await user_service.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(**user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user")

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    super_admin = Depends(get_super_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update a user (super admin only)."""
    try:
        user_service = UserService(db)
        user = await user_service.update_user(user_id, user_data)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(**user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user")

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    super_admin = Depends(get_super_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a user (super admin only)."""
    try:
        user_service = UserService(db)
        success = await user_service.delete_user(user_id, super_admin.id)
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete user")

@router.get("/users/stats/summary")
async def get_user_stats(
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get user statistics."""
    try:
        user_service = UserService(db)
        stats = await user_service.get_user_stats()
        return stats
    except Exception as e:
        logger.error(f"Error fetching user stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user statistics")