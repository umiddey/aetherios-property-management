from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Optional, Union
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
from datetime import datetime, timezone
from bson import ObjectId

from models.technical_object import (
    TechnicalObject, 
    TechnicalObjectCreate, 
    TechnicalObjectUpdate,
    TechnicalObjectType
)
from models.heating_system import HeatingSystemCreate
from services.technical_object_validation import TechnicalObjectValidationService, Jurisdiction
from utils.auth import get_current_user
from utils.dependencies import get_database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/technical-objects", tags=["technical-objects"])

# Initialize validation service
validation_service = TechnicalObjectValidationService()

def get_validation_service():
    """Dependency to get technical object validation service"""
    return validation_service


@router.post("/")
async def create_technical_object(
    request: Request,
    current_user = Depends(get_current_user),
    validator: TechnicalObjectValidationService = Depends(get_validation_service),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new technical object with German legal compliance validation."""
    try:
        # Parse request data and determine correct model
        request_data = await request.json()
        object_type = request_data.get("object_type")
        
        # Use specific model based on object type
        if object_type == "heating_system":
            object_data = HeatingSystemCreate(**request_data)
        else:
            object_data = TechnicalObjectCreate(**request_data)
        
        # Validate property exists
        property_doc = await db.properties.find_one({"id": object_data.property_id, "is_archived": False})
        if not property_doc:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # German legal compliance validation
        jurisdiction = Jurisdiction.GERMANY  # Default to Germany for now
        
        # Validate technical object based on type
        if object_data.object_type == TechnicalObjectType.HEATING_SYSTEM:
            # Validate heating system compliance (BetrKV)
            validation_result = validator.validate_heating_system(
                jurisdiction,
                object_data.heating_type,
                object_data.heating_distribution_key,
                getattr(object_data, 'cost_per_sqm', None)  # This field might not exist in HeatingSystemCreate
            )
            if not validation_result.is_valid:
                raise HTTPException(status_code=400, detail=f"Heating system validation failed: {validation_result.message}")
        
        # Create technical object document
        object_dict = object_data.dict()
        object_dict["created_date"] = datetime.now(timezone.utc)
        object_dict["created_by"] = current_user.username  # Auto-populate from JWT token
        object_dict["is_active"] = True
        
        # Insert into technical_objects collection
        result = await db.technical_objects.insert_one(object_dict)
        created_object_id = str(result.inserted_id)
        
        # Update property to add technical object reference
        await db.properties.update_one(
            {"id": object_data.property_id, "is_archived": False},
            {"$addToSet": {"technical_object_ids": created_object_id}}
        )
        
        # Return created object
        created_object = await db.technical_objects.find_one({"_id": result.inserted_id})
        created_object["_id"] = str(created_object["_id"])
        created_object["property_id"] = str(created_object["property_id"])
        
        logger.info(f"Technical object created: {created_object_id} for property {object_data.property_id}")
        return created_object
        
    except Exception as e:
        logger.error(f"Error creating technical object: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create technical object: {str(e)}")


@router.get("/property/{property_id}")
async def get_technical_objects_by_property(
    property_id: str,
    object_type: Optional[TechnicalObjectType] = Query(None, description="Filter by object type"),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all technical objects for a specific property."""
    try:
        # Validate property exists
        property_doc = await db.properties.find_one({"id": property_id, "is_archived": False})
        if not property_doc:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Build query
        query = {
            "property_id": property_id,
            "is_active": True
        }
        
        if object_type:
            query["object_type"] = object_type
        
        # Get technical objects
        objects_cursor = db.technical_objects.find(query)
        objects = []
        
        async for obj in objects_cursor:
            obj["_id"] = str(obj["_id"])
            obj["property_id"] = str(obj["property_id"])
            objects.append(obj)
        
        logger.info(f"Retrieved {len(objects)} technical objects for property {property_id}")
        return objects
        
    except Exception as e:
        logger.error(f"Error retrieving technical objects for property {property_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve technical objects: {str(e)}")


@router.get("/{object_id}")
async def get_technical_object(
    object_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific technical object by ID."""
    try:
        # Get technical object
        obj = await db.technical_objects.find_one({"_id": ObjectId(object_id)})
        if not obj:
            raise HTTPException(status_code=404, detail="Technical object not found")
        
        # Convert ObjectIds to strings
        obj["_id"] = str(obj["_id"])
        obj["property_id"] = str(obj["property_id"])
        
        return obj
        
    except Exception as e:
        logger.error(f"Error retrieving technical object {object_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve technical object: {str(e)}")


@router.put("/{object_id}")
async def update_technical_object(
    object_id: str,
    update_data: TechnicalObjectUpdate,
    current_user = Depends(get_current_user),
    validator: TechnicalObjectValidationService = Depends(get_validation_service),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update a technical object with validation."""
    try:
        # Check if object exists
        existing_obj = await db.technical_objects.find_one({"_id": ObjectId(object_id)})
        if not existing_obj:
            raise HTTPException(status_code=404, detail="Technical object not found")
        
        # Validate updates if they affect critical fields
        if update_data.object_type == TechnicalObjectType.HEATING_SYSTEM:
            # Re-validate heating system if relevant fields changed
            jurisdiction = Jurisdiction.GERMANY
            validation_result = validator.validate_heating_system(
                jurisdiction,
                update_data.heating_type or existing_obj.get("heating_type"),
                getattr(update_data, 'heating_distribution_key', None) or existing_obj.get("heating_distribution_key"),
                getattr(update_data, 'cost_per_sqm', None) or existing_obj.get("cost_per_sqm")
            )
            if not validation_result.is_valid:
                raise HTTPException(status_code=400, detail=f"Heating system validation failed: {validation_result.message}")
        
        # Prepare update document
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updated_date"] = datetime.now(timezone.utc)
        
        # Update in database
        result = await db.technical_objects.update_one(
            {"_id": ObjectId(object_id)},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Technical object not found")
        
        # Return updated object
        updated_obj = await db.technical_objects.find_one({"_id": ObjectId(object_id)})
        updated_obj["_id"] = str(updated_obj["_id"])
        updated_obj["property_id"] = str(updated_obj["property_id"])
        
        logger.info(f"Technical object updated: {object_id}")
        return updated_obj
        
    except Exception as e:
        logger.error(f"Error updating technical object {object_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update technical object: {str(e)}")


@router.delete("/{object_id}")
async def delete_technical_object(
    object_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Soft delete a technical object and remove from property references."""
    try:
        # Check if object exists
        existing_obj = await db.technical_objects.find_one({"_id": ObjectId(object_id)})
        if not existing_obj:
            raise HTTPException(status_code=404, detail="Technical object not found")
        
        # Soft delete (set is_active = False)
        await db.technical_objects.update_one(
            {"_id": ObjectId(object_id)},
            {"$set": {"is_active": False, "deleted_date": datetime.now(timezone.utc)}}
        )
        
        # Remove from property's technical_object_ids array
        property_id = existing_obj["property_id"]
        await db.properties.update_one(
            {"id": property_id, "is_archived": False},
            {"$pull": {"technical_object_ids": object_id}}
        )
        
        logger.info(f"Technical object soft deleted: {object_id}")
        return {"message": "Technical object deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting technical object {object_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete technical object: {str(e)}")