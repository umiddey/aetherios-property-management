"""
Account Service - Business logic for unified account management
Handles CRUD operations and business rules for Tenants, Employees, and Contractors
"""

import re
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from bson import ObjectId

from models.account import (
    Account, AccountType, AccountStatus, AccountCreate, AccountUpdate, AccountResponse,
    TenantProfile, EmployeeProfile, ContractorProfile,
    PortalCodeGenerate, TenantMigration
)
from services.base_service import BaseService


class AccountService:
    """Service layer for account management operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db["accounts"]
        self.tenant_profiles = db["tenant_profiles"]
        self.employee_profiles = db["employee_profiles"] 
        self.contractor_profiles = db["contractor_profiles"]
    
    # Note: Index creation moved to startup event in server.py for async compatibility
    
    async def create_account(self, account_data: AccountCreate, created_by: str) -> AccountResponse:
        """
        Create a new account with appropriate profile data
        """
        # Create base account (no portal fields - those are tenant-specific)
        account = Account(
            account_type=account_data.account_type,
            first_name=account_data.first_name,
            last_name=account_data.last_name,
            email=account_data.email,
            phone=account_data.phone,
            address=account_data.address,
            created_by=created_by
        )
        
        # Create account and profile (no transactions needed for standalone MongoDB)
        try:
            # Convert account to dict and ensure proper types for MongoDB
            account_dict = account.model_dump()
            # Insert account
            result = await self.collection.insert_one(account_dict)
            # The account.id is already set from the UUID generation
            
            # Create type-specific profile
            await self._create_profile(account.id, account_data.account_type, account_data.profile_data)
            
        except Exception as e:
            # Clean up account if profile creation fails
            await self.collection.delete_one({"id": account.id})
            raise Exception(f"Account creation failed: {str(e)}")
        
        # Return response with profile data (outside transaction)
        return await self.get_account_by_id(account.id)
    
    async def _create_profile(self, account_id: str, account_type: AccountType, profile_data: Dict[str, Any]):
        """Create type-specific profile data"""
        if account_type == AccountType.TENANT:
            profile = TenantProfile(account_id=account_id, **profile_data)
            await self.tenant_profiles.insert_one(profile.model_dump())
        elif account_type == AccountType.EMPLOYEE:
            profile = EmployeeProfile(account_id=account_id, **profile_data)
            await self.employee_profiles.insert_one(profile.model_dump())
        elif account_type == AccountType.CONTRACTOR:
            profile = ContractorProfile(account_id=account_id, **profile_data)
            await self.contractor_profiles.insert_one(profile.model_dump())
    
    def _build_account_response(self, account_doc: Dict[str, Any], profile_data: Optional[Dict[str, Any]]) -> AccountResponse:
        """Build appropriate AccountResponse type based on account type"""
        # For tenant accounts, merge portal data and return TenantAccountResponse
        if account_doc["account_type"] == AccountType.TENANT:
            # Import here to avoid circular imports
            from models.account import TenantAccountResponse
            
            # Merge portal fields from profile_data if available
            portal_fields = {}
            if profile_data:
                portal_fields = {
                    "portal_code": profile_data.get("portal_code"),
                    "portal_active": profile_data.get("portal_active", False),
                    "portal_last_login": profile_data.get("portal_last_login")
                }
            
            return TenantAccountResponse(**account_doc, profile_data=profile_data, **portal_fields)
        
        # For employee/contractor accounts, return basic AccountResponse
        return AccountResponse(**account_doc, profile_data=profile_data)

    async def get_account_by_id(self, account_id: str) -> Optional[AccountResponse]:
        """Get account by ID with profile data"""
        # Get base account using our UUID id field (not MongoDB _id)
        account_doc = await self.collection.find_one({"id": account_id})
        if not account_doc:
            return None
        
        # Remove MongoDB _id field, keep our UUID id
        account_doc.pop("_id", None)
        
        # Get profile data
        profile_data = await self._get_profile_data(account_id, account_doc["account_type"])
        
        # Use centralized response builder
        return self._build_account_response(account_doc, profile_data)
    
    async def _get_profile_data(self, account_id: str, account_type: str) -> Optional[Dict[str, Any]]:
        """Get profile data based on account type"""
        if account_type == AccountType.TENANT:
            profile = await self.tenant_profiles.find_one({"account_id": account_id})
        elif account_type == AccountType.EMPLOYEE:
            profile = await self.employee_profiles.find_one({"account_id": account_id})
        elif account_type == AccountType.CONTRACTOR:
            profile = await self.contractor_profiles.find_one({"account_id": account_id})
        else:
            return None
        
        if profile:
            profile.pop("_id", None)  # Remove MongoDB ObjectId
            return profile
        return None
    
    async def get_accounts(
        self, 
        account_type: Optional[AccountType] = None,
        status: Optional[AccountStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AccountResponse]:
        """Get accounts filtered by optional criteria"""
        query = {"is_archived": False}
        
        if account_type:
            query["account_type"] = account_type
        if status:
            query["status"] = status
        
        cursor = self.collection.find(query).skip(skip).limit(limit)
        accounts = []
        
        async for account_doc in cursor:
            # Remove MongoDB _id field, keep our UUID id
            account_doc.pop("_id", None)
            
            profile_data = await self._get_profile_data(account_doc["id"], account_doc["account_type"])
            
            # Use centralized response builder
            account_response = self._build_account_response(account_doc, profile_data)
            accounts.append(account_response)
        
        return accounts
    
    async def update_account(self, account_id: str, update_data: AccountUpdate, updated_by: str) -> Optional[AccountResponse]:
        """Update account with profile data"""
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        if update_dict:
            update_dict["updated_at"] = datetime.now(timezone.utc)
            update_dict["updated_by"] = updated_by
            
            result = await self.collection.update_one(
                {"id": account_id},
                {"$set": update_dict}
            )
            
            if result.modified_count > 0:
                return await self.get_account_by_id(account_id)
        
        return None
    
    async def update_profile(self, account_id: str, profile_data: Dict[str, Any]) -> bool:
        """Update profile data for an account"""
        # Get account to determine type
        account = await self.collection.find_one({"id": account_id})
        if not account:
            return False
        
        account_type = account["account_type"]
        
        # Update appropriate profile collection
        if account_type == AccountType.TENANT:
            collection = self.tenant_profiles
        elif account_type == AccountType.EMPLOYEE:
            collection = self.employee_profiles
        elif account_type == AccountType.CONTRACTOR:
            collection = self.contractor_profiles
        else:
            return False
        
        result = await collection.update_one(
            {"account_id": account_id},
            {"$set": profile_data}
        )
        
        return result.modified_count > 0
    
    
    async def archive_account(self, account_id: str, archived_by: str) -> bool:
        """Archive an account (soft delete)"""
        result = await self.collection.update_one(
            {"id": account_id},
            {"$set": {
                "is_archived": True,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": archived_by
            }}
        )
        
        return result.modified_count > 0
    
    async def migrate_tenant_to_account(self, tenant_migration: TenantMigration) -> AccountResponse:
        """
        Migrate existing tenant data to the new account system
        Used during the transition period
        """
        tenant_data = tenant_migration.tenant_data
        
        # Create account from tenant data
        account_create = AccountCreate(
            account_type=AccountType.TENANT,
            first_name=tenant_data.get("first_name", ""),
            last_name=tenant_data.get("last_name", ""),
            email=tenant_data.get("email", ""),
            phone=tenant_data.get("phone"),
            address=tenant_data.get("address"),
            profile_data={
                "date_of_birth": tenant_data.get("date_of_birth"),
                "gender": tenant_data.get("gender"),
                "bank_account": tenant_data.get("bank_account"),
                "notes": tenant_data.get("notes")
            }
        )
        
        return await self.create_account(account_create, tenant_migration.created_by)
    
    async def get_tenant_accounts(self) -> List[AccountResponse]:
        """Get all tenant accounts for backward compatibility"""
        return await self.get_accounts(
            account_type=AccountType.TENANT,
            status=AccountStatus.ACTIVE
        )
    
    def _sanitize_search_term(self, search_term: str) -> str:
        """
        Sanitize search term to prevent ReDoS attacks
        - Limits length to prevent excessive processing
        - Escapes regex metacharacters
        - Removes potentially dangerous patterns
        """
        if not search_term or not isinstance(search_term, str):
            return ""
        
        # Limit search term length to prevent excessive processing
        search_term = search_term[:100]
        
        # Escape regex metacharacters to prevent ReDoS
        # This treats the search term as literal text
        escaped_term = re.escape(search_term.strip())
        
        return escaped_term
    
    async def search_accounts(
        self, 
        search_term: str,
        account_type: Optional[AccountType] = None
    ) -> List[AccountResponse]:
        """
        Search accounts by name or email with ReDoS protection
        Uses sanitized search terms and MongoDB timeout to prevent attacks
        """
        # Sanitize search term to prevent ReDoS attacks
        sanitized_term = self._sanitize_search_term(search_term)
        
        # Return empty results for empty search terms
        if not sanitized_term:
            return []
        
        query = {
            "is_archived": False,
            "$or": [
                {"first_name": {"$regex": sanitized_term, "$options": "i"}},
                {"last_name": {"$regex": sanitized_term, "$options": "i"}},
                {"email": {"$regex": sanitized_term, "$options": "i"}}
            ]
        }
        
        if account_type:
            query["account_type"] = account_type
        
        # Add timeout protection and limit results
        cursor = self.collection.find(query).limit(50).max_time_ms(5000)
        accounts = []
        
        try:
            async for account_doc in cursor:
                # Remove MongoDB _id field, keep our UUID id
                account_doc.pop("_id", None)
                
                
                profile_data = await self._get_profile_data(account_doc["id"], account_doc["account_type"])
                account_response = AccountResponse(**account_doc, profile_data=profile_data)
                accounts.append(account_response)
        except Exception as e:
            # Log the error and return partial results on timeout
            print(f"Search timeout or error: {e}")
            # Return what we have so far instead of failing completely
            pass
        
        return accounts

    async def get_active_contracts_for_account(self, account_id: str) -> List[Dict[str, Any]]:
        """
        Get all active contracts for an account with property details
        Used for service request contract selection and account detail pages
        """
        current_datetime = datetime.now(timezone.utc)
        
        # Query active contracts for this account
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