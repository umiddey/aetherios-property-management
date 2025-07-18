from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging
import socketio

from services.task_service import TaskService
from models.task import TaskOrder, TaskOrderCreate, TaskOrderUpdate, TaskOrderResponse, TaskStatus, Priority
from utils.auth import get_current_user
from utils.dependencies import get_database

logger = logging.getLogger(__name__)

router = APIRouter()

# Socket.io instance - will be injected from main app
sio = None

def set_socketio_instance(socketio_instance):
    """Set the Socket.io instance for real-time notifications."""
    global sio
    sio = socketio_instance

# Task Order routes
@router.post("/tasks/", response_model=TaskOrderResponse)
async def create_task_order(
    task_data: TaskOrderCreate,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new task order."""
    try:
        task_service = TaskService(db)
        task = await task_service.create_task(task_data, current_user.id)
        
        # Emit real-time notification
        if sio:
            try:
                await sio.emit('new_task', task)
            except Exception as e:
                logger.warning(f"Failed to emit socket.io event: {str(e)}")
        
        return TaskOrderResponse(**task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating task order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create task order")

@router.get("/tasks/", response_model=List[TaskOrderResponse])
async def get_task_orders(
    status: Optional[TaskStatus] = None,
    priority: Optional[Priority] = None,
    customer_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get task orders with filters."""
    try:
        # Build query filter
        query = {}
        if status:
            query["status"] = status.value
        if priority:
            query["priority"] = priority.value
        if customer_id:
            query["customer_id"] = customer_id
        if assigned_to:
            query["assigned_to"] = assigned_to
        
        # Query database directly
        tasks = await db.task_orders.find(query).sort("created_at", -1).skip(offset).limit(limit).to_list(length=None)
        
        # Remove MongoDB's _id from results and ensure consistency
        for task in tasks:
            task.pop("_id", None)
            # Ensure all required fields exist
            if "status" not in task:
                task["status"] = "pending"
            if "updated_at" not in task:
                task["updated_at"] = task.get("created_at", datetime.utcnow())
            if "is_archived" not in task:
                task["is_archived"] = False
            if "is_active" not in task:
                task["is_active"] = True
        
        return [TaskOrderResponse(**task) for task in tasks]
    except Exception as e:
        logger.error(f"Error fetching task orders: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch task orders")

@router.get("/tasks/{task_order_id}", response_model=TaskOrderResponse)
async def get_task_order(
    task_order_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific task order by ID."""
    try:
        task_service = TaskService(db)
        task = await task_service.get_by_id(task_order_id)
        
        if not task:
            raise HTTPException(status_code=404, detail="Task order not found")
        
        return TaskOrderResponse(**task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching task order {task_order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch task order")

@router.put("/tasks/{task_order_id}", response_model=TaskOrderResponse)
async def update_task_order(
    task_order_id: str,
    task_data: TaskOrderUpdate,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update a task order."""
    try:
        task_service = TaskService(db)
        
        # Convert to dict and remove None values
        update_data = {k: v for k, v in task_data.model_dump().items() if v is not None}
        
        task = await task_service.update_task(task_order_id, update_data)
        
        if not task:
            raise HTTPException(status_code=404, detail="Task order not found")
        
        return TaskOrderResponse(**task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task order {task_order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update task order")

@router.delete("/tasks/{task_order_id}")
async def delete_task_order(
    task_order_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a task order."""
    try:
        task_service = TaskService(db)
        success = await task_service.delete(task_order_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Task order not found")
        
        return {"message": "Task order deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task order {task_order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete task order")

@router.get("/tasks/stats/summary")
async def get_task_stats(
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get task statistics."""
    try:
        task_service = TaskService(db)
        stats = await task_service.get_task_stats()
        return stats
    except Exception as e:
        logger.error(f"Error fetching task stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch task statistics")