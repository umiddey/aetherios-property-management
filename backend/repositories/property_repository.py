from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import logging

from repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class PropertyRepository(BaseRepository):
    """Repository for property database operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "properties")
    
    async def find_by_id(self, property_id: str) -> Optional[Dict[str, Any]]:
        """Find property by ID or ObjectId."""
        # Try to find by custom id field first
        property_doc = await self.find_one({"id": property_id})
        
        if not property_doc:
            # Try to find by MongoDB ObjectId for backward compatibility
            try:
                property_doc = await self.find_one({"_id": ObjectId(property_id)})
            except Exception:
                pass
        
        return property_doc
    
    async def find_by_parent_id(self, parent_id: str) -> List[Dict[str, Any]]:
        """Find all properties with given parent ID."""
        return await self.find_many({"parent_id": parent_id, "is_archived": False})
    
    async def find_by_type(self, property_type: str) -> List[Dict[str, Any]]:
        """Find properties by type."""
        return await self.find_many({"property_type": property_type, "is_archived": False})
    
    async def find_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Find properties by status."""
        return await self.find_many({"status": status, "is_archived": False})
    
    async def find_vacant_properties(self) -> List[Dict[str, Any]]:
        """Find all vacant properties."""
        return await self.find_many({"status": "empty", "is_archived": False})
    
    async def find_by_city(self, city: str) -> List[Dict[str, Any]]:
        """Find properties by city."""
        return await self.find_many({"city": {"$regex": city, "$options": "i"}, "is_archived": False})
    
    async def find_by_room_range(self, min_rooms: int, max_rooms: int) -> List[Dict[str, Any]]:
        """Find properties within room range."""
        query = {
            "number_of_rooms": {"$gte": min_rooms, "$lte": max_rooms},
            "is_archived": False
        }
        return await self.find_many(query)
    
    async def find_by_surface_range(self, min_surface: float, max_surface: float) -> List[Dict[str, Any]]:
        """Find properties within surface area range."""
        query = {
            "surface_area": {"$gte": min_surface, "$lte": max_surface},
            "is_archived": False
        }
        return await self.find_many(query)
    
    async def find_with_filters(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find properties with complex filters."""
        query = {"is_archived": False}
        
        # Add filters to query
        if "property_type" in filters:
            query["property_type"] = filters["property_type"]
        
        if "unit_type" in filters:
            query["unit_type"] = filters["unit_type"]
        
        if "status" in filters:
            query["status"] = filters["status"]
        
        if "city" in filters:
            query["city"] = {"$regex": filters["city"], "$options": "i"}
        
        if "min_rooms" in filters or "max_rooms" in filters:
            room_query = {}
            if "min_rooms" in filters:
                room_query["$gte"] = filters["min_rooms"]
            if "max_rooms" in filters:
                room_query["$lte"] = filters["max_rooms"]
            query["number_of_rooms"] = room_query
        
        if "min_surface" in filters or "max_surface" in filters:
            surface_query = {}
            if "min_surface" in filters:
                surface_query["$gte"] = filters["min_surface"]
            if "max_surface" in filters:
                surface_query["$lte"] = filters["max_surface"]
            query["surface_area"] = surface_query
        
        if "parent_id" in filters:
            query["parent_id"] = filters["parent_id"]
        
        return await self.find_many(query, sort=[("created_at", -1)])
    
    async def get_property_stats(self) -> Dict[str, Any]:
        """Get property statistics using aggregation."""
        pipeline = [
            {"$match": {"is_archived": False}},
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
        ]
        
        result = await self.aggregate(pipeline)
        
        if result:
            return result[0]
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
    
    async def get_properties_by_type_stats(self) -> List[Dict[str, Any]]:
        """Get property statistics grouped by type."""
        pipeline = [
            {"$match": {"is_archived": False}},
            {
                "$group": {
                    "_id": "$property_type",
                    "count": {"$sum": 1},
                    "total_surface_area": {"$sum": "$surface_area"},
                    "avg_surface_area": {"$avg": "$surface_area"},
                    "total_rooms": {"$sum": "$number_of_rooms"},
                    "avg_rooms": {"$avg": "$number_of_rooms"}
                }
            },
            {"$sort": {"count": -1}}
        ]
        
        return await self.aggregate(pipeline)
    
    async def setup_indexes(self) -> None:
        """Set up database indexes for better performance."""
        try:
            # Create indexes for common queries
            await self.create_index([("id", 1)], unique=True)
            await self.create_index([("property_type", 1), ("is_archived", 1)])
            await self.create_index([("status", 1), ("is_archived", 1)])
            await self.create_index([("city", 1), ("is_archived", 1)])
            await self.create_index([("parent_id", 1)])
            await self.create_index([("created_at", -1)])
            await self.create_index([("number_of_rooms", 1)])
            await self.create_index([("surface_area", 1)])
            await self.create_index([("created_by", 1)])
            
            logger.info("Property repository indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating property indexes: {str(e)}")
            raise