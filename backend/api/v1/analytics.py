from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging

from services.analytics.analytics_service import AnalyticsService
from models.analytics import AnalyticsLog, AnalyticsLogCreate, AnalyticsLogResponse
from utils.auth import get_current_user
from utils.dependencies import get_database

logger = logging.getLogger(__name__)

router = APIRouter()

# Analytics routes
@router.post("/analytics/log", response_model=AnalyticsLogResponse)
async def log_analytics(
    log_data: AnalyticsLogCreate,
    request: Request,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Log an analytics action."""
    try:
        analytics_service = AnalyticsService(db)
        
        # Extract IP address and user agent from request
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        log = await analytics_service.log_action(
            log_data, 
            current_user.id, 
            ip_address, 
            user_agent
        )
        
        return AnalyticsLogResponse(**log)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to log analytics")

@router.get("/analytics/logs", response_model=List[AnalyticsLogResponse])
async def get_analytics_logs(
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get analytics logs with optional filters."""
    try:
        analytics_service = AnalyticsService(db)
        
        if user_id:
            logs = await analytics_service.get_logs_by_user(user_id, offset, limit)
        elif action:
            logs = await analytics_service.get_logs_by_action(action, offset, limit)
        else:
            logs = await analytics_service.get_all(skip=offset, limit=limit)
        
        return [AnalyticsLogResponse(**log) for log in logs]
    except Exception as e:
        logger.error(f"Error fetching analytics logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics logs")

@router.get("/analytics/logs/{log_id}", response_model=AnalyticsLogResponse)
async def get_analytics_log(
    log_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific analytics log by ID."""
    try:
        analytics_service = AnalyticsService(db)
        log = await analytics_service.get_by_id(log_id)
        
        if not log:
            raise HTTPException(status_code=404, detail="Analytics log not found")
        
        return AnalyticsLogResponse(**log)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching analytics log {log_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics log")

@router.get("/analytics/stats/summary")
async def get_analytics_stats(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get analytics statistics."""
    try:
        analytics_service = AnalyticsService(db)
        
        # Parse dates if provided
        start_datetime = None
        end_datetime = None
        
        if start_date:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
        
        stats = await analytics_service.get_analytics_stats(start_datetime, end_datetime)
        return stats
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching analytics stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics statistics")

@router.get("/analytics/popular-actions")
async def get_popular_actions(
    limit: int = Query(10, ge=1, le=100),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get most popular actions."""
    try:
        analytics_service = AnalyticsService(db)
        popular_actions = await analytics_service.get_popular_actions(limit)
        return {"popular_actions": popular_actions}
    except Exception as e:
        logger.error(f"Error fetching popular actions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch popular actions")

@router.get("/analytics/user/{user_id}", response_model=List[AnalyticsLogResponse])
async def get_user_analytics(
    user_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get analytics logs for a specific user."""
    try:
        analytics_service = AnalyticsService(db)
        logs = await analytics_service.get_logs_by_user(user_id, offset, limit)
        return [AnalyticsLogResponse(**log) for log in logs]
    except Exception as e:
        logger.error(f"Error fetching user analytics for {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user analytics")