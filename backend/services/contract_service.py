from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pymongo import IndexModel
from fastapi import HTTPException
from services.base_service import BaseService
from models.contract import Contract, ContractCreate, ContractUpdate, ContractResponse, ContractStatus, ContractType
import uuid


class ContractService(BaseService):
    def __init__(self, database):
        super().__init__(database, "contracts")
        self._ensure_indexes()

    def _ensure_indexes(self):
        """Create database indexes for optimal query performance"""
        indexes = [
            IndexModel([("contract_type", 1)]),
            IndexModel([("status", 1)]),
            IndexModel([("start_date", 1)]),
            IndexModel([("end_date", 1)]),
            IndexModel([("created_by", 1)]),
            IndexModel([("related_property_id", 1)]),
            IndexModel([("related_tenant_id", 1)]),
            IndexModel([("related_user_id", 1)]),
            IndexModel([("title", "text")]),
            IndexModel([("created_at", -1)]),
            IndexModel([("is_archived", 1)]),
        ]
        self.collection.create_indexes(indexes)

    async def validate_create_data(self, contract_data: ContractCreate) -> None:
        """Validate contract creation data"""
        
        # Validate date logic
        if contract_data.end_date and contract_data.start_date >= contract_data.end_date:
            raise HTTPException(
                status_code=400,
                detail="End date must be after start date"
            )
        
        # Validate parties
        if not contract_data.parties or len(contract_data.parties) < 2:
            raise HTTPException(
                status_code=400,
                detail="Contract must have at least 2 parties"
            )
        
        # Validate value
        if contract_data.value is not None and contract_data.value < 0:
            raise HTTPException(
                status_code=400,
                detail="Contract value cannot be negative"
            )
        
        # Validate related entities exist
        if contract_data.related_property_id:
            property_exists = await self.db.properties.find_one(
                {"id": contract_data.related_property_id, "is_archived": False}
            )
            if not property_exists:
                raise HTTPException(
                    status_code=400,
                    detail="Related property not found"
                )
        
        if contract_data.related_tenant_id:
            tenant_exists = await self.db.tenants.find_one(
                {"id": contract_data.related_tenant_id, "is_archived": False}
            )
            if not tenant_exists:
                raise HTTPException(
                    status_code=400,
                    detail="Related tenant not found"
                )
        
        if contract_data.related_user_id:
            user_exists = await self.db.users.find_one(
                {"id": contract_data.related_user_id, "is_active": True}
            )
            if not user_exists:
                raise HTTPException(
                    status_code=400,
                    detail="Related user not found"
                )

    async def validate_update_data(self, contract_id: str, update_data: ContractUpdate) -> None:
        """Validate contract update data"""
        
        # Get existing contract
        existing_contract = await self.collection.find_one({"id": contract_id})
        if not existing_contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        # Validate date logic if dates are being updated
        start_date = update_data.start_date or existing_contract.get("start_date")
        end_date = update_data.end_date or existing_contract.get("end_date")
        
        if end_date and start_date >= end_date:
            raise HTTPException(
                status_code=400,
                detail="End date must be after start date"
            )
        
        # Validate value
        if update_data.value is not None and update_data.value < 0:
            raise HTTPException(
                status_code=400,
                detail="Contract value cannot be negative"
            )
        
        # Validate parties
        if update_data.parties is not None and len(update_data.parties) < 2:
            raise HTTPException(
                status_code=400,
                detail="Contract must have at least 2 parties"
            )

    async def create_contract(self, contract_data: ContractCreate, created_by: str) -> Dict[str, Any]:
        """Create a new contract with validation"""
        await self.validate_create_data(contract_data)
        
        # Create contract dict
        contract_dict = {
            "id": str(uuid.uuid4()),
            "title": contract_data.title,
            "contract_type": contract_data.contract_type.value,
            "parties": [party.dict() for party in contract_data.parties],
            "start_date": contract_data.start_date,
            "end_date": contract_data.end_date,
            "status": ContractStatus.DRAFT.value,
            "value": contract_data.value,
            "currency": contract_data.currency,
            "related_property_id": contract_data.related_property_id,
            "related_tenant_id": contract_data.related_tenant_id,
            "related_user_id": contract_data.related_user_id,
            "description": contract_data.description,
            "terms": contract_data.terms,
            "renewal_info": contract_data.renewal_info,
            "type_specific_data": contract_data.type_specific_data,
            "documents": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": created_by,
            "is_archived": False
        }
        
        await self.collection.insert_one(contract_dict)
        return contract_dict

    async def get_contracts_by_type(self, contract_type: ContractType, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get contracts by type with pagination"""
        cursor = self.collection.find(
            {"contract_type": contract_type.value, "is_archived": False}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        return await cursor.to_list(length=limit)

    async def get_contracts_by_status(self, status: ContractStatus, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get contracts by status with pagination"""
        cursor = self.collection.find(
            {"status": status.value, "is_archived": False}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        return await cursor.to_list(length=limit)

    async def get_expiring_contracts(self, days_ahead: int = 30) -> List[Dict[str, Any]]:
        """Get contracts expiring within specified days"""
        cutoff_date = datetime.utcnow() + timedelta(days=days_ahead)
        
        cursor = self.collection.find({
            "end_date": {"$lte": cutoff_date, "$gte": datetime.utcnow()},
            "status": {"$in": [ContractStatus.ACTIVE.value, ContractStatus.PENDING.value]},
            "is_archived": False
        }).sort("end_date", 1)
        
        return await cursor.to_list(length=None)

    async def get_contracts_by_related_entity(self, entity_type: str, entity_id: str) -> List[Dict[str, Any]]:
        """Get contracts related to a specific entity (property, tenant, user)"""
        field_map = {
            "property": "related_property_id",
            "tenant": "related_tenant_id",
            "user": "related_user_id"
        }
        
        if entity_type not in field_map:
            raise HTTPException(status_code=400, detail="Invalid entity type")
        
        cursor = self.collection.find({
            field_map[entity_type]: entity_id,
            "is_archived": False
        }).sort("created_at", -1)
        
        return await cursor.to_list(length=None)

    async def update_contract_status(self, contract_id: str, new_status: ContractStatus, updated_by: str) -> Dict[str, Any]:
        """Update contract status with validation"""
        update_data = {
            "status": new_status.value,
            "updated_at": datetime.utcnow()
        }
        
        result = await self.collection.update_one(
            {"id": contract_id, "is_archived": False},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        return await self.collection.find_one({"id": contract_id})

    async def search_contracts(self, search_term: str, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Search contracts by title, description, or party names"""
        cursor = self.collection.find({
            "$or": [
                {"title": {"$regex": search_term, "$options": "i"}},
                {"description": {"$regex": search_term, "$options": "i"}},
                {"parties.name": {"$regex": search_term, "$options": "i"}}
            ],
            "is_archived": False
        }).sort("created_at", -1).skip(skip).limit(limit)
        
        return await cursor.to_list(length=limit)

    async def get_contract_statistics(self) -> Dict[str, Any]:
        """Get contract statistics for dashboard"""
        pipeline = [
            {"$match": {"is_archived": False}},
            {"$group": {
                "_id": {
                    "type": "$contract_type",
                    "status": "$status"
                },
                "count": {"$sum": 1},
                "total_value": {"$sum": {"$ifNull": ["$value", 0]}}
            }}
        ]
        
        results = await self.collection.aggregate(pipeline).to_list(length=None)
        
        # Process results into a structured format
        stats = {
            "total_contracts": 0,
            "total_value": 0,
            "by_type": {},
            "by_status": {},
            "expiring_soon": 0
        }
        
        for result in results:
            contract_type = result["_id"]["type"]
            status = result["_id"]["status"]
            count = result["count"]
            value = result["total_value"]
            
            stats["total_contracts"] += count
            stats["total_value"] += value
            
            if contract_type not in stats["by_type"]:
                stats["by_type"][contract_type] = {"count": 0, "value": 0}
            stats["by_type"][contract_type]["count"] += count
            stats["by_type"][contract_type]["value"] += value
            
            if status not in stats["by_status"]:
                stats["by_status"][status] = {"count": 0, "value": 0}
            stats["by_status"][status]["count"] += count
            stats["by_status"][status]["value"] += value
        
        # Get expiring contracts count
        expiring_contracts = await self.get_expiring_contracts(30)
        stats["expiring_soon"] = len(expiring_contracts)
        
        return stats

    async def import_rental_agreements(self) -> Dict[str, int]:
        """Import existing rental agreements as contracts"""
        rental_agreements_collection = self.db.rental_agreements
        
        # Get all rental agreements
        rental_agreements = await rental_agreements_collection.find({"is_archived": False}).to_list(length=None)
        
        imported_count = 0
        
        for ra in rental_agreements:
            # Check if already imported
            existing_contract = await self.collection.find_one({
                "source_rental_agreement_id": ra.get("id"),
                "is_archived": False
            })
            
            if existing_contract:
                continue  # Skip if already imported
            
            # Create contract from rental agreement
            contract_dict = {
                "id": str(uuid.uuid4()),
                "title": f"Rental Agreement - {ra.get('property_name', 'Unknown Property')}",
                "contract_type": "rental",
                "parties": [
                    {
                        "name": ra.get("property_name", "Property Owner"),
                        "role": "Landlord",
                        "contact_email": "",
                        "contact_phone": ""
                    },
                    {
                        "name": f"{ra.get('tenant_name', 'Tenant')}",
                        "role": "Tenant", 
                        "contact_email": ra.get("tenant_email", ""),
                        "contact_phone": ra.get("tenant_phone", "")
                    }
                ],
                "start_date": ra.get("start_date", datetime.utcnow()),
                "end_date": ra.get("end_date"),
                "status": ContractStatus.ACTIVE.value,
                "value": ra.get("monthly_rent"),
                "currency": "EUR",
                "related_property_id": ra.get("property_id"),
                "related_tenant_id": ra.get("tenant_id"),
                "related_user_id": None,
                "description": f"Imported from rental agreement system",
                "terms": ra.get("terms", ""),
                "renewal_info": None,
                "type_specific_data": {
                    "monthly_rent": ra.get("monthly_rent"),
                    "security_deposit": ra.get("security_deposit"),
                    "utilities_included": ra.get("utilities_included", False),
                    "pet_allowed": ra.get("pet_allowed", False),
                    "furnished": ra.get("furnished", False)
                },
                "documents": [],
                "created_at": ra.get("created_at", datetime.utcnow()),
                "updated_at": datetime.utcnow(),
                "created_by": ra.get("created_by", "system"),
                "is_archived": False,
                "source_rental_agreement_id": ra.get("id")  # Link back to original
            }
            
            await self.collection.insert_one(contract_dict)
            imported_count += 1
        
        return {"imported": imported_count}

    async def auto_update_contract_statuses(self) -> Dict[str, int]:
        """Auto-update contract statuses based on dates"""
        current_date = datetime.utcnow()
        
        # Update contracts to ACTIVE if start date has passed
        pending_to_active = await self.collection.update_many(
            {
                "status": ContractStatus.PENDING.value,
                "start_date": {"$lte": current_date},
                "is_archived": False
            },
            {
                "$set": {
                    "status": ContractStatus.ACTIVE.value,
                    "updated_at": current_date
                }
            }
        )
        
        # Update contracts to EXPIRED if end date has passed
        active_to_expired = await self.collection.update_many(
            {
                "status": ContractStatus.ACTIVE.value,
                "end_date": {"$lte": current_date},
                "is_archived": False
            },
            {
                "$set": {
                    "status": ContractStatus.EXPIRED.value,
                    "updated_at": current_date
                }
            }
        )
        
        return {
            "activated": pending_to_active.modified_count,
            "expired": active_to_expired.modified_count
        }


