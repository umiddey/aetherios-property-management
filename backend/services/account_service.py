"""
Account Service - Business logic for unified account management
Handles CRUD operations and business rules for Tenants, Employees, and Contractors
"""

import secrets
import string
import re
from datetime import datetime
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
        # Generate portal code if needed
        portal_code = None
        if account_data.account_type == AccountType.TENANT:
            portal_code = self._generate_portal_code()
        
        # Create base account
        account = Account(
            account_type=account_data.account_type,
            first_name=account_data.first_name,
            last_name=account_data.last_name,
            email=account_data.email,
            phone=account_data.phone,
            address=account_data.address,
            company_id=account_data.company_id,
            created_by=created_by,
            portal_code=portal_code,
            portal_active=False  # Will be set to True when tenant activates via invitation
        )
        
        # Use MongoDB transaction to ensure atomicity
        async with await self.db.client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Insert account within transaction
                    result = await self.collection.insert_one(account.dict(), session=session)
                    account.id = str(result.inserted_id)
                    
                    # Create type-specific profile within same transaction
                    await self._create_profile(account.id, account_data.account_type, account_data.profile_data, session)
                    
                    # Transaction commits automatically if no exceptions
                    
                except Exception as e:
                    # Transaction automatically aborts on exception
                    raise Exception(f"Account creation failed: {str(e)}")
        
        # Return response with profile data (outside transaction)
        return await self.get_account_by_id(account.id)
    
    async def _create_profile(self, account_id: str, account_type: AccountType, profile_data: Dict[str, Any], session=None):
        """Create type-specific profile data with optional session for transactions"""
        if account_type == AccountType.TENANT:
            profile = TenantProfile(account_id=account_id, **profile_data)
            await self.tenant_profiles.insert_one(profile.dict(), session=session)
        elif account_type == AccountType.EMPLOYEE:
            profile = EmployeeProfile(account_id=account_id, **profile_data)
            await self.employee_profiles.insert_one(profile.dict(), session=session)
        elif account_type == AccountType.CONTRACTOR:
            profile = ContractorProfile(account_id=account_id, **profile_data)
            await self.contractor_profiles.insert_one(profile.dict(), session=session)
    
    async def get_account_by_id(self, account_id: str) -> Optional[AccountResponse]:
        """Get account by ID with profile data"""
        # Get base account
        account_doc = await self.collection.find_one({"_id": ObjectId(account_id)})
        if not account_doc:
            return None
        
        # Convert ObjectId to string
        account_doc["id"] = str(account_doc.pop("_id"))
        
        # Get profile data
        profile_data = await self._get_profile_data(account_id, account_doc["account_type"])
        
        # Create response
        account_response = AccountResponse(**account_doc, profile_data=profile_data)
        return account_response
    
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
    
    async def get_accounts_by_company(
        self, 
        company_id: str, 
        account_type: Optional[AccountType] = None,
        status: Optional[AccountStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AccountResponse]:
        """Get accounts filtered by company and optional criteria"""
        query = {"company_id": company_id, "is_archived": False}
        
        if account_type:
            query["account_type"] = account_type
        if status:
            query["status"] = status
        
        cursor = self.collection.find(query).skip(skip).limit(limit)
        accounts = []
        
        async for account_doc in cursor:
            account_doc["id"] = str(account_doc.pop("_id"))
            profile_data = await self._get_profile_data(account_doc["id"], account_doc["account_type"])
            account_response = AccountResponse(**account_doc, profile_data=profile_data)
            accounts.append(account_response)
        
        return accounts
    
    async def update_account(self, account_id: str, update_data: AccountUpdate, updated_by: str) -> Optional[AccountResponse]:
        """Update account with profile data"""
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            update_dict["updated_by"] = updated_by
            
            result = await self.collection.update_one(
                {"_id": ObjectId(account_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count > 0:
                return await self.get_account_by_id(account_id)
        
        return None
    
    async def update_profile(self, account_id: str, profile_data: Dict[str, Any]) -> bool:
        """Update profile data for an account"""
        # Get account to determine type
        account = await self.collection.find_one({"_id": ObjectId(account_id)})
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
    
    async def generate_portal_code(self, account_id: str) -> Optional[str]:
        """Generate a new portal access code for an account (invitation link)"""
        new_code = self._generate_portal_code()
        
        result = await self.collection.update_one(
            {"_id": ObjectId(account_id)},
            {"$set": {
                "portal_code": new_code,
                "portal_active": False,  # Will be set to True when user activates with password
                "updated_at": datetime.utcnow()
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
    
    async def validate_portal_access(self, portal_code: str, company_id: str) -> Optional[AccountResponse]:
        """Validate portal access and return account if valid"""
        account_doc = await self.collection.find_one({
            "portal_code": portal_code,
            "company_id": company_id,
            "portal_active": True,
            "status": AccountStatus.ACTIVE,
            "is_archived": False
        })
        
        if account_doc:
            # Update last login
            await self.collection.update_one(
                {"_id": account_doc["_id"]},
                {"$set": {"portal_last_login": datetime.utcnow()}}
            )
            
            # Return account response
            account_doc["id"] = str(account_doc.pop("_id"))
            profile_data = await self._get_profile_data(account_doc["id"], account_doc["account_type"])
            return AccountResponse(**account_doc, profile_data=profile_data)
        
        return None
    
    async def archive_account(self, account_id: str, archived_by: str) -> bool:
        """Archive an account (soft delete)"""
        result = await self.collection.update_one(
            {"_id": ObjectId(account_id)},
            {"$set": {
                "is_archived": True,
                "portal_active": False,  # Disable portal access
                "updated_at": datetime.utcnow(),
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
            company_id=tenant_migration.company_id,
            profile_data={
                "date_of_birth": tenant_data.get("date_of_birth"),
                "gender": tenant_data.get("gender"),
                "bank_account": tenant_data.get("bank_account"),
                "notes": tenant_data.get("notes")
            }
        )
        
        return await self.create_account(account_create, tenant_migration.created_by)
    
    async def get_tenant_accounts(self, company_id: str) -> List[AccountResponse]:
        """Get all tenant accounts for backward compatibility"""
        return await self.get_accounts_by_company(
            company_id=company_id,
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
        company_id: str, 
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
            "company_id": company_id,
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
                account_doc["id"] = str(account_doc.pop("_id"))
                profile_data = await self._get_profile_data(account_doc["id"], account_doc["account_type"])
                account_response = AccountResponse(**account_doc, profile_data=profile_data)
                accounts.append(account_response)
        except Exception as e:
            # Log the error and return partial results on timeout
            print(f"Search timeout or error: {e}")
            # Return what we have so far instead of failing completely
            pass
        
        return accounts