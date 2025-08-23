"""
Technical Object Repository

Handles database operations for technical objects with German compliance tracking.

Created: 2025-08-22
"""

from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from repositories.base_repository import BaseRepository
from models.technical_object import TechnicalObject, TechnicalObjectType
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class TechnicalObjectRepository(BaseRepository):
    """Repository for technical object database operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase = None):
        # Initialize with technical_objects collection
        super().__init__(db, "technical_objects")
    
    async def get_by_id(self, technical_object_id: str) -> Optional[TechnicalObject]:
        """Get technical object by ID."""
        try:
            from bson import ObjectId
            doc = await self.find_one({"_id": ObjectId(technical_object_id), "is_active": True})
            if doc:
                # Convert MongoDB _id to id field for Pydantic model
                doc["id"] = str(doc["_id"])
                return TechnicalObject(**doc)
            return None
        except Exception as e:
            logger.error(f"Error getting technical object {technical_object_id}: {str(e)}")
            raise
    
    async def get_by_property_id(self, property_id: str) -> List[TechnicalObject]:
        """Get all technical objects for a property."""
        try:
            cursor = self.collection.find({
                "property_id": property_id,
                "is_active": True
            })
            docs = await cursor.to_list(None)
            # Convert MongoDB _id to id field for Pydantic model
            for doc in docs:
                doc["id"] = str(doc["_id"])
            return [TechnicalObject(**doc) for doc in docs]
        except Exception as e:
            logger.error(f"Error getting technical objects for property {property_id}: {str(e)}")
            raise
    
    async def get_all(self) -> List[TechnicalObject]:
        """Get all active technical objects."""
        try:
            cursor = self.collection.find({"is_active": True})
            docs = await cursor.to_list(None)
            # Convert MongoDB _id to id field for Pydantic model
            for doc in docs:
                doc["id"] = str(doc["_id"])
            return [TechnicalObject(**doc) for doc in docs]
        except Exception as e:
            logger.error(f"Error getting all technical objects: {str(e)}")
            raise
    
    async def get_by_object_type(self, object_type: TechnicalObjectType) -> List[TechnicalObject]:
        """Get technical objects by type."""
        try:
            cursor = self.collection.find({
                "object_type": object_type.value,
                "is_active": True
            })
            docs = await cursor.to_list(None)
            # Convert MongoDB _id to id field for Pydantic model
            for doc in docs:
                doc["id"] = str(doc["_id"])
            return [TechnicalObject(**doc) for doc in docs]
        except Exception as e:
            logger.error(f"Error getting technical objects by type {object_type}: {str(e)}")
            raise
    
    async def get_with_overdue_inspections(self) -> List[TechnicalObject]:
        """Get technical objects with overdue inspections."""
        try:
            now = datetime.now(timezone.utc)
            cursor = self.collection.find({
                "is_active": True,
                "next_inspection_due": {"$lt": now}
            })
            docs = await cursor.to_list(None)
            # Convert MongoDB _id to id field for Pydantic model
            for doc in docs:
                doc["id"] = str(doc["_id"])
            return [TechnicalObject(**doc) for doc in docs]
        except Exception as e:
            logger.error(f"Error getting overdue technical objects: {str(e)}")
            raise
    
    async def get_inspections_due_in_range(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[TechnicalObject]:
        """Get technical objects with inspections due in date range."""
        try:
            cursor = self.collection.find({
                "is_active": True,
                "next_inspection_due": {
                    "$gte": start_date,
                    "$lt": end_date
                }
            })
            docs = await cursor.to_list(None)
            # Convert MongoDB _id to id field for Pydantic model
            for doc in docs:
                doc["id"] = str(doc["_id"])
            return [TechnicalObject(**doc) for doc in docs]
        except Exception as e:
            logger.error(f"Error getting technical objects with inspections in range: {str(e)}")
            raise
    
    async def create(self, technical_object_data: Dict[str, Any]) -> TechnicalObject:
        """Create a new technical object."""
        try:
            # Add audit fields
            now = datetime.now(timezone.utc)
            technical_object_data.update({
                "created_date": now,
                "last_modified": now,
                "is_active": True
            })
            
            doc = await self.insert_one(technical_object_data)
            return TechnicalObject(**doc)
        except Exception as e:
            logger.error(f"Error creating technical object: {str(e)}")
            raise
    
    async def update(self, technical_object_id: str, update_data: Dict[str, Any]) -> Optional[TechnicalObject]:
        """Update technical object."""
        try:
            # Add last modified timestamp
            update_data["last_modified"] = datetime.now(timezone.utc)
            
            result = await self.collection.update_one(
                {"id": technical_object_id, "is_active": True},
                {"$set": update_data}
            )
            
            if result.matched_count > 0:
                return await self.get_by_id(technical_object_id)
            return None
        except Exception as e:
            logger.error(f"Error updating technical object {technical_object_id}: {str(e)}")
            raise
    
    async def delete(self, technical_object_id: str) -> bool:
        """Soft delete technical object."""
        try:
            result = await self.collection.update_one(
                {"id": technical_object_id, "is_active": True},
                {
                    "$set": {
                        "is_active": False,
                        "last_modified": datetime.now(timezone.utc)
                    }
                }
            )
            return result.matched_count > 0
        except Exception as e:
            logger.error(f"Error deleting technical object {technical_object_id}: {str(e)}")
            raise
    
    async def get_count_by_property(self, property_id: str) -> int:
        """Get count of technical objects for a property."""
        try:
            return await self.collection.count_documents({
                "property_id": property_id,
                "is_active": True
            })
        except Exception as e:
            logger.error(f"Error getting count for property {property_id}: {str(e)}")
            raise
    
    async def get_statistics(self) -> Dict[str, int]:
        """Get technical object statistics."""
        try:
            total_count = await self.collection.count_documents({"is_active": True})
            overdue_count = await self.collection.count_documents({
                "is_active": True,
                "next_inspection_due": {"$lt": datetime.now(timezone.utc)}
            })
            
            return {
                "total_objects": total_count,
                "overdue_inspections": overdue_count
            }
        except Exception as e:
            logger.error(f"Error getting statistics: {str(e)}")
            raise