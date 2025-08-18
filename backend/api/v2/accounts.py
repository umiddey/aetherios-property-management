"""
Account API v2 - Unified account management endpoints
Replaces fragmented tenant/customer system with hierarchical account structure
"""

from typing import List, Optional, Dict, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.account import (
    Account, AccountType, AccountStatus, AccountCreate, AccountUpdate, AccountResponse,
    TenantProfile, EmployeeProfile, ContractorProfile, TenantAccountResponse,
    PortalCodeGenerate, PortalAccess, TenantMigration
)
from models.user import User
from services.account_service import AccountService
from services.tenant_service import TenantService
from utils.auth import get_current_user
from utils.dependencies import get_database

router = APIRouter(prefix="/api/v2/accounts", tags=["accounts-v2"])


def get_account_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> AccountService:
    """Dependency to get account service instance"""
    return AccountService(db)


def get_tenant_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> TenantService:
    """Dependency to get tenant service instance"""
    return TenantService(db)


@router.post("/", response_model=Union[AccountResponse, TenantAccountResponse], status_code=http_status.HTTP_201_CREATED)
async def create_account(
    account_data: AccountCreate,
    current_user: User = Depends(get_current_user),
    account_service: AccountService = Depends(get_account_service)
):
    """
    Create a new account (tenant, employee, or contractor)
    """
    try:
        account = await account_service.create_account(account_data, current_user.id)
        return account
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create account: {str(e)}"
        )


@router.get("/", response_model=List[Union[AccountResponse, TenantAccountResponse]])
async def get_accounts(
    account_type: Optional[AccountType] = Query(None, description="Filter by account type"),
    status: Optional[AccountStatus] = Query(None, description="Filter by account status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of records to return"),
    account_service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get accounts with filtering and search capabilities
    """
    try:
        if search:
            accounts = await account_service.search_accounts(
                search_term=search,
                account_type=account_type
            )
        else:
            accounts = await account_service.get_accounts(
                account_type=account_type,
                status=status,
                skip=skip,
                limit=limit
            )
        return accounts
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve accounts: {str(e)}"
        )


@router.get("/{account_id}", response_model=Union[AccountResponse, TenantAccountResponse])
async def get_account(
    account_id: str,
    account_service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific account by ID with profile data
    """
    account = await account_service.get_account_by_id(account_id)
    if not account:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    return account


@router.put("/{account_id}", response_model=Union[AccountResponse, TenantAccountResponse])
async def update_account(
    account_id: str,
    update_data: AccountUpdate,
    account_service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update account information
    """
    account = await account_service.update_account(account_id, update_data, current_user.id)
    if not account:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Account not found or no changes made"
        )
    return account


@router.put("/{account_id}/profile")
async def update_account_profile(
    account_id: str,
    profile_data: Dict[str, Any],
    account_service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update account profile data (tenant/employee/contractor specific)
    """
    success = await account_service.update_profile(account_id, profile_data)
    if not success:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Account not found or profile update failed"
        )
    return {"message": "Profile updated successfully"}


@router.delete("/{account_id}")
async def archive_account(
    account_id: str,
    account_service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user)
):
    """
    Archive an account (soft delete)
    """
    success = await account_service.archive_account(account_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    return {"message": "Account archived successfully"}


# Portal-Specific Endpoints
@router.post("/{account_id}/portal-code", response_model=Dict[str, str])
async def generate_portal_code(
    account_id: str,
    tenant_service: TenantService = Depends(get_tenant_service),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a new portal access code for a tenant account
    Routes to TenantService for proper domain separation
    """
    portal_code = await tenant_service.generate_portal_code(account_id)
    if not portal_code:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Tenant not found or code generation failed"
        )
    return {"portal_code": portal_code}


@router.post("/portal/validate", response_model=AccountResponse)
async def validate_portal_access(
    portal_access: PortalAccess,
    tenant_service: TenantService = Depends(get_tenant_service)
):
    """
    Validate portal access code and return tenant account information
    Used by customer portal for authentication - routes to TenantService
    """
    account = await tenant_service.validate_portal_access(
        portal_access.portal_code
    )
    if not account:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Invalid portal code or access denied"
        )
    return account


# Tenant-Specific Endpoints (Backward Compatibility)
@router.get("/tenants/", response_model=List[AccountResponse])
async def get_tenant_accounts(
    account_service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all tenant accounts - backward compatibility endpoint
    """
    return await account_service.get_tenant_accounts()


# Migration Endpoints
@router.post("/migrate/tenant", response_model=AccountResponse)
async def migrate_tenant_to_account(
    tenant_migration: TenantMigration,
    account_service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user)
):
    """
    Migrate existing tenant data to account system
    Used during the transition from old tenant model to new account system
    """
    try:
        account = await account_service.migrate_tenant_to_account(tenant_migration)
        return account
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Migration failed: {str(e)}"
        )


# Statistics and Analytics
@router.get("/stats")
async def get_account_statistics(
    account_service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get account statistics for dashboard
    """
    try:
        # Get counts by type
        tenants = await account_service.get_accounts(
            account_type=AccountType.TENANT
        )
        employees = await account_service.get_accounts(
            account_type=AccountType.EMPLOYEE
        )
        contractors = await account_service.get_accounts(
            account_type=AccountType.CONTRACTOR
        )
        
        # Portal usage stats
        active_portal_users = len([t for t in tenants if t.portal_active])
        
        return {
            "total_accounts": len(tenants) + len(employees) + len(contractors),
            "tenants": len(tenants),
            "employees": len(employees),
            "contractors": len(contractors),
            "active_portal_users": active_portal_users,
            "portal_adoption_rate": round(active_portal_users / max(len(tenants), 1) * 100, 2)
        }
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )


# Account Type-Specific Endpoints
@router.get("/types/{account_type}")
async def get_accounts_by_type(
    account_type: AccountType,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    account_service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get accounts filtered by specific type
    """
    return await account_service.get_accounts(
        account_type=account_type,
        skip=skip,
        limit=limit
    )


@router.get("/portal/active")
async def get_active_portal_users(
    account_service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all accounts with active portal access
    """
    tenants = await account_service.get_accounts(
        account_type=AccountType.TENANT
    )
    
    active_portal_users = [
        tenant for tenant in tenants 
        if tenant.portal_active and tenant.portal_code
    ]
    
    return active_portal_users


@router.get("/{account_id}/contracts")
async def get_account_contracts(
    account_id: str,
    account_service: AccountService = Depends(get_account_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all active contracts for an account with property details
    Used for service request contract selection and account management
    """
    try:
        contracts = await account_service.get_active_contracts_for_account(account_id)
        return contracts
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve account contracts: {str(e)}"
        )