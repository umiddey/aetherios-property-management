"""
Contractor Service - Business logic for contractor-specific operations
Handles CRUD operations for contractors only (no portal access)
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from models.account import (
    Account, AccountType, AccountStatus, AccountCreate, AccountUpdate, AccountResponse,
    ContractorProfile
)


class ContractorService:
    """Service layer for contractor management operations (no portal access)"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db["accounts"]  # Base account data
        self.contractor_profiles = db["contractor_profiles"]  # Contractor-specific data (no portal fields)
    
    async def create_contractor(self, account_data: AccountCreate, created_by: str) -> AccountResponse:
        """
        Create a new contractor account
        """
        # Create base account (no portal fields)
        account = Account(
            account_type=AccountType.CONTRACTOR,
            first_name=account_data.first_name,
            last_name=account_data.last_name,
            email=account_data.email,
            phone=account_data.phone,
            address=account_data.address,
            created_by=created_by
        )
        
        # Create account and contractor profile
        try:
            # Convert account to dict and ensure proper types for MongoDB
            account_dict = account.dict()
            # Insert base account
            result = await self.collection.insert_one(account_dict)
            
            # Create contractor profile (no portal fields)
            contractor_profile_data = account_data.profile_data or {}
            
            # Validate critical contractor fields for service matching
            services_offered = contractor_profile_data.get('services_offered', [])
            if not services_offered or len(services_offered) == 0:
                raise ValueError("Contractor must have at least one service offered for job assignments")
            
            # Validate service types against known service mapping
            valid_services = ['plumbing', 'electrical', 'hvac', 'appliance_repair', 
                            'general_maintenance', 'cleaning', 'security']
            invalid_services = [s for s in services_offered if s not in valid_services]
            if invalid_services:
                raise ValueError(f"Invalid service types: {invalid_services}. Valid services: {valid_services}")
            
            contractor_profile = ContractorProfile(
                account_id=account.id,
                **contractor_profile_data
            )
            await self.contractor_profiles.insert_one(contractor_profile.dict())
            
        except Exception as e:
            # Clean up account if profile creation fails
            await self.collection.delete_one({"id": account.id})
            raise Exception(f"Contractor creation failed: {str(e)}")
        
        # Return response with profile data
        return await self.get_contractor_by_id(account.id)
    
    async def get_contractor_by_id(self, account_id: str) -> Optional[AccountResponse]:
        """Get contractor by ID with profile data"""
        # Get base account
        account_doc = await self.collection.find_one({
            "id": account_id,
            "account_type": AccountType.CONTRACTOR
        })
        if not account_doc:
            return None
        
        # Remove MongoDB _id field, keep our UUID id
        account_doc.pop("_id", None)
        
        # Get contractor profile data (no portal fields)
        profile_data = await self.contractor_profiles.find_one({"account_id": account_id})
        if profile_data:
            profile_data.pop("_id", None)  # Remove MongoDB ObjectId
        
        # Create response
        account_response = AccountResponse(**account_doc, profile_data=profile_data)
        return account_response
    
    async def get_contractors(
        self, 
        status: Optional[AccountStatus] = None,
        service_type: Optional[str] = None,
        available_only: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[AccountResponse]:
        """Get contractors filtered by optional criteria"""
        query = {
            "account_type": AccountType.CONTRACTOR,
            "is_archived": False
        }
        
        if status:
            query["status"] = status
        
        cursor = self.collection.find(query).skip(skip).limit(limit)
        contractors = []
        
        async for account_doc in cursor:
            # Remove MongoDB _id field, keep our UUID id
            account_doc.pop("_id", None)
            
            # Get contractor profile data
            profile_data = await self.contractor_profiles.find_one({"account_id": account_doc["id"]})
            if profile_data:
                profile_data.pop("_id", None)
            
            # Filter by service type if specified
            if service_type and profile_data:
                services_offered = profile_data.get("services_offered", [])
                if service_type not in services_offered:
                    continue
            
            # Filter by availability if specified
            if available_only and profile_data:
                if not profile_data.get("available", True):
                    continue
            
            account_response = AccountResponse(**account_doc, profile_data=profile_data)
            contractors.append(account_response)
        
        return contractors
    
    async def update_contractor(self, account_id: str, update_data: AccountUpdate, updated_by: str) -> Optional[AccountResponse]:
        """Update contractor account"""
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if update_dict:
            update_dict["updated_at"] = datetime.now(timezone.utc)
            update_dict["updated_by"] = updated_by
            
            result = await self.collection.update_one(
                {"id": account_id, "account_type": AccountType.CONTRACTOR},
                {"$set": update_dict}
            )
            
            if result.modified_count > 0:
                return await self.get_contractor_by_id(account_id)
        
        return None
    
    async def update_contractor_profile(self, account_id: str, profile_data: Dict[str, Any]) -> bool:
        """Update contractor profile data"""
        result = await self.contractor_profiles.update_one(
            {"account_id": account_id},
            {"$set": profile_data}
        )
        
        return result.modified_count > 0
    
    async def archive_contractor(self, account_id: str, archived_by: str) -> bool:
        """Archive a contractor (soft delete)"""
        result = await self.collection.update_one(
            {"id": account_id, "account_type": AccountType.CONTRACTOR},
            {"$set": {
                "is_archived": True,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": archived_by
            }}
        )
        
        return result.modified_count > 0
    
    async def get_contractors_by_service(self, service_type: str) -> List[AccountResponse]:
        """Get all contractors offering a specific service"""
        return await self.get_contractors(service_type=service_type)
    
    async def get_available_contractors(self) -> List[AccountResponse]:
        """Get all currently available contractors"""
        return await self.get_contractors(available_only=True)
    
    async def update_contractor_availability(self, account_id: str, available: bool) -> bool:
        """Update contractor availability status"""
        return await self.update_contractor_profile(account_id, {"available": available})
    
    async def update_contractor_rating(self, account_id: str, new_rating: float, completed_jobs: int) -> bool:
        """Update contractor rating and job completion count"""
        profile_updates = {
            "rating": new_rating,
            "completed_jobs": completed_jobs
        }
        return await self.update_contractor_profile(account_id, profile_updates)
    
    async def get_active_contracts_for_contractor(self, account_id: str) -> List[Dict[str, Any]]:
        """
        Get all active service contracts for a contractor with property details
        """
        current_datetime = datetime.now(timezone.utc)
        
        # Query active service contracts for this contractor
        contracts_cursor = self.db.contracts.find({
            "other_party_id": account_id,
            "contract_type": "service",
            "status": "active",
            "start_date": {"$lte": current_datetime},
            "$or": [
                {"end_date": {"$gte": current_datetime}},
                {"end_date": None}  # No end date means ongoing
            ],
            "is_archived": False
        })
        
        contracts = await contracts_cursor.to_list(length=None)
        
        # Enrich contracts with property details
        enriched_contracts = []
        for contract in contracts:
            # Remove MongoDB _id
            contract.pop("_id", None)
            
            # Get property details if property_id exists
            if contract.get("property_id"):
                property_doc = await self.db.properties.find_one({
                    "id": contract["property_id"],
                    "is_archived": False
                })
                
                if property_doc:
                    # Remove MongoDB _id from property
                    property_doc.pop("_id", None)
                    contract["property_details"] = property_doc
            
            enriched_contracts.append(contract)
        
        return enriched_contracts
    
    async def search_contractors_by_specialization(self, specialization: str) -> List[AccountResponse]:
        """Search contractors by their specializations"""
        # Get all contractors
        all_contractors = await self.get_contractors()
        
        # Filter by specialization
        matching_contractors = []
        for contractor in all_contractors:
            if contractor.profile_data:
                specializations = contractor.profile_data.get("specializations", [])
                if any(specialization.lower() in spec.lower() for spec in specializations):
                    matching_contractors.append(contractor)
        
        return matching_contractors