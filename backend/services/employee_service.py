"""
Employee Service - Business logic for employee-specific operations
Handles CRUD operations for employees only (no portal access)
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from models.account import (
    Account, AccountType, AccountStatus, AccountCreate, AccountUpdate, AccountResponse,
    EmployeeProfile
)


class EmployeeService:
    """Service layer for employee management operations (no portal access)"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db["accounts"]  # Base account data
        self.employee_profiles = db["employee_profiles"]  # Employee-specific data (no portal fields)
    
    async def create_employee(self, account_data: AccountCreate, created_by: str) -> AccountResponse:
        """
        Create a new employee account
        """
        # Create base account (no portal fields)
        account = Account(
            account_type=AccountType.EMPLOYEE,
            first_name=account_data.first_name,
            last_name=account_data.last_name,
            email=account_data.email,
            phone=account_data.phone,
            address=account_data.address,
            created_by=created_by
        )
        
        # Create account and employee profile
        try:
            # Convert account to dict and ensure proper types for MongoDB
            account_dict = account.dict()
            # Insert base account
            result = await self.collection.insert_one(account_dict)
            
            # Create employee profile (no portal fields)
            employee_profile_data = account_data.profile_data or {}
            
            employee_profile = EmployeeProfile(
                account_id=account.id,
                **employee_profile_data
            )
            await self.employee_profiles.insert_one(employee_profile.dict())
            
        except Exception as e:
            # Clean up account if profile creation fails
            await self.collection.delete_one({"id": account.id})
            raise Exception(f"Employee creation failed: {str(e)}")
        
        # Return response with profile data
        return await self.get_employee_by_id(account.id)
    
    async def get_employee_by_id(self, account_id: str) -> Optional[AccountResponse]:
        """Get employee by ID with profile data"""
        # Get base account
        account_doc = await self.collection.find_one({
            "id": account_id,
            "account_type": AccountType.EMPLOYEE
        })
        if not account_doc:
            return None
        
        # Remove MongoDB _id field, keep our UUID id
        account_doc.pop("_id", None)
        
        # Get employee profile data (no portal fields)
        profile_data = await self.employee_profiles.find_one({"account_id": account_id})
        if profile_data:
            profile_data.pop("_id", None)  # Remove MongoDB ObjectId
        
        # Create response
        account_response = AccountResponse(**account_doc, profile_data=profile_data)
        return account_response
    
    async def get_employees(
        self, 
        status: Optional[AccountStatus] = None,
        department: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AccountResponse]:
        """Get employees filtered by optional criteria"""
        query = {
            "account_type": AccountType.EMPLOYEE,
            "is_archived": False
        }
        
        if status:
            query["status"] = status
        
        cursor = self.collection.find(query).skip(skip).limit(limit)
        employees = []
        
        async for account_doc in cursor:
            # Remove MongoDB _id field, keep our UUID id
            account_doc.pop("_id", None)
            
            # Get employee profile data
            profile_data = await self.employee_profiles.find_one({"account_id": account_doc["id"]})
            if profile_data:
                profile_data.pop("_id", None)
            
            # Filter by department if specified
            if department and profile_data and profile_data.get("department") != department:
                continue
            
            account_response = AccountResponse(**account_doc, profile_data=profile_data)
            employees.append(account_response)
        
        return employees
    
    async def update_employee(self, account_id: str, update_data: AccountUpdate, updated_by: str) -> Optional[AccountResponse]:
        """Update employee account"""
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if update_dict:
            update_dict["updated_at"] = datetime.now(timezone.utc)
            update_dict["updated_by"] = updated_by
            
            result = await self.collection.update_one(
                {"id": account_id, "account_type": AccountType.EMPLOYEE},
                {"$set": update_dict}
            )
            
            if result.modified_count > 0:
                return await self.get_employee_by_id(account_id)
        
        return None
    
    async def update_employee_profile(self, account_id: str, profile_data: Dict[str, Any]) -> bool:
        """Update employee profile data"""
        result = await self.employee_profiles.update_one(
            {"account_id": account_id},
            {"$set": profile_data}
        )
        
        return result.modified_count > 0
    
    async def archive_employee(self, account_id: str, archived_by: str) -> bool:
        """Archive an employee (soft delete)"""
        result = await self.collection.update_one(
            {"id": account_id, "account_type": AccountType.EMPLOYEE},
            {"$set": {
                "is_archived": True,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": archived_by
            }}
        )
        
        return result.modified_count > 0
    
    async def get_employees_by_department(self, department: str) -> List[AccountResponse]:
        """Get all employees in a specific department"""
        return await self.get_employees(department=department)
    
    async def get_employee_by_employee_id(self, employee_id: str) -> Optional[AccountResponse]:
        """Get employee by their employee_id field"""
        # Find employee profile with this employee_id
        profile_doc = await self.employee_profiles.find_one({"employee_id": employee_id})
        if not profile_doc:
            return None
        
        # Get the account using the account_id from profile
        return await self.get_employee_by_id(profile_doc["account_id"])
    
    async def get_active_contracts_for_employee(self, account_id: str) -> List[Dict[str, Any]]:
        """
        Get all active employment contracts for an employee
        """
        current_datetime = datetime.now(timezone.utc)
        
        # Query active employment contracts for this employee
        contracts_cursor = self.db.contracts.find({
            "other_party_id": account_id,
            "contract_type": "employment",
            "status": "active",
            "start_date": {"$lte": current_datetime},
            "$or": [
                {"end_date": {"$gte": current_datetime}},
                {"end_date": None}  # No end date means ongoing
            ],
            "is_archived": False
        })
        
        contracts = await contracts_cursor.to_list(length=None)
        
        # Remove MongoDB _id from contracts
        for contract in contracts:
            contract.pop("_id", None)
        
        return contracts