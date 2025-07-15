from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from bson import ObjectId
import logging

from services.base_service import BaseService
from models.property import Property, PropertyCreate, PropertyUpdate, PropertyFilters

logger = logging.getLogger(__name__)


class PropertyService(BaseService):
    """Service for managing property operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "properties")
    
    async def validate_create_data(self, data: PropertyCreate) -> None:
        """Validate property creation data."""
        # Check if property ID already exists
        existing_property = await self.get_by_id(data.id)
        if existing_property:
            raise HTTPException(status_code=400, detail=f"Property with ID '{data.id}' already exists")
        
        # Validate ID format (basic validation - can be enhanced later)
        if not data.id.replace('_', '').replace('-', '').isalnum():
            raise HTTPException(status_code=400, detail="Property ID must contain only alphanumeric characters, hyphens, and underscores")
        
        if data.parent_id:
            parent_exists = await self.exists(data.parent_id)
            if not parent_exists:
                # Try to find by ObjectId for backward compatibility
                try:
                    parent = await self.collection.find_one({"_id": ObjectId(data.parent_id)})
                    if not parent:
                        raise HTTPException(status_code=404, detail="Parent property not found")
                except Exception:
                    raise HTTPException(status_code=404, detail="Parent property not found")
        
        # Validate required numeric fields
        if data.surface_area <= 0:
            raise HTTPException(status_code=400, detail="Surface area must be greater than 0")
        
        if data.number_of_rooms <= 0:
            raise HTTPException(status_code=400, detail="Number of rooms must be greater than 0")
        
        if data.rent_per_sqm is not None and data.rent_per_sqm < 0:
            raise HTTPException(status_code=400, detail="Rent per square meter cannot be negative")
        
        if data.cold_rent is not None and data.cold_rent < 0:
            raise HTTPException(status_code=400, detail="Cold rent cannot be negative")
    
    async def validate_update_data(self, doc_id: str, update_data: Dict[str, Any]) -> None:
        """Validate property update data."""
        if "parent_id" in update_data and update_data["parent_id"]:
            if update_data["parent_id"] == doc_id:
                raise HTTPException(status_code=400, detail="Property cannot be its own parent")
            
            parent_exists = await self.exists(update_data["parent_id"])
            if not parent_exists:
                raise HTTPException(status_code=404, detail="Parent property not found")
        
        # Validate numeric fields
        if "surface_area" in update_data and update_data["surface_area"] <= 0:
            raise HTTPException(status_code=400, detail="Surface area must be greater than 0")
        
        if "number_of_rooms" in update_data and update_data["number_of_rooms"] <= 0:
            raise HTTPException(status_code=400, detail="Number of rooms must be greater than 0")
        
        if "rent_per_sqm" in update_data and update_data["rent_per_sqm"] is not None and update_data["rent_per_sqm"] < 0:
            raise HTTPException(status_code=400, detail="Rent per square meter cannot be negative")
        
        if "cold_rent" in update_data and update_data["cold_rent"] is not None and update_data["cold_rent"] < 0:
            raise HTTPException(status_code=400, detail="Cold rent cannot be negative")
    
    async def create_property(self, property_data: PropertyCreate, created_by: str) -> Dict[str, Any]:
        """Create a new property."""
        await self.validate_create_data(property_data)
        return await self.create(property_data, created_by)
    
    async def get_property_by_id(self, property_id: str) -> Optional[Dict[str, Any]]:
        """Get property by ID, with fallback to ObjectId for backward compatibility."""
        property_doc = await self.get_by_id(property_id)
        
        if not property_doc:
            # Try to find by ObjectId for backward compatibility
            try:
                property_doc = await self.collection.find_one({"_id": ObjectId(property_id)})
                if property_doc:
                    if "_id" in property_doc:
                        property_doc["id"] = str(property_doc["_id"])
                        del property_doc["_id"]
            except Exception:
                pass
        
        if property_doc:
            # Ensure required fields exist with defaults
            property_doc.setdefault("street", "")
            property_doc.setdefault("house_nr", "")
            property_doc.setdefault("postcode", "")
            property_doc.setdefault("city", "")
            property_doc.setdefault("name", f"Property {property_doc.get('id', 'Unknown')}")
            property_doc.setdefault("property_type", "apartment")
            property_doc.setdefault("status", "active")
            property_doc.setdefault("surface_area", 0)
            property_doc.setdefault("number_of_rooms", 0)
        
        return property_doc
    
    async def get_properties_with_filters(self, filters: PropertyFilters, **kwargs) -> List[Dict[str, Any]]:
        """Get properties with advanced filtering."""
        query = {}
        
        # Build query from filters
        if filters.property_type:
            query["property_type"] = filters.property_type
        
        if filters.min_rooms is not None:
            query["number_of_rooms"] = {"$gte": filters.min_rooms}
        
        if filters.max_rooms is not None:
            if "number_of_rooms" in query:
                query["number_of_rooms"]["$lte"] = filters.max_rooms
            else:
                query["number_of_rooms"] = {"$lte": filters.max_rooms}
        
        if filters.min_surface is not None:
            query["surface_area"] = {"$gte": filters.min_surface}
        
        if filters.max_surface is not None:
            if "surface_area" in query:
                query["surface_area"]["$lte"] = filters.max_surface
            else:
                query["surface_area"] = {"$lte": filters.max_surface}
        
        if filters.status:
            query["status"] = filters.status
        
        if filters.archived is not None:
            query["is_archived"] = filters.archived
        
        if filters.city:
            query["city"] = {"$regex": filters.city, "$options": "i"}
        
        if filters.parent_id:
            query["parent_id"] = filters.parent_id
        
        properties = await self.get_all(query, **kwargs)
        
        # Ensure all properties have required fields
        for prop in properties:
            prop.setdefault("street", "")
            prop.setdefault("house_nr", "")
            prop.setdefault("postcode", "")
            prop.setdefault("city", "")
            prop.setdefault("name", f"Property {prop.get('id', 'Unknown')}")
            prop.setdefault("property_type", "apartment")
            prop.setdefault("status", "active")
            prop.setdefault("surface_area", 0)
            prop.setdefault("number_of_rooms", 0)
        
        return properties
    
    async def update_property(self, property_id: str, update_data: PropertyUpdate) -> Optional[Dict[str, Any]]:
        """Update a property."""
        update_dict = update_data.model_dump(exclude_unset=True)
        await self.validate_update_data(property_id, update_dict)
        return await self.update(property_id, update_dict)
    
    async def get_child_properties(self, parent_id: str) -> List[Dict[str, Any]]:
        """Get all child properties of a given parent."""
        query = {"parent_id": parent_id, "is_archived": False}
        return await self.get_all(query)
    
    async def get_properties_by_type(self, property_type: str) -> List[Dict[str, Any]]:
        """Get properties by type."""
        query = {"property_type": property_type, "is_archived": False}
        return await self.get_all(query)
    
    async def get_vacant_properties(self) -> List[Dict[str, Any]]:
        """Get all vacant properties."""
        query = {"status": "empty", "is_archived": False}
        return await self.get_all(query)
    
    async def get_property_stats(self) -> Dict[str, Any]:
        """Get property statistics."""
        try:
            stats = await self.collection.aggregate([
                {
                    "$match": {"is_archived": False}
                },
                {
                    "$group": {
                        "_id": None,
                        "total_properties": {"$sum": 1},
                        "vacant_properties": {
                            "$sum": {"$cond": [{"$eq": ["$status", "empty"]}, 1, 0]}
                        },
                        "active_properties": {
                            "$sum": {"$cond": [{"$eq": ["$status", "active"]}, 1, 0]}
                        },
                        "total_surface_area": {"$sum": "$surface_area"},
                        "avg_surface_area": {"$avg": "$surface_area"},
                        "total_rooms": {"$sum": "$number_of_rooms"},
                        "avg_rooms": {"$avg": "$number_of_rooms"}
                    }
                }
            ]).to_list(1)
            
            if stats:
                return stats[0]
            else:
                return {
                    "total_properties": 0,
                    "vacant_properties": 0,
                    "active_properties": 0,
                    "total_surface_area": 0,
                    "avg_surface_area": 0,
                    "total_rooms": 0,
                    "avg_rooms": 0
                }
        except Exception as e:
            logger.error(f"Error getting property stats: {str(e)}")
            raise