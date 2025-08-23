from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging

from services.analytics.activity_service import ActivityService
from models.activity import Activity, ActivityCreate, ActivityUpdate, ActivityResponse
from utils.auth import get_current_user
from utils.dependencies import get_database

logger = logging.getLogger(__name__)

router = APIRouter()

# Activity routes
@router.post("/activities/", response_model=ActivityResponse)
async def create_activity(
    activity_data: ActivityCreate,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new activity."""
    try:
        activity_service = ActivityService(db)
        activity = await activity_service.create_activity(activity_data, current_user.id)
        return ActivityResponse(**activity)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create activity")

@router.get("/activities/", response_model=List[ActivityResponse])
async def get_activities(
    task_order_id: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get activities with optional task order filter."""
    try:
        activity_service = ActivityService(db)
        
        if task_order_id:
            activities = await activity_service.get_activities_by_task(task_order_id, offset, limit)
        else:
            activities = await activity_service.get_all(skip=offset, limit=limit)
        
        return [ActivityResponse(**activity) for activity in activities]
    except Exception as e:
        logger.error(f"Error fetching activities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch activities")

@router.get("/activities/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    activity_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific activity by ID."""
    try:
        activity_service = ActivityService(db)
        activity = await activity_service.get_by_id(activity_id)
        
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        return ActivityResponse(**activity)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching activity {activity_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch activity")

@router.put("/activities/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    activity_id: str,
    activity_data: ActivityUpdate,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update an activity."""
    try:
        activity_service = ActivityService(db)
        
        # Convert to dict and remove None values
        update_data = {k: v for k, v in activity_data.model_dump().items() if v is not None}
        
        activity = await activity_service.update_activity(activity_id, update_data)
        
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        return ActivityResponse(**activity)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating activity {activity_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update activity")

@router.delete("/activities/{activity_id}")
async def delete_activity(
    activity_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete an activity."""
    try:
        activity_service = ActivityService(db)
        success = await activity_service.delete(activity_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        return {"message": "Activity deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting activity {activity_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete activity")

@router.get("/activities/task/{task_order_id}", response_model=List[ActivityResponse])
async def get_activities_by_task(
    task_order_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get activities for a specific task order."""
    try:
        activity_service = ActivityService(db)
        activities = await activity_service.get_activities_by_task(task_order_id, offset, limit)
        return [ActivityResponse(**activity) for activity in activities]
    except Exception as e:
        logger.error(f"Error fetching activities for task {task_order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch activities")

@router.get("/activities/stats/summary")
async def get_activity_stats(
    task_order_id: Optional[str] = Query(None),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get activity statistics."""
    try:
        activity_service = ActivityService(db)
        stats = await activity_service.get_activity_stats(task_order_id)
        return stats
    except Exception as e:
        logger.error(f"Error fetching activity stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch activity statistics")