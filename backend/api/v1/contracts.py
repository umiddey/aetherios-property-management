from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from services.contract_service import ContractService
from models.contract import (
    Contract, ContractCreate, ContractUpdate, ContractResponse, 
    ContractType, ContractStatus
)
from utils.auth import get_current_user
from utils.dependencies import get_database

router = APIRouter()


@router.post("/contracts/", response_model=ContractResponse)
async def create_contract(
    contract_data: ContractCreate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create a new contract"""
    try:
        contract_service = ContractService(db)
        user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
        contract = await contract_service.create_contract(contract_data, user_id)
        return ContractResponse(**contract)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error creating contract: {str(e)}")


@router.get("/contracts/", response_model=List[ContractResponse])
async def get_contracts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    contract_type: Optional[ContractType] = Query(None),
    status: Optional[ContractStatus] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get contracts with optional filtering"""
    try:
        contract_service = ContractService(db)
        
        if search:
            contracts = await contract_service.search_contracts(search, skip, limit)
        elif contract_type:
            contracts = await contract_service.get_contracts_by_type(contract_type, skip, limit)
        elif status:
            contracts = await contract_service.get_contracts_by_status(status, skip, limit)
        else:
            contracts = await contract_service.get_all(query={"is_archived": False}, skip=skip, limit=limit)
        
        return [ContractResponse(**contract) for contract in contracts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contracts: {str(e)}")


@router.get("/contracts/{contract_id}", response_model=ContractResponse)
async def get_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get a specific contract by ID"""
    try:
        contract_service = ContractService(db)
        contract = await contract_service.get_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        return ContractResponse(**contract)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contract: {str(e)}")


@router.put("/contracts/{contract_id}", response_model=ContractResponse)
async def update_contract(
    contract_id: str,
    contract_data: ContractUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update a contract"""
    try:
        contract_service = ContractService(db)
        contract = await contract_service.update(contract_id, contract_data)
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        return ContractResponse(**contract)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating contract: {str(e)}")


@router.delete("/contracts/{contract_id}")
async def delete_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Delete (archive) a contract"""
    try:
        contract_service = ContractService(db)
        success = await contract_service.delete(contract_id)
        if not success:
            raise HTTPException(status_code=404, detail="Contract not found")
        return {"message": "Contract deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting contract: {str(e)}")


@router.get("/contracts/by-type/{contract_type}", response_model=List[ContractResponse])
async def get_contracts_by_type(
    contract_type: ContractType,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get contracts by type"""
    try:
        contract_service = ContractService(db)
        contracts = await contract_service.get_contracts_by_type(contract_type, skip, limit)
        return [ContractResponse(**contract) for contract in contracts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contracts by type: {str(e)}")


@router.get("/contracts/by-status/{status}", response_model=List[ContractResponse])
async def get_contracts_by_status(
    status: ContractStatus,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get contracts by status"""
    try:
        contract_service = ContractService(db)
        contracts = await contract_service.get_contracts_by_status(status, skip, limit)
        return [ContractResponse(**contract) for contract in contracts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contracts by status: {str(e)}")


@router.get("/contracts/expiring/{days_ahead}")
async def get_expiring_contracts(
    days_ahead: int,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get contracts expiring within specified days"""
    try:
        contract_service = ContractService(db)
        contracts = await contract_service.get_expiring_contracts(days_ahead)
        return [ContractResponse(**contract) for contract in contracts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching expiring contracts: {str(e)}")


@router.get("/contracts/by-entity/{entity_type}/{entity_id}")
async def get_contracts_by_entity(
    entity_type: str,
    entity_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get contracts related to a specific entity (property, tenant, user)"""
    try:
        contract_service = ContractService(db)
        contracts = await contract_service.get_contracts_by_related_entity(entity_type, entity_id)
        return [ContractResponse(**contract) for contract in contracts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contracts by entity: {str(e)}")


@router.put("/contracts/{contract_id}/status")
async def update_contract_status(
    contract_id: str,
    new_status: ContractStatus,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update contract status"""
    try:
        contract_service = ContractService(db)
        user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
        contract = await contract_service.update_contract_status(contract_id, new_status, user_id)
        return ContractResponse(**contract)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error updating contract status: {str(e)}")


@router.get("/contracts/search/{search_term}")
async def search_contracts(
    search_term: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Search contracts by title, description, or party names"""
    try:
        contract_service = ContractService(db)
        contracts = await contract_service.search_contracts(search_term, skip, limit)
        return [ContractResponse(**contract) for contract in contracts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching contracts: {str(e)}")


@router.get("/contracts/stats/summary")
async def get_contract_statistics(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get contract statistics for dashboard"""
    try:
        contract_service = ContractService(db)
        stats = await contract_service.get_contract_statistics()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contract statistics: {str(e)}")


@router.post("/contracts/auto-update-statuses")
async def auto_update_contract_statuses(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Auto-update contract statuses based on dates"""
    try:
        contract_service = ContractService(db)
        result = await contract_service.auto_update_contract_statuses()
        return {
            "message": "Contract statuses updated successfully",
            "activated": result["activated"],
            "expired": result["expired"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating contract statuses: {str(e)}")


# Additional endpoints for contract types metadata
@router.get("/contracts/types/list")
async def get_contract_types(
    current_user: dict = Depends(get_current_user)
):
    """Get list of available contract types"""
    return [
        {"value": "rental", "label": "Rental Contract"},
        {"value": "service", "label": "Service Contract"},
        {"value": "vendor", "label": "Vendor Contract"},
        {"value": "employment", "label": "Employment Contract"},
        {"value": "financial", "label": "Financial Contract"}
    ]


@router.get("/contracts/statuses/list")
async def get_contract_statuses(
    current_user: dict = Depends(get_current_user)
):
    """Get list of available contract statuses"""
    return [
        {"value": "draft", "label": "Draft"},
        {"value": "active", "label": "Active"},
        {"value": "expired", "label": "Expired"},
        {"value": "terminated", "label": "Terminated"},
        {"value": "pending", "label": "Pending"}
    ]


@router.post("/contracts/import-rental-agreements")
async def import_rental_agreements(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Import existing rental agreements as contracts"""
    try:
        contract_service = ContractService(db)
        result = await contract_service.import_rental_agreements()
        return {
            "message": "Rental agreements imported successfully",
            "imported": result["imported"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing rental agreements: {str(e)}")