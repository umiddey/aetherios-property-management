from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)


class BaseService(ABC):
    """Base service class providing common CRUD operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str):
        self.db = db
        self.collection = db[collection_name]
        self.collection_name = collection_name
    
    async def create(self, data: BaseModel, created_by: str) -> Dict[str, Any]:
        """Create a new document."""
        try:
            doc_dict = data.model_dump()
            # Only auto-generate ID if not provided
            if "id" not in doc_dict or not doc_dict["id"]:
                doc_dict["id"] = str(uuid.uuid4())
            doc_dict["created_by"] = created_by
            doc_dict["created_at"] = datetime.utcnow()
            
            # Add default archiving fields for most entities
            if "is_archived" not in doc_dict:
                doc_dict["is_archived"] = False
            
            # Add default active field for most entities
            if "is_active" not in doc_dict:
                doc_dict["is_active"] = True
            
            await self.collection.insert_one(doc_dict)
            
            # Remove MongoDB's _id before returning
            if "_id" in doc_dict:
                del doc_dict["_id"]
            
            logger.info(f"Created {self.collection_name} with id: {doc_dict['id']}")
            return doc_dict
            
        except Exception as e:
            logger.error(f"Error creating {self.collection_name}: {str(e)}")
            raise
    
    async def get_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get a document by ID."""
        try:
            doc = await self.collection.find_one({"id": doc_id})
            if doc and "_id" in doc:
                del doc["_id"]
            return doc
        except Exception as e:
            logger.error(f"Error fetching {self.collection_name} {doc_id}: {str(e)}")
            raise
    
    async def get_all(self, 
                     query: Optional[Dict[str, Any]] = None,
                     skip: int = 0,
                     limit: int = 1000,
                     sort_by: str = "created_at",
                     sort_order: int = -1) -> List[Dict[str, Any]]:
        """Get all documents with optional filtering and pagination."""
        try:
            if query is None:
                query = {}
            
            cursor = self.collection.find(query).sort(sort_by, sort_order).skip(skip).limit(limit)
            docs = await cursor.to_list(length=limit)
            
            # Remove MongoDB's _id from all documents
            for doc in docs:
                if "_id" in doc:
                    del doc["_id"]
            
            return docs
            
        except Exception as e:
            logger.error(f"Error fetching {self.collection_name} list: {str(e)}")
            raise
    
    async def update(self, doc_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a document."""
        try:
            # Remove None values from update data
            update_data = {k: v for k, v in update_data.items() if v is not None}
            
            if not update_data:
                # If no data to update, return current document
                return await self.get_by_id(doc_id)
            
            # Add updated_at timestamp
            update_data["updated_at"] = datetime.utcnow()
            
            result = await self.collection.update_one(
                {"id": doc_id},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                return None
            
            updated_doc = await self.get_by_id(doc_id)
            logger.info(f"Updated {self.collection_name} with id: {doc_id}")
            return updated_doc
            
        except Exception as e:
            logger.error(f"Error updating {self.collection_name} {doc_id}: {str(e)}")
            raise
    
    async def delete(self, doc_id: str) -> bool:
        """Delete a document."""
        try:
            result = await self.collection.delete_one({"id": doc_id})
            success = result.deleted_count > 0
            
            if success:
                logger.info(f"Deleted {self.collection_name} with id: {doc_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error deleting {self.collection_name} {doc_id}: {str(e)}")
            raise
    
    async def archive(self, doc_id: str) -> bool:
        """Archive a document (soft delete)."""
        try:
            result = await self.collection.update_one(
                {"id": doc_id},
                {"$set": {"is_archived": True, "archived_at": datetime.utcnow()}}
            )
            
            success = result.matched_count > 0
            if success:
                logger.info(f"Archived {self.collection_name} with id: {doc_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error archiving {self.collection_name} {doc_id}: {str(e)}")
            raise
    
    async def count(self, query: Optional[Dict[str, Any]] = None) -> int:
        """Count documents matching query."""
        try:
            if query is None:
                query = {}
            return await self.collection.count_documents(query)
        except Exception as e:
            logger.error(f"Error counting {self.collection_name}: {str(e)}")
            raise
    
    async def exists(self, doc_id: str) -> bool:
        """Check if a document exists."""
        try:
            count = await self.collection.count_documents({"id": doc_id})
            return count > 0
        except Exception as e:
            logger.error(f"Error checking existence of {self.collection_name} {doc_id}: {str(e)}")
            raise
    
    @abstractmethod
    async def validate_create_data(self, data: BaseModel) -> None:
        """Validate data before creation. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    async def validate_update_data(self, doc_id: str, update_data: Dict[str, Any]) -> None:
        """Validate data before update. Must be implemented by subclasses."""
        pass