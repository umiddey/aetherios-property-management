from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, date
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
        
        import logging
        logger = logging.getLogger(__name__)
        
        # DEBUG: Log all contract data fields to understand what's being passed
        logger.info(f"🔍 CONTRACT VALIDATION DEBUG:")
        logger.info(f"  - Title: {contract_data.title}")
        logger.info(f"  - Contract Type: {contract_data.contract_type}")
        logger.info(f"  - Related Property ID: {contract_data.related_property_id}")
        logger.info(f"  - Related Tenant ID: {contract_data.related_tenant_id}")
        logger.info(f"  - Related User ID: {contract_data.related_user_id}")
        logger.info(f"  - Tenant ID Type: {type(contract_data.related_tenant_id)}")
        logger.info(f"  - Tenant ID Value: '{contract_data.related_tenant_id}'")
        logger.info(f"  - Tenant ID Bool: {bool(contract_data.related_tenant_id)}")
        
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
            logger.info(f"🏠 Validating property ID: {contract_data.related_property_id}")
            property_exists = await self.db.properties.find_one(
                {"id": contract_data.related_property_id, "is_archived": False}
            )
            if not property_exists:
                raise HTTPException(
                    status_code=400,
                    detail="Related property not found"
                )
            logger.info(f"✅ Property validation passed")
        
        if contract_data.related_tenant_id:
            logger.info(f"🏠 Validating tenant ID: {contract_data.related_tenant_id}")
            tenant_exists = await self.db.accounts.find_one(
                {"id": contract_data.related_tenant_id, "account_type": "tenant", "is_archived": False}
            )
            logger.info(f"Tenant found: {tenant_exists is not None}")
            if tenant_exists:
                logger.info(f"Tenant details: {tenant_exists.get('first_name', '')} {tenant_exists.get('last_name', '')}")
            if not tenant_exists:
                raise HTTPException(
                    status_code=400,
                    detail="Related tenant not found"
                )
            logger.info(f"✅ Tenant validation passed")
        else:
            logger.info(f"⚠️ NO TENANT ID PROVIDED - skipping tenant validation")
        
        if contract_data.related_user_id:
            logger.info(f"👤 Validating user ID: {contract_data.related_user_id}")
            user_exists = await self.db.users.find_one(
                {"id": contract_data.related_user_id, "is_active": True}
            )
            if not user_exists:
                raise HTTPException(
                    status_code=400,
                    detail="Related user not found"
                )
            logger.info(f"✅ User validation passed")

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
        
        # Determine initial status based on start date (use UTC for consistency)
        from datetime import date, timezone
        current_date = datetime.now(timezone.utc).date()
        
        if contract_data.start_date <= current_date:
            # Contract should be active if start date has passed
            if contract_data.end_date and contract_data.end_date <= current_date:
                initial_status = ContractStatus.EXPIRED.value
            else:
                initial_status = ContractStatus.ACTIVE.value
        else:
            # Contract is pending if start date is in the future
            initial_status = ContractStatus.PENDING.value
        
        # Create contract dict (convert dates to datetime for MongoDB)
        contract_dict = {
            "id": str(uuid.uuid4()),
            "title": contract_data.title,
            "contract_type": contract_data.contract_type.value,
            "parties": [party.model_dump() for party in contract_data.parties],
            "start_date": datetime.combine(contract_data.start_date, datetime.min.time()),
            "end_date": datetime.combine(contract_data.end_date, datetime.min.time()) if contract_data.end_date else None,
            "status": initial_status,
            "value": contract_data.value,
            "currency": contract_data.currency,
            
            # Invoice generation settings
            "billing_type": contract_data.billing_type.value if contract_data.billing_type else None,
            "billing_frequency": contract_data.billing_frequency,
            "next_billing_date": datetime.combine(contract_data.next_billing_date, datetime.min.time()) if contract_data.next_billing_date else None,
            
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
        today = date.today()
        cutoff_date = today + timedelta(days=days_ahead)
        
        # Convert to datetime for MongoDB query
        today_dt = datetime.combine(today, datetime.min.time())
        cutoff_dt = datetime.combine(cutoff_date, datetime.max.time())
        
        cursor = self.collection.find({
            "end_date": {"$lte": cutoff_dt, "$gte": today_dt},
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


    async def get_contracts_due_for_billing(self) -> List[Dict[str, Any]]:
        """Get contracts that are due for billing (recurring invoices)"""
        current_date = date.today()
        current_datetime = datetime.combine(current_date, datetime.max.time())
        
        cursor = self.collection.find({
            "status": ContractStatus.ACTIVE.value,
            "billing_type": {"$in": ["recurring", "RECURRING"]},
            "next_billing_date": {"$lte": current_datetime},
            "is_archived": False
        }).sort("next_billing_date", 1)
        
        return await cursor.to_list(length=None)

    async def auto_update_contract_statuses(self) -> Dict[str, int]:
        """Auto-update contract statuses based on dates"""
        current_date = date.today()
        current_datetime = datetime.combine(current_date, datetime.max.time())
        
        # Update DRAFT contracts to appropriate status based on dates
        draft_contracts = await self.collection.find({
            "status": ContractStatus.DRAFT.value,
            "is_archived": False
        }).to_list(length=None)
        
        draft_updated = 0
        for contract in draft_contracts:
            new_status = None
            start_date = contract.get("start_date")
            end_date = contract.get("end_date")
            
            # Convert datetime to date for comparison
            start_date_only = start_date.date() if start_date else None
            end_date_only = end_date.date() if end_date else None
            
            if start_date_only and start_date_only <= current_date:
                if end_date_only and end_date_only <= current_date:
                    new_status = ContractStatus.EXPIRED.value
                else:
                    new_status = ContractStatus.ACTIVE.value
            elif start_date_only and start_date_only > current_date:
                new_status = ContractStatus.PENDING.value
            
            if new_status and new_status != contract.get("status"):
                await self.collection.update_one(
                    {"id": contract["id"]},
                    {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
                )
                draft_updated += 1
        
        # Update contracts to ACTIVE if start date has passed
        pending_to_active = await self.collection.update_many(
            {
                "status": ContractStatus.PENDING.value,
                "start_date": {"$lte": current_datetime},
                "is_archived": False
            },
            {
                "$set": {
                    "status": ContractStatus.ACTIVE.value,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Update contracts to EXPIRED if end date has passed
        active_to_expired = await self.collection.update_many(
            {
                "status": ContractStatus.ACTIVE.value,
                "end_date": {"$lte": current_datetime},
                "is_archived": False
            },
            {
                "$set": {
                    "status": ContractStatus.EXPIRED.value,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "draft_updated": draft_updated,
            "activated": pending_to_active.modified_count,
            "expired": active_to_expired.modified_count
        }


