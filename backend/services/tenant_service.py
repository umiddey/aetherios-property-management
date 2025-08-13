"""
Tenant Service - Business logic for tenant-specific operations
Handles CRUD operations and portal access for tenants only
"""

import secrets
import string
import re
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from bson import ObjectId

from models.account import (
    Account, AccountType, AccountStatus, AccountCreate, AccountUpdate, AccountResponse,
    TenantProfile
)


class TenantService:
    """Service layer for tenant management operations with portal access"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db["accounts"]  # Base account data
        self.tenant_profiles = db["tenant_profiles"]  # Tenant-specific data with portal fields
    
    async def create_tenant(self, account_data: AccountCreate, created_by: str) -> AccountResponse:
        """
        Create a new tenant account with portal code generation
        """
        # Generate portal code for tenant
        portal_code = self._generate_portal_code()
        
        # Create base account (no portal fields)
        account = Account(
            account_type=AccountType.TENANT,
            first_name=account_data.first_name,
            last_name=account_data.last_name,
            email=account_data.email,
            phone=account_data.phone,
            address=account_data.address,
            created_by=created_by
        )
        
        # Create account and tenant profile
        try:
            # Convert account to dict and ensure proper types for MongoDB
            account_dict = account.dict()
            # Insert base account
            result = await self.collection.insert_one(account_dict)
            
            # Create tenant profile with portal fields
            tenant_profile_data = account_data.profile_data or {}
            tenant_profile_data.update({
                "portal_code": portal_code,
                "portal_active": False,  # Will be set to True when tenant activates
                "portal_email": None,
                "portal_password_hash": None,
                "portal_last_login": None
            })
            
            tenant_profile = TenantProfile(
                account_id=account.id,
                **tenant_profile_data
            )
            await self.tenant_profiles.insert_one(tenant_profile.dict())
            
        except Exception as e:
            # Clean up account if profile creation fails
            await self.collection.delete_one({"id": account.id})
            raise Exception(f"Tenant creation failed: {str(e)}")
        
        # Return response with profile data
        return await self.get_tenant_by_id(account.id)
    
    async def get_tenant_by_id(self, account_id: str) -> Optional[AccountResponse]:
        """Get tenant by ID with profile data including portal fields"""
        # Get base account
        account_doc = await self.collection.find_one({
            "id": account_id,
            "account_type": AccountType.TENANT
        })
        if not account_doc:
            return None
        
        # Remove MongoDB _id field, keep our UUID id
        account_doc.pop("_id", None)
        
        # Get tenant profile data (includes portal fields)
        profile_data = await self.tenant_profiles.find_one({"account_id": account_id})
        if profile_data:
            profile_data.pop("_id", None)  # Remove MongoDB ObjectId
        
        # Create response
        account_response = AccountResponse(**account_doc, profile_data=profile_data)
        return account_response
    
    async def get_tenants(
        self, 
        status: Optional[AccountStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AccountResponse]:
        """Get tenants filtered by optional criteria"""
        query = {
            "account_type": AccountType.TENANT,
            "is_archived": False
        }
        
        if status:
            query["status"] = status
        
        cursor = self.collection.find(query).skip(skip).limit(limit)
        tenants = []
        
        async for account_doc in cursor:
            # Remove MongoDB _id field, keep our UUID id
            account_doc.pop("_id", None)
            
            # Get tenant profile data
            profile_data = await self.tenant_profiles.find_one({"account_id": account_doc["id"]})
            if profile_data:
                profile_data.pop("_id", None)
            
            account_response = AccountResponse(**account_doc, profile_data=profile_data)
            tenants.append(account_response)
        
        return tenants
    
    async def update_tenant(self, account_id: str, update_data: AccountUpdate, updated_by: str) -> Optional[AccountResponse]:
        """Update tenant account"""
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if update_dict:
            update_dict["updated_at"] = datetime.now(timezone.utc)
            update_dict["updated_by"] = updated_by
            
            result = await self.collection.update_one(
                {"id": account_id, "account_type": AccountType.TENANT},
                {"$set": update_dict}
            )
            
            if result.modified_count > 0:
                return await self.get_tenant_by_id(account_id)
        
        return None
    
    async def update_tenant_profile(self, account_id: str, profile_data: Dict[str, Any]) -> bool:
        """Update tenant profile data"""
        result = await self.tenant_profiles.update_one(
            {"account_id": account_id},
            {"$set": profile_data}
        )
        
        return result.modified_count > 0
    
    async def generate_portal_code(self, account_id: str) -> Optional[str]:
        """Generate a new portal access code for a tenant (invitation link)"""
        new_code = self._generate_portal_code()
        
        result = await self.tenant_profiles.update_one(
            {"account_id": account_id},
            {"$set": {
                "portal_code": new_code,
                "portal_active": False,  # Will be set to True when user activates with password
            }}
        )
        
        if result.modified_count > 0:
            return new_code
        return None
    
    def _generate_portal_code(self) -> str:
        """Generate a random 7-character alphanumeric portal code"""
        # Use URL-safe characters (no confusion between 0/O, 1/I, etc.)
        characters = string.ascii_uppercase + string.digits
        characters = characters.replace('0', '').replace('O', '').replace('1', '').replace('I', '')
        
        return ''.join(secrets.choice(characters) for _ in range(7))
    
    async def validate_portal_access(self, portal_code: str) -> Optional[AccountResponse]:
        """Validate portal access and return tenant if valid"""
        # Find tenant profile with portal code
        profile_doc = await self.tenant_profiles.find_one({
            "portal_code": portal_code,
            "portal_active": True
        })
        
        if not profile_doc:
            return None
        
        # Get corresponding account
        account_doc = await self.collection.find_one({
            "id": profile_doc["account_id"],
            "account_type": AccountType.TENANT,
            "status": AccountStatus.ACTIVE,
            "is_archived": False
        })
        
        if account_doc:
            # Update last login in profile
            await self.tenant_profiles.update_one(
                {"_id": profile_doc["_id"]},
                {"$set": {"portal_last_login": datetime.now(timezone.utc)}}
            )
            
            # Remove MongoDB _id fields
            account_doc.pop("_id", None)
            profile_doc.pop("_id", None)
            
            return AccountResponse(**account_doc, profile_data=profile_doc)
        
        return None
    
    async def get_tenant_by_portal_code(self, portal_code: str) -> Optional[AccountResponse]:
        """Get tenant by portal code (for validation during activation)"""
        # Find tenant profile with portal code
        profile_doc = await self.tenant_profiles.find_one({
            "portal_code": portal_code
        })
        
        if not profile_doc:
            return None
        
        # Get corresponding account
        account_doc = await self.collection.find_one({
            "id": profile_doc["account_id"],
            "account_type": AccountType.TENANT,
            "is_archived": False
        })
        
        if account_doc:
            # Remove MongoDB _id fields
            account_doc.pop("_id", None)
            profile_doc.pop("_id", None)
            
            return AccountResponse(**account_doc, profile_data=profile_doc)
        
        return None
    
    async def activate_portal_account(self, portal_code: str, email: Optional[str], password_hash: str) -> bool:
        """Activate portal account with email and password"""
        result = await self.tenant_profiles.update_one(
            {"portal_code": portal_code},
            {"$set": {
                "portal_active": True,
                "portal_email": email,
                "portal_password_hash": password_hash
            }}
        )
        
        return result.modified_count > 0
    
    async def archive_tenant(self, account_id: str, archived_by: str) -> bool:
        """Archive a tenant (soft delete)"""
        result = await self.collection.update_one(
            {"id": account_id, "account_type": AccountType.TENANT},
            {"$set": {
                "is_archived": True,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": archived_by
            }}
        )
        
        # Also disable portal access
        if result.modified_count > 0:
            await self.tenant_profiles.update_one(
                {"account_id": account_id},
                {"$set": {"portal_active": False}}
            )
        
        return result.modified_count > 0
    
    async def get_active_contracts_for_tenant(self, account_id: str) -> List[Dict[str, Any]]:
        """
        Get all active contracts for a tenant with property details
        Used for service request contract selection
        """
        current_datetime = datetime.now(timezone.utc)
        
        # Query active contracts for this tenant
        contracts_cursor = self.db.contracts.find({
            "other_party_id": account_id,
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