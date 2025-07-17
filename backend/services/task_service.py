from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from datetime import datetime
import logging
import uuid

from services.base_service import BaseService

logger = logging.getLogger(__name__)


class TaskService(BaseService):
    """Service for managing task operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "task_orders")
    
    def setup_indexes(self):
        """Setup indexes for task_orders collection."""
        try:
            # Performance indexes
            self.db.task_orders.create_index("created_at", background=True)
            self.db.task_orders.create_index("created_by", background=True)
            self.db.task_orders.create_index("customer_id", background=True)
            self.db.task_orders.create_index("assigned_to", background=True)
            self.db.task_orders.create_index("status", background=True)
            self.db.task_orders.create_index("priority", background=True)
            self.db.task_orders.create_index("due_date", background=True)
            # Compound indexes for common queries
            self.db.task_orders.create_index([("status", 1), ("priority", 1)], background=True)
            self.db.task_orders.create_index([("assigned_to", 1), ("status", 1)], background=True)
            logger.info("Task service indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create task indexes: {str(e)}")
    
    async def validate_create_data(self, data) -> None:
        """Validate task creation data."""
        try:
            # Verify customer exists
            customer = await self.db.customers.find_one({"id": data.customer_id})
            if not customer:
                raise HTTPException(status_code=404, detail="Customer not found")
            
            # Verify property exists if provided
            if hasattr(data, 'property_id') and data.property_id:
                property = await self.db.properties.find_one({"id": data.property_id})
                if not property:
                    raise HTTPException(status_code=404, detail="Property not found")
            
            # Verify assigned user exists if provided
            if hasattr(data, 'assigned_to') and data.assigned_to:
                user = await self.db.users.find_one({"id": data.assigned_to})
                if not user:
                    raise HTTPException(status_code=404, detail="Assigned user not found")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error validating task creation data: {str(e)}")
            raise HTTPException(status_code=500, detail="Validation failed")
    
    async def validate_update_data(self, task_id: str, update_data: Dict[str, Any]) -> None:
        """Validate task update data."""
        # Verify customer exists if being updated
        if "customer_id" in update_data:
            customer = await self.db.customers.find_one({"id": update_data["customer_id"]})
            if not customer:
                raise HTTPException(status_code=404, detail="Customer not found")
        
        # Verify property exists if being updated
        if "property_id" in update_data and update_data["property_id"]:
            property = await self.db.properties.find_one({"id": update_data["property_id"]})
            if not property:
                raise HTTPException(status_code=404, detail="Property not found")
        
        # Verify assigned user exists if being updated
        if "assigned_to" in update_data and update_data["assigned_to"]:
            user = await self.db.users.find_one({"id": update_data["assigned_to"]})
            if not user:
                raise HTTPException(status_code=404, detail="Assigned user not found")
    
    async def create_task(self, task_data, created_by: str) -> Dict[str, Any]:
        """Create a new task."""
        try:
            await self.validate_create_data(task_data)
            
            # Convert to dict manually to avoid model_dump issues
            task_dict = {
                "id": str(uuid.uuid4()),
                "subject": task_data.subject,
                "description": task_data.description,
                "customer_id": task_data.customer_id,
                "priority": task_data.priority.value if hasattr(task_data.priority, 'value') else task_data.priority,
                "status": "pending",
                "budget": getattr(task_data, 'budget', None),
                "due_date": getattr(task_data, 'due_date', None),
                "property_id": getattr(task_data, 'property_id', None),
                "assigned_to": getattr(task_data, 'assigned_to', None),
                "created_by": created_by,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_archived": False,
                "is_active": True
            }
            
            await self.collection.insert_one(task_dict)
            
            # Remove MongoDB's _id before returning
            task_dict.pop("_id", None)
            
            logger.info(f"Created task with id: {task_dict['id']}")
            return task_dict
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating task: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create task")
    
    async def update_task(self, task_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a task."""
        await self.validate_update_data(task_id, update_data)
        
        # Add updated_at timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        return await self.update(task_id, update_data)
    
    async def get_tasks_by_filters(self, 
                                  status: Optional[str] = None,
                                  priority: Optional[str] = None,
                                  customer_id: Optional[str] = None,
                                  assigned_to: Optional[str] = None,
                                  offset: int = 0,
                                  limit: int = 100) -> List[Dict[str, Any]]:
        """Get tasks with filters."""
        try:
            query = {}
            
            if status:
                query["status"] = status
            if priority:
                query["priority"] = priority
            if customer_id:
                query["customer_id"] = customer_id
            if assigned_to:
                query["assigned_to"] = assigned_to
            
            tasks = await self.collection.find(query).sort("created_at", -1).skip(offset).limit(limit).to_list(length=None)
            
            # Remove MongoDB's _id from results
            for task in tasks:
                task.pop("_id", None)
            
            return tasks
        except Exception as e:
            logger.error(f"Error fetching tasks by filters: {str(e)}")
            raise
    
    async def get_task_stats(self) -> Dict[str, Any]:
        """Get task statistics."""
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "total_tasks": {"$sum": 1},
                        "pending_tasks": {
                            "$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}
                        },
                        "in_progress_tasks": {
                            "$sum": {"$cond": [{"$eq": ["$status", "in_progress"]}, 1, 0]}
                        },
                        "completed_tasks": {
                            "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                        },
                        "high_priority_tasks": {
                            "$sum": {"$cond": [{"$eq": ["$priority", "high"]}, 1, 0]}
                        }
                    }
                }
            ]
            
            result = await self.collection.aggregate(pipeline).to_list(1)
            
            if result:
                return result[0]
            else:
                return {
                    "total_tasks": 0,
                    "pending_tasks": 0,
                    "in_progress_tasks": 0,
                    "completed_tasks": 0,
                    "high_priority_tasks": 0
                }
        except Exception as e:
            logger.error(f"Error getting task stats: {str(e)}")
            return {
                "total_tasks": 0,
                "pending_tasks": 0,
                "in_progress_tasks": 0,
                "completed_tasks": 0,
                "high_priority_tasks": 0
            }