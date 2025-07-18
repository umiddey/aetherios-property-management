from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from repositories.base_repository import BaseRepository
import logging

logger = logging.getLogger(__name__)


class TenantRepository(BaseRepository):
    """Repository for managing tenant data operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "tenants")
        self.setup_indexes()
    
    def setup_indexes(self):
        """Setup indexes for tenant collection."""
        try:
            # Email index for uniqueness
            self.db.tenants.create_index("email", unique=True, background=True)
            # Search indexes
            self.db.tenants.create_index([("first_name", "text"), ("last_name", "text"), ("email", "text")], background=True)
            # Performance indexes
            self.db.tenants.create_index("is_archived", background=True)
            self.db.tenants.create_index("created_at", background=True)
            self.db.tenants.create_index("created_by", background=True)
            logger.info("Tenant repository indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create tenant indexes: {str(e)}")
    
    async def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find tenant by email address."""
        return await self.collection.find_one({"email": email, "is_archived": False})
    
    async def search_tenants(self, search_term: str, archived: bool = False) -> List[Dict[str, Any]]:
        """Search tenants by name or email."""
        query = {
            "$and": [
                {"is_archived": archived},
                {
                    "$or": [
                        {"first_name": {"$regex": search_term, "$options": "i"}},
                        {"last_name": {"$regex": search_term, "$options": "i"}},
                        {"email": {"$regex": search_term, "$options": "i"}}
                    ]
                }
            ]
        }
        cursor = self.collection.find(query).sort("created_at", -1)
        return await cursor.to_list(length=None)
    
    async def get_tenants_by_gender(self, gender: str) -> List[Dict[str, Any]]:
        """Get tenants filtered by gender."""
        query = {"gender": gender, "is_archived": False}
        cursor = self.collection.find(query).sort("created_at", -1)
        return await cursor.to_list(length=None)
    
    async def get_tenant_stats(self) -> Dict[str, Any]:
        """Get tenant statistics."""
        try:
            stats = await self.collection.aggregate([
                {
                    "$match": {"is_archived": False}
                },
                {
                    "$group": {
                        "_id": None,
                        "total_tenants": {"$sum": 1},
                        "male_tenants": {
                            "$sum": {"$cond": [{"$eq": ["$gender", "male"]}, 1, 0]}
                        },
                        "female_tenants": {
                            "$sum": {"$cond": [{"$eq": ["$gender", "female"]}, 1, 0]}
                        },
                        "tenants_with_bank_account": {
                            "$sum": {"$cond": [{"$ne": ["$bank_account", None]}, 1, 0]}
                        }
                    }
                }
            ]).to_list(1)
            
            if stats:
                return stats[0]
            else:
                return {
                    "total_tenants": 0,
                    "male_tenants": 0,
                    "female_tenants": 0,
                    "tenants_with_bank_account": 0
                }
        except Exception as e:
            logger.error(f"Error getting tenant stats: {str(e)}")
            raise