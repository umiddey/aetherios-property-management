from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection
import logging

logger = logging.getLogger(__name__)


class BaseRepository(ABC):
    """Base repository class for database operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str):
        self.db = db
        self.collection: AsyncIOMotorCollection = db[collection_name]
        self.collection_name = collection_name
    
    async def insert_one(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a single document."""
        try:
            result = await self.collection.insert_one(document)
            document["_id"] = result.inserted_id
            return document
        except Exception as e:
            logger.error(f"Error inserting document in {self.collection_name}: {str(e)}")
            raise
    
    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find a single document."""
        try:
            return await self.collection.find_one(query)
        except Exception as e:
            logger.error(f"Error finding document in {self.collection_name}: {str(e)}")
            raise
    
    async def find_many(self, 
                       query: Dict[str, Any],
                       skip: int = 0,
                       limit: int = 1000,
                       sort: Optional[List[tuple]] = None) -> List[Dict[str, Any]]:
        """Find multiple documents."""
        try:
            cursor = self.collection.find(query).skip(skip).limit(limit)
            
            if sort:
                cursor = cursor.sort(sort)
            
            return await cursor.to_list(length=limit)
        except Exception as e:
            logger.error(f"Error finding documents in {self.collection_name}: {str(e)}")
            raise
    
    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> bool:
        """Update a single document."""
        try:
            result = await self.collection.update_one(query, update)
            return result.matched_count > 0
        except Exception as e:
            logger.error(f"Error updating document in {self.collection_name}: {str(e)}")
            raise
    
    async def update_many(self, query: Dict[str, Any], update: Dict[str, Any]) -> int:
        """Update multiple documents."""
        try:
            result = await self.collection.update_many(query, update)
            return result.modified_count
        except Exception as e:
            logger.error(f"Error updating documents in {self.collection_name}: {str(e)}")
            raise
    
    async def delete_one(self, query: Dict[str, Any]) -> bool:
        """Delete a single document."""
        try:
            result = await self.collection.delete_one(query)
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting document in {self.collection_name}: {str(e)}")
            raise
    
    async def delete_many(self, query: Dict[str, Any]) -> int:
        """Delete multiple documents."""
        try:
            result = await self.collection.delete_many(query)
            return result.deleted_count
        except Exception as e:
            logger.error(f"Error deleting documents in {self.collection_name}: {str(e)}")
            raise
    
    async def count_documents(self, query: Dict[str, Any]) -> int:
        """Count documents matching query."""
        try:
            return await self.collection.count_documents(query)
        except Exception as e:
            logger.error(f"Error counting documents in {self.collection_name}: {str(e)}")
            raise
    
    async def aggregate(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute aggregation pipeline."""
        try:
            cursor = self.collection.aggregate(pipeline)
            return await cursor.to_list(length=None)
        except Exception as e:
            logger.error(f"Error executing aggregation in {self.collection_name}: {str(e)}")
            raise
    
    async def create_index(self, keys: List[tuple], **kwargs) -> str:
        """Create an index."""
        try:
            return await self.collection.create_index(keys, **kwargs)
        except Exception as e:
            logger.error(f"Error creating index in {self.collection_name}: {str(e)}")
            raise
    
    async def drop_index(self, index_name: str) -> None:
        """Drop an index."""
        try:
            await self.collection.drop_index(index_name)
        except Exception as e:
            logger.error(f"Error dropping index in {self.collection_name}: {str(e)}")
            raise
    
    async def get_indexes(self) -> List[Dict[str, Any]]:
        """Get all indexes."""
        try:
            cursor = self.collection.list_indexes()
            return await cursor.to_list(length=None)
        except Exception as e:
            logger.error(f"Error getting indexes in {self.collection_name}: {str(e)}")
            raise