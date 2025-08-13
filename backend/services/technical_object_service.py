from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from bson import ObjectId
from datetime import datetime, timezone
import logging

from services.base_service import BaseService
from models.technical_object import (
    TechnicalObject, 
    TechnicalObjectCreate, 
    TechnicalObjectUpdate,
    TechnicalObjectType,
    TechnicalObjectStatus
)

logger = logging.getLogger(__name__)


class TechnicalObjectService(BaseService):
    """Service for managing technical objects operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "technical_objects")
    
    async def create_technical_object(self, object_data: TechnicalObjectCreate, property_id: str, created_by: str) -> Dict[str, Any]:
        """
        Create a new technical object and update property relationship.
        
        Args:
            object_data: Technical object creation data
            property_id: ID of the property this object belongs to
            created_by: User ID who created the object
            
        Returns:
            Created technical object document
        """
        try:
            # Validate property exists
            property_doc = await self.db.properties.find_one({"_id": ObjectId(property_id)})
            if not property_doc:
                raise HTTPException(status_code=404, detail="Property not found")
            
            # Prepare technical object document
            object_dict = object_data.dict()
            object_dict["property_id"] = property_id
            object_dict["created_date"] = datetime.now(timezone.utc)
            object_dict["created_by"] = created_by
            object_dict["last_modified"] = datetime.now(timezone.utc)
            object_dict["modified_by"] = created_by
            object_dict["is_active"] = True
            
            # Generate unique ID
            object_dict["id"] = str(ObjectId())
            
            # Insert technical object
            result = await self.collection.insert_one(object_dict)
            created_object_id = str(result.inserted_id)
            
            # Update property to add technical object reference
            await self.db.properties.update_one(
                {"_id": ObjectId(property_id)},
                {"$addToSet": {"technical_object_ids": created_object_id}}
            )
            
            # Return created object
            created_object = await self.collection.find_one({"_id": result.inserted_id})
            created_object["_id"] = str(created_object["_id"])
            created_object["property_id"] = str(created_object["property_id"])
            
            logger.info(f"Technical object created: {created_object_id} for property {property_id}")
            return created_object
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating technical object: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create technical object: {str(e)}")
    
    async def get_technical_objects_by_property(
        self, 
        property_id: str, 
        object_type: Optional[TechnicalObjectType] = None,
        status: Optional[TechnicalObjectStatus] = None,
        include_inactive: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all technical objects for a specific property.
        
        Args:
            property_id: Property ID to filter by
            object_type: Optional object type filter
            status: Optional status filter
            include_inactive: Whether to include inactive objects
            
        Returns:
            List of technical objects
        """
        try:
            # Validate property exists
            property_doc = await self.db.properties.find_one({"_id": ObjectId(property_id)})
            if not property_doc:
                raise HTTPException(status_code=404, detail="Property not found")
            
            # Build query
            query = {"property_id": property_id}
            
            if not include_inactive:
                query["is_active"] = True
            
            if object_type:
                query["object_type"] = object_type
                
            if status:
                query["status"] = status
            
            # Get technical objects
            objects_cursor = self.collection.find(query).sort("created_date", -1)
            objects = []
            
            async for obj in objects_cursor:
                obj["_id"] = str(obj["_id"])
                obj["property_id"] = str(obj["property_id"])
                objects.append(obj)
            
            logger.info(f"Retrieved {len(objects)} technical objects for property {property_id}")
            return objects
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving technical objects for property {property_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve technical objects: {str(e)}")
    
    async def get_technical_object_by_id(self, object_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific technical object by ID.
        
        Args:
            object_id: Technical object ID
            
        Returns:
            Technical object document or None
        """
        try:
            obj = await self.collection.find_one({"_id": ObjectId(object_id)})
            if obj:
                obj["_id"] = str(obj["_id"])
                obj["property_id"] = str(obj["property_id"])
            return obj
            
        except Exception as e:
            logger.error(f"Error retrieving technical object {object_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve technical object: {str(e)}")
    
    async def update_technical_object(
        self, 
        object_id: str, 
        update_data: TechnicalObjectUpdate, 
        modified_by: str
    ) -> Dict[str, Any]:
        """
        Update a technical object.
        
        Args:
            object_id: Technical object ID
            update_data: Update data
            modified_by: User ID who modified the object
            
        Returns:
            Updated technical object document
        """
        try:
            # Check if object exists
            existing_obj = await self.collection.find_one({"_id": ObjectId(object_id)})
            if not existing_obj:
                raise HTTPException(status_code=404, detail="Technical object not found")
            
            # Prepare update document
            update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
            update_dict["last_modified"] = datetime.now(timezone.utc)
            update_dict["modified_by"] = modified_by
            
            # Update in database
            result = await self.collection.update_one(
                {"_id": ObjectId(object_id)},
                {"$set": update_dict}
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Technical object not found")
            
            # Return updated object
            updated_obj = await self.collection.find_one({"_id": ObjectId(object_id)})
            updated_obj["_id"] = str(updated_obj["_id"])
            updated_obj["property_id"] = str(updated_obj["property_id"])
            
            logger.info(f"Technical object updated: {object_id}")
            return updated_obj
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating technical object {object_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to update technical object: {str(e)}")
    
    async def delete_technical_object(self, object_id: str, deleted_by: str) -> Dict[str, str]:
        """
        Soft delete a technical object and remove from property references.
        
        Args:
            object_id: Technical object ID
            deleted_by: User ID who deleted the object
            
        Returns:
            Success message
        """
        try:
            # Check if object exists
            existing_obj = await self.collection.find_one({"_id": ObjectId(object_id)})
            if not existing_obj:
                raise HTTPException(status_code=404, detail="Technical object not found")
            
            # Soft delete (set is_active = False)
            await self.collection.update_one(
                {"_id": ObjectId(object_id)},
                {"$set": {
                    "is_active": False, 
                    "deleted_date": datetime.now(timezone.utc),
                    "deleted_by": deleted_by,
                    "last_modified": datetime.now(timezone.utc),
                    "modified_by": deleted_by
                }}
            )
            
            # Remove from property's technical_object_ids array
            property_id = existing_obj["property_id"]
            await self.db.properties.update_one(
                {"_id": ObjectId(property_id)},
                {"$pull": {"technical_object_ids": object_id}}
            )
            
            logger.info(f"Technical object soft deleted: {object_id}")
            return {"message": "Technical object deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting technical object {object_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to delete technical object: {str(e)}")
    
    async def get_heating_systems_by_property(self, property_id: str) -> List[Dict[str, Any]]:
        """
        Get all heating systems for a property (convenience method).
        
        Args:
            property_id: Property ID
            
        Returns:
            List of heating system objects
        """
        return await self.get_technical_objects_by_property(
            property_id=property_id,
            object_type=TechnicalObjectType.HEATING_SYSTEM
        )
    
    async def get_objects_needing_maintenance(self, property_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get technical objects that need maintenance.
        
        Args:
            property_id: Optional property ID filter
            
        Returns:
            List of objects needing maintenance
        """
        try:
            query = {
                "is_active": True,
                "$or": [
                    {"status": TechnicalObjectStatus.MAINTENANCE},
                    {"next_maintenance_date": {"$lte": datetime.now(timezone.utc)}}
                ]
            }
            
            if property_id:
                query["property_id"] = property_id
            
            objects_cursor = self.collection.find(query).sort("next_maintenance_date", 1)
            objects = []
            
            async for obj in objects_cursor:
                obj["_id"] = str(obj["_id"])
                obj["property_id"] = str(obj["property_id"])
                objects.append(obj)
            
            return objects
            
        except Exception as e:
            logger.error(f"Error retrieving objects needing maintenance: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to retrieve maintenance objects")
    
    async def get_property_technical_summary(self, property_id: str) -> Dict[str, Any]:
        """
        Get a summary of all technical objects for a property.
        
        Args:
            property_id: Property ID
            
        Returns:
            Summary statistics and object counts
        """
        try:
            objects = await self.get_technical_objects_by_property(property_id)
            
            summary = {
                "total_objects": len(objects),
                "by_type": {},
                "by_status": {},
                "maintenance_due": 0,
                "warranty_expiring": 0
            }
            
            current_date = datetime.now(timezone.utc)
            
            for obj in objects:
                # Count by type
                obj_type = obj.get("object_type", "unknown")
                summary["by_type"][obj_type] = summary["by_type"].get(obj_type, 0) + 1
                
                # Count by status
                status = obj.get("status", "unknown")
                summary["by_status"][status] = summary["by_status"].get(status, 0) + 1
                
                # Check maintenance due
                next_maintenance = obj.get("next_maintenance_date")
                if next_maintenance and isinstance(next_maintenance, datetime) and next_maintenance <= current_date:
                    summary["maintenance_due"] += 1
                
                # Check warranty expiring (next 3 months)
                warranty_expiry = obj.get("warranty_expiry")
                if warranty_expiry and isinstance(warranty_expiry, datetime):
                    days_until_expiry = (warranty_expiry - current_date).days
                    if 0 <= days_until_expiry <= 90:  # 3 months
                        summary["warranty_expiring"] += 1
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating technical summary for property {property_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to generate technical summary")


# Database indexes for performance
async def create_technical_objects_indexes(db: AsyncIOMotorDatabase):
    """Create database indexes for technical_objects collection."""
    try:
        collection = db.technical_objects
        
        # Index on property_id (most common query)
        await collection.create_index("property_id")
        
        # Compound index on property_id and object_type
        await collection.create_index([("property_id", 1), ("object_type", 1)])
        
        # Index on is_active for filtering
        await collection.create_index("is_active")
        
        # Index on status for filtering
        await collection.create_index("status")
        
        # Index on next_maintenance_date for maintenance queries
        await collection.create_index("next_maintenance_date")
        
        # Index on warranty_expiry for warranty tracking
        await collection.create_index("warranty_expiry")
        
        # Index on created_date for sorting
        await collection.create_index([("created_date", -1)])
        
        logger.info("Technical objects database indexes created successfully")
        
    except Exception as e:
        logger.error(f"Error creating technical objects indexes: {str(e)}")
        raise