from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from datetime import datetime, timezone
import logging
import uuid

from services.base_service import BaseService

logger = logging.getLogger(__name__)


class AnalyticsService(BaseService):
    """Service for managing analytics operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "analytics_logs")
    
    def setup_indexes(self):
        """Setup indexes for analytics_logs collection."""
        try:
            # Performance indexes
            self.db.analytics_logs.create_index("timestamp", background=True)
            self.db.analytics_logs.create_index("user_id", background=True)
            self.db.analytics_logs.create_index("action", background=True)
            # Compound indexes for common queries
            self.db.analytics_logs.create_index([("user_id", 1), ("timestamp", -1)], background=True)
            self.db.analytics_logs.create_index([("action", 1), ("timestamp", -1)], background=True)
            logger.info("Analytics service indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create analytics indexes: {str(e)}")
    
    async def validate_create_data(self, data) -> None:
        """Validate analytics log creation data."""
        # Basic validation - action should not be empty
        if not data.action or data.action.strip() == "":
            raise HTTPException(status_code=400, detail="Action cannot be empty")
        
        # Validate details is a dictionary
        if not isinstance(data.details, dict):
            raise HTTPException(status_code=400, detail="Details must be a dictionary")
    
    async def validate_update_data(self, log_id: str, update_data: Dict[str, Any]) -> None:
        """Validate analytics log update data."""
        # Basic validation
        if "action" in update_data and (not update_data["action"] or update_data["action"].strip() == ""):
            raise HTTPException(status_code=400, detail="Action cannot be empty")
        
        # Validate details is a dictionary
        if "details" in update_data and not isinstance(update_data["details"], dict):
            raise HTTPException(status_code=400, detail="Details must be a dictionary")
    
    async def log_action(self, log_data, user_id: str, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Dict[str, Any]:
        """Log an analytics action."""
        await self.validate_create_data(log_data)
        
        # Create full log entry
        log_dict = log_data.model_dump()
        log_dict["user_id"] = user_id
        log_dict["ip_address"] = ip_address
        log_dict["user_agent"] = user_agent
        log_dict["timestamp"] = datetime.now(timezone.utc)
        log_dict["id"] = str(uuid.uuid4())
        
        # Insert directly since we have custom fields
        await self.collection.insert_one(log_dict)
        
        # Remove MongoDB's _id before returning
        log_dict.pop("_id", None)
        
        return log_dict
    
    async def get_logs_by_user(self, user_id: str, offset: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get analytics logs for a specific user."""
        logs = await self.collection.find({"user_id": user_id}).sort("timestamp", -1).skip(offset).limit(limit).to_list(length=None)
        
        # Remove MongoDB's _id from results
        for log in logs:
            log.pop("_id", None)
        
        return logs
    
    async def get_logs_by_action(self, action: str, offset: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get analytics logs for a specific action."""
        logs = await self.collection.find({"action": action}).sort("timestamp", -1).skip(offset).limit(limit).to_list(length=None)
        
        # Remove MongoDB's _id from results
        for log in logs:
            log.pop("_id", None)
        
        return logs
    
    async def get_analytics_stats(self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Get analytics statistics."""
        try:
            match_stage = {}
            if start_date or end_date:
                timestamp_filter = {}
                if start_date:
                    timestamp_filter["$gte"] = start_date
                if end_date:
                    timestamp_filter["$lte"] = end_date
                match_stage["timestamp"] = timestamp_filter
            
            pipeline = []
            if match_stage:
                pipeline.append({"$match": match_stage})
            
            pipeline.extend([
                {
                    "$group": {
                        "_id": None,
                        "total_logs": {"$sum": 1},
                        "unique_users": {"$addToSet": "$user_id"},
                        "actions": {"$addToSet": "$action"}
                    }
                },
                {
                    "$project": {
                        "total_logs": 1,
                        "unique_users_count": {"$size": "$unique_users"},
                        "unique_actions_count": {"$size": "$actions"}
                    }
                }
            ])
            
            result = await self.collection.aggregate(pipeline).to_list(1)
            
            if result:
                return result[0]
            else:
                return {
                    "total_logs": 0,
                    "unique_users_count": 0,
                    "unique_actions_count": 0
                }
        except Exception as e:
            logger.error(f"Error getting analytics stats: {str(e)}")
            return {
                "total_logs": 0,
                "unique_users_count": 0,
                "unique_actions_count": 0
            }
    
    async def get_popular_actions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most popular actions."""
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": "$action",
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$sort": {"count": -1}
                },
                {
                    "$limit": limit
                },
                {
                    "$project": {
                        "action": "$_id",
                        "count": 1,
                        "_id": 0
                    }
                }
            ]
            
            result = await self.collection.aggregate(pipeline).to_list(length=None)
            return result
        except Exception as e:
            logger.error(f"Error getting popular actions: {str(e)}")
            return []