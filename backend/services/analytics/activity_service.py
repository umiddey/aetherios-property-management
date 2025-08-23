from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from datetime import datetime
import logging
import uuid

from services.base_service import BaseService

logger = logging.getLogger(__name__)


class ActivityService(BaseService):
    """Service for managing activity operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "activities")
    
    def setup_indexes(self):
        """Setup indexes for activities collection."""
        try:
            # Performance indexes
            self.db.activities.create_index("created_at", background=True)
            self.db.activities.create_index("created_by", background=True)
            self.db.activities.create_index("task_order_id", background=True)
            self.db.activities.create_index("activity_date", background=True)
            # Compound indexes for common queries
            self.db.activities.create_index([("task_order_id", 1), ("activity_date", -1)], background=True)
            logger.info("Activity service indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create activity indexes: {str(e)}")
    
    async def validate_create_data(self, data) -> None:
        """Validate activity creation data."""
        # Verify task order exists
        task_order = await self.db.task_orders.find_one({"id": data.task_order_id})
        if not task_order:
            raise HTTPException(status_code=404, detail="Task order not found")
        
        # Validate hours_spent is positive
        if data.hours_spent <= 0:
            raise HTTPException(status_code=400, detail="Hours spent must be greater than 0")
    
    async def validate_update_data(self, activity_id: str, update_data: Dict[str, Any]) -> None:
        """Validate activity update data."""
        # Verify task order exists if being updated
        if "task_order_id" in update_data:
            task_order = await self.db.task_orders.find_one({"id": update_data["task_order_id"]})
            if not task_order:
                raise HTTPException(status_code=404, detail="Task order not found")
        
        # Validate hours_spent is positive if being updated
        if "hours_spent" in update_data and update_data["hours_spent"] <= 0:
            raise HTTPException(status_code=400, detail="Hours spent must be greater than 0")
    
    async def create_activity(self, activity_data, created_by: str) -> Dict[str, Any]:
        """Create a new activity."""
        await self.validate_create_data(activity_data)
        return await self.create(activity_data, created_by)
    
    async def update_activity(self, activity_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an activity."""
        await self.validate_update_data(activity_id, update_data)
        return await self.update(activity_id, update_data)
    
    async def get_activities_by_task(self, task_order_id: str, offset: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get activities for a specific task order."""
        activities = await self.collection.find({"task_order_id": task_order_id}).sort("activity_date", -1).skip(offset).limit(limit).to_list(length=None)
        
        # Remove MongoDB's _id from results
        for activity in activities:
            activity.pop("_id", None)
        
        return activities
    
    async def get_activity_stats(self, task_order_id: Optional[str] = None) -> Dict[str, Any]:
        """Get activity statistics."""
        try:
            match_stage = {}
            if task_order_id:
                match_stage["task_order_id"] = task_order_id
            
            pipeline = []
            if match_stage:
                pipeline.append({"$match": match_stage})
            
            pipeline.append({
                "$group": {
                    "_id": None,
                    "total_activities": {"$sum": 1},
                    "total_hours": {"$sum": "$hours_spent"},
                    "average_hours": {"$avg": "$hours_spent"}
                }
            })
            
            result = await self.collection.aggregate(pipeline).to_list(1)
            
            if result:
                stats = result[0]
                # Round average hours to 2 decimal places
                if stats.get("average_hours"):
                    stats["average_hours"] = round(stats["average_hours"], 2)
                return stats
            else:
                return {
                    "total_activities": 0,
                    "total_hours": 0,
                    "average_hours": 0
                }
        except Exception as e:
            logger.error(f"Error getting activity stats: {str(e)}")
            return {
                "total_activities": 0,
                "total_hours": 0,
                "average_hours": 0
            }