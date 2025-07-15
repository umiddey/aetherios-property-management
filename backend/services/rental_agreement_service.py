from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from datetime import datetime
import logging
import uuid

from services.base_service import BaseService

logger = logging.getLogger(__name__)


class RentalAgreementService(BaseService):
    """Service for managing rental agreement operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "rental_agreements")
        self.setup_indexes()
    
    def setup_indexes(self):
        """Setup indexes for rental agreement collection."""
        try:
            # Foreign key indexes
            self.db.rental_agreements.create_index("property_id", background=True)
            self.db.rental_agreements.create_index("tenant_id", background=True)
            # Status indexes
            self.db.rental_agreements.create_index("is_active", background=True)
            self.db.rental_agreements.create_index("is_archived", background=True)
            # Date indexes
            self.db.rental_agreements.create_index("start_date", background=True)
            self.db.rental_agreements.create_index("end_date", background=True)
            self.db.rental_agreements.create_index("created_at", background=True)
            # Compound index for active agreements
            self.db.rental_agreements.create_index([
                ("is_active", 1), 
                ("is_archived", 1)
            ], background=True)
            logger.info("Rental agreement service indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create rental agreement indexes: {str(e)}")
    
    async def validate_create_data(self, data) -> None:
        """Validate rental agreement creation data."""
        # Verify property exists
        property_doc = await self.db.properties.find_one({"id": data.property_id})
        if not property_doc:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Verify tenant exists
        tenant_doc = await self.db.tenants.find_one({"id": data.tenant_id})
        if not tenant_doc:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Check for overlapping active agreements for the same property
        query = {
            "property_id": data.property_id,
            "is_active": True,
            "is_archived": False
        }
        
        if data.end_date:
            query["$or"] = [
                {"end_date": None},  # Indefinite agreements
                {"end_date": {"$gte": data.start_date}},  # Agreements ending after our start
                {"start_date": {"$lte": data.end_date}}   # Agreements starting before our end
            ]
        else:
            query["$or"] = [
                {"end_date": None},  # Indefinite agreements
                {"end_date": {"$gte": data.start_date}}  # Agreements ending after our start
            ]
        
        existing_agreement = await self.collection.find_one(query)
        if existing_agreement:
            raise HTTPException(
                status_code=400, 
                detail="Property already has an active rental agreement for this period"
            )
        
        # Validate dates
        if data.end_date and data.end_date <= data.start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        # Validate monthly rent
        if data.monthly_rent <= 0:
            raise HTTPException(status_code=400, detail="Monthly rent must be greater than 0")
        
        # Validate deposit if provided
        if data.deposit is not None and data.deposit < 0:
            raise HTTPException(status_code=400, detail="Deposit cannot be negative")
    
    async def validate_update_data(self, agreement_id: str, update_data: Dict[str, Any]) -> None:
        """Validate rental agreement update data."""
        # Validate monthly rent
        if "monthly_rent" in update_data and update_data["monthly_rent"] <= 0:
            raise HTTPException(status_code=400, detail="Monthly rent must be greater than 0")
        
        # Validate deposit if provided
        if "deposit" in update_data and update_data["deposit"] is not None and update_data["deposit"] < 0:
            raise HTTPException(status_code=400, detail="Deposit cannot be negative")
        
        # Validate dates
        if "start_date" in update_data and "end_date" in update_data:
            if update_data["end_date"] and update_data["end_date"] <= update_data["start_date"]:
                raise HTTPException(status_code=400, detail="End date must be after start date")
        
        # Validate property exists if being updated
        if "property_id" in update_data:
            property_doc = await self.db.properties.find_one({"id": update_data["property_id"]})
            if not property_doc:
                raise HTTPException(status_code=404, detail="Property not found")
        
        # Validate tenant exists if being updated
        if "tenant_id" in update_data:
            tenant_doc = await self.db.tenants.find_one({"id": update_data["tenant_id"]})
            if not tenant_doc:
                raise HTTPException(status_code=404, detail="Tenant not found")
    
    async def create_rental_agreement(self, agreement_data, created_by: str) -> Dict[str, Any]:
        """Create a new rental agreement."""
        await self.validate_create_data(agreement_data)
        
        result = await self.create(agreement_data, created_by)
        logger.info(f"Created rental agreement for property: {agreement_data.property_id}")
        return result
    
    async def get_rental_agreement_by_id(self, agreement_id: str) -> Optional[Dict[str, Any]]:
        """Get rental agreement by ID."""
        agreement = await self.get_by_id(agreement_id)
        if agreement:
            # Ensure required fields exist with defaults
            agreement.setdefault("monthly_rent", 0.0)
            agreement.setdefault("deposit", 0.0)
            agreement.setdefault("is_active", True)
            agreement.setdefault("is_archived", False)
        return agreement
    
    async def get_rental_agreements(self, filters: Dict[str, Any] = None, **kwargs) -> List[Dict[str, Any]]:
        """Get rental agreements with optional filters."""
        query = {}
        
        if filters:
            if "property_id" in filters and filters["property_id"]:
                query["property_id"] = filters["property_id"]
            if "tenant_id" in filters and filters["tenant_id"]:
                query["tenant_id"] = filters["tenant_id"]
            if "is_active" in filters and filters["is_active"] is not None:
                query["is_active"] = filters["is_active"]
            if "is_archived" in filters and filters["is_archived"] is not None:
                query["is_archived"] = filters["is_archived"]
        
        # Map offset to skip for base service compatibility
        if 'offset' in kwargs:
            kwargs['skip'] = kwargs.pop('offset')
        
        agreements = await self.get_all(query, **kwargs)
        
        # Ensure all agreements have required fields
        for agreement in agreements:
            agreement.setdefault("monthly_rent", 0.0)
            agreement.setdefault("deposit", 0.0)
            agreement.setdefault("is_active", True)
            agreement.setdefault("is_archived", False)
        
        return agreements
    
    async def update_rental_agreement(self, agreement_id: str, update_data) -> Optional[Dict[str, Any]]:
        """Update a rental agreement."""
        if hasattr(update_data, 'model_dump'):
            update_dict = update_data.model_dump(exclude_unset=True)
        else:
            update_dict = update_data
        
        # Validate update data
        if "monthly_rent" in update_dict and update_dict["monthly_rent"] <= 0:
            raise HTTPException(status_code=400, detail="Monthly rent must be greater than 0")
        
        if "deposit" in update_dict and update_dict["deposit"] is not None and update_dict["deposit"] < 0:
            raise HTTPException(status_code=400, detail="Deposit cannot be negative")
        
        if "start_date" in update_dict and "end_date" in update_dict:
            if update_dict["end_date"] and update_dict["end_date"] <= update_dict["start_date"]:
                raise HTTPException(status_code=400, detail="End date must be after start date")
        
        result = await self.update(agreement_id, update_dict)
        if result:
            logger.info(f"Updated rental agreement: {agreement_id}")
        return result
    
    async def delete_rental_agreement(self, agreement_id: str) -> bool:
        """Delete a rental agreement."""
        result = await self.delete(agreement_id)
        if result:
            logger.info(f"Deleted rental agreement: {agreement_id}")
            return True
        return False
    
    async def get_active_agreements_for_property(self, property_id: str) -> List[Dict[str, Any]]:
        """Get active rental agreements for a specific property."""
        query = {
            "property_id": property_id,
            "is_active": True,
            "is_archived": False
        }
        
        cursor = self.collection.find(query).sort("start_date", -1)
        agreements = await cursor.to_list(length=None)
        
        # Remove MongoDB's _id
        for agreement in agreements:
            if "_id" in agreement:
                del agreement["_id"]
        
        return agreements
    
    async def get_agreements_for_tenant(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Get rental agreements for a specific tenant."""
        query = {
            "tenant_id": tenant_id,
            "is_archived": False
        }
        
        cursor = self.collection.find(query).sort("start_date", -1)
        agreements = await cursor.to_list(length=None)
        
        # Remove MongoDB's _id
        for agreement in agreements:
            if "_id" in agreement:
                del agreement["_id"]
        
        return agreements
    
    async def archive_rental_agreement(self, agreement_id: str) -> bool:
        """Archive a rental agreement."""
        result = await self.update(agreement_id, {"is_archived": True})
        if result:
            logger.info(f"Archived rental agreement: {agreement_id}")
            return True
        return False
    
    async def activate_rental_agreement(self, agreement_id: str) -> bool:
        """Activate a rental agreement."""
        result = await self.update(agreement_id, {"is_active": True})
        if result:
            logger.info(f"Activated rental agreement: {agreement_id}")
            return True
        return False
    
    async def deactivate_rental_agreement(self, agreement_id: str) -> bool:
        """Deactivate a rental agreement."""
        result = await self.update(agreement_id, {"is_active": False})
        if result:
            logger.info(f"Deactivated rental agreement: {agreement_id}")
            return True
        return False
    
    async def get_rental_agreement_stats(self) -> Dict[str, Any]:
        """Get rental agreement statistics."""
        try:
            stats = await self.collection.aggregate([
                {
                    "$group": {
                        "_id": None,
                        "total_agreements": {"$sum": 1},
                        "active_agreements": {
                            "$sum": {"$cond": [{"$eq": ["$is_active", True]}, 1, 0]}
                        },
                        "archived_agreements": {
                            "$sum": {"$cond": [{"$eq": ["$is_archived", True]}, 1, 0]}
                        },
                        "total_monthly_rent": {
                            "$sum": {"$cond": [{"$eq": ["$is_active", True]}, "$monthly_rent", 0]}
                        },
                        "average_monthly_rent": {
                            "$avg": {"$cond": [{"$eq": ["$is_active", True]}, "$monthly_rent", None]}
                        }
                    }
                }
            ]).to_list(1)
            
            if stats:
                result = stats[0]
                # Round average to 2 decimal places
                if result.get("average_monthly_rent"):
                    result["average_monthly_rent"] = round(result["average_monthly_rent"], 2)
                return result
            else:
                return {
                    "total_agreements": 0,
                    "active_agreements": 0,
                    "archived_agreements": 0,
                    "total_monthly_rent": 0.0,
                    "average_monthly_rent": 0.0
                }
        except Exception as e:
            logger.error(f"Error getting rental agreement stats: {str(e)}")
            raise