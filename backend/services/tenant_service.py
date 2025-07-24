from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
import logging

from services.base_service import BaseService
from models.tenant import Tenant, TenantCreate, TenantUpdate, TenantFilters

logger = logging.getLogger(__name__)


class TenantService(BaseService):
    """Service for managing tenant operations."""
    
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
            logger.info("Tenant service indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create tenant indexes: {str(e)}")
    
    async def validate_create_data(self, data: TenantCreate) -> None:
        """Validate tenant creation data."""
        # Check if email already exists
        existing_tenant = await self.collection.find_one({"email": data.email, "is_archived": False})
        if existing_tenant:
            raise HTTPException(status_code=400, detail=f"Tenant with email '{data.email}' already exists")
        
        # Validate email format (already handled by EmailStr)
        # Additional validations can be added here
        
        if data.phone and len(data.phone) > 50:
            raise HTTPException(status_code=400, detail="Phone number is too long")
        
        if data.gender and data.gender not in ["male", "female"]:
            raise HTTPException(status_code=400, detail="Gender must be either 'male' or 'female'")
    
    async def validate_update_data(self, tenant_id: str, update_data: Dict[str, Any]) -> None:
        """Validate tenant update data."""
        if "email" in update_data:
            # Check if email already exists (excluding current tenant)
            existing_tenant = await self.collection.find_one({"email": update_data["email"], "is_archived": False})
            if existing_tenant and existing_tenant.get("id") != tenant_id:
                raise HTTPException(status_code=400, detail=f"Tenant with email '{update_data['email']}' already exists")
        
        if "phone" in update_data and update_data["phone"] and len(update_data["phone"]) > 50:
            raise HTTPException(status_code=400, detail="Phone number is too long")
        
        if "gender" in update_data and update_data["gender"] and update_data["gender"] not in ["male", "female"]:
            raise HTTPException(status_code=400, detail="Gender must be either 'male' or 'female'")
    
    async def create_tenant(self, tenant_data: TenantCreate, created_by: str) -> Dict[str, Any]:
        """Create a new tenant."""
        await self.validate_create_data(tenant_data)
        result = await self.create(tenant_data, created_by)
        logger.info(f"Created tenant with email: {tenant_data.email}")
        return result
    
    async def get_tenant_by_id(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Get tenant by ID."""
        tenant = await self.get_by_id(tenant_id)
        if tenant:
            # Ensure required fields exist with defaults
            tenant.setdefault("first_name", "")
            tenant.setdefault("last_name", "")
            tenant.setdefault("email", "")
            tenant.setdefault("phone", "")
            tenant.setdefault("address", "")
            
            # Compute status based on active rental agreements
            tenant["status"] = await self._compute_tenant_status(tenant["id"])
        return tenant
    
    async def get_tenant_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get tenant by email address."""
        tenant = await self.collection.find_one({"email": email, "is_archived": False})
        if tenant and "_id" in tenant:
            del tenant["_id"]
        return tenant
    
    async def get_tenants_with_filters(self, filters: TenantFilters, **kwargs) -> List[Dict[str, Any]]:
        """Get tenants with advanced filtering."""
        query = {}
        
        # Build query from filters
        if filters.archived is not None:
            query["is_archived"] = filters.archived
        else:
            query["is_archived"] = False  # Default to non-archived
        
        if filters.gender:
            query["gender"] = filters.gender
        
        if filters.search:
            # Use text search for name and email
            return await self.search_tenants(filters.search, filters.archived or False)
        
        # Get all tenants with query
        # Map offset to skip for base service compatibility
        if 'offset' in kwargs:
            kwargs['skip'] = kwargs.pop('offset')
        tenants = await self.get_all(query, **kwargs)
        
        # Ensure all tenants have required fields and compute status
        for tenant in tenants:
            tenant.setdefault("first_name", "")
            tenant.setdefault("last_name", "")
            tenant.setdefault("email", "")
            tenant.setdefault("phone", "")
            tenant.setdefault("address", "")
            
            # Compute status based on active rental agreements
            tenant["status"] = await self._compute_tenant_status(tenant["id"])
        
        return tenants
    
    async def update_tenant(self, tenant_id: str, update_data: TenantUpdate) -> Optional[Dict[str, Any]]:
        """Update a tenant."""
        update_dict = update_data.model_dump(exclude_unset=True)
        await self.validate_update_data(tenant_id, update_dict)
        
        result = await self.update(tenant_id, update_dict)
        if result:
            logger.info(f"Updated tenant: {tenant_id}")
        return result
    
    async def delete_tenant(self, tenant_id: str) -> bool:
        """Soft delete a tenant (mark as archived)."""
        result = await self.update(tenant_id, {"is_archived": True})
        if result:
            logger.info(f"Archived tenant: {tenant_id}")
            return True
        return False
    
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
        tenants = await cursor.to_list(length=None)
        
        # Remove MongoDB's _id and ensure all tenants have required fields
        for tenant in tenants:
            if "_id" in tenant:
                del tenant["_id"]
            tenant.setdefault("first_name", "")
            tenant.setdefault("last_name", "")
            tenant.setdefault("email", "")
            tenant.setdefault("phone", "")
            tenant.setdefault("address", "")
            
            # Compute status based on active rental agreements
            tenant["status"] = await self._compute_tenant_status(tenant["id"])
        
        return tenants
    
    async def _compute_tenant_status(self, tenant_id: str) -> str:
        """Compute tenant status based on active rental contracts."""
        try:
            # Check if tenant has active rental contracts
            rental_contracts = await self.db.contracts.find({
                "related_tenant_id": tenant_id,
                "contract_type": "rental",
                "status": "active",
                "is_archived": False
            }).to_list(length=None)
            
            if rental_contracts:
                # Check if any contract is currently active (within date range)
                from datetime import datetime
                current_date = datetime.utcnow()
                
                for contract in rental_contracts:
                    start_date = contract.get("start_date")
                    end_date = contract.get("end_date")
                    
                    # If start_date is in the past (or today) and end_date is in the future (or None)
                    if start_date and start_date <= current_date:
                        if end_date is None or end_date >= current_date:
                            return "active"
                
                return "inactive"
            else:
                return "inactive"
        except Exception as e:
            logger.error(f"Error computing tenant status for {tenant_id}: {str(e)}")
            return "inactive"