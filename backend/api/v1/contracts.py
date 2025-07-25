from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from services.contract_service import ContractService
from services.contract_invoice_service import ContractInvoiceService
from services.invoice_service import InvoiceService
from models.contract import (
    Contract, ContractCreate, ContractUpdate, ContractResponse, 
    ContractType, ContractStatus, ContractBillingType
)
from models.invoice import Invoice
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
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Creating contract: {contract_data.title}, type: {contract_data.contract_type}")
        contract_service = ContractService(db)
        user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
        logger.info(f"User ID: {user_id}")
        
        contract = await contract_service.create_contract(contract_data, user_id)
        logger.info(f"Contract created successfully: {contract.get('id')}")
        return ContractResponse(**contract)
    except Exception as e:
        logger.error(f"Error creating contract: {str(e)}", exc_info=True)
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
    related_tenant_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get contracts with optional filtering"""
    try:
        contract_service = ContractService(db)
        
        # Auto-update contract statuses based on dates
        await contract_service.auto_update_contract_statuses()
        
        if search:
            contracts = await contract_service.search_contracts(search, skip, limit)
        elif related_tenant_id:
            contracts = await contract_service.get_contracts_by_related_entity("tenant", related_tenant_id)
        elif contract_type:
            contracts = await contract_service.get_contracts_by_type(contract_type, skip, limit)
        elif status:
            contracts = await contract_service.get_contracts_by_status(status, skip, limit)
        else:
            contracts = await contract_service.get_all(query={"is_archived": False}, skip=skip, limit=limit)
        
        # Apply additional filters if tenant filtering was used
        if related_tenant_id and contract_type:
            contracts = [c for c in contracts if c.get('contract_type') == contract_type]
        
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
        
        # Auto-update contract statuses based on dates
        await contract_service.auto_update_contract_statuses()
        
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
            "draft_updated": result["draft_updated"],
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


# NEW: Contract-based Invoice Generation Endpoints
@router.post("/contracts/{contract_id}/generate-invoice")
async def generate_invoice_from_contract(
    contract_id: str,
    override_amount: Optional[float] = Query(None),
    override_description: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Generate an invoice from a contract"""
    try:
        contract_service = ContractService(db)
        invoice_service = InvoiceService(db)
        contract_invoice_service = ContractInvoiceService(contract_service, invoice_service)
        
        user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
        
        invoice = await contract_invoice_service.generate_invoice_from_contract(
            contract_id=contract_id,
            created_by=user_id,
            override_amount=override_amount,
            override_description=override_description
        )
        
        return {"message": "Invoice generated successfully", "invoice_id": invoice["id"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating invoice: {str(e)}")


@router.post("/contracts/{contract_id}/setup-billing")
async def setup_contract_billing(
    contract_id: str,
    billing_type: ContractBillingType,
    billing_frequency: str = Query("monthly"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Configure a contract for automatic invoice generation"""
    try:
        contract_service = ContractService(db)
        invoice_service = InvoiceService(db)
        contract_invoice_service = ContractInvoiceService(contract_service, invoice_service)
        
        contract = await contract_invoice_service.setup_contract_billing(
            contract_id=contract_id,
            billing_type=billing_type,
            billing_frequency=billing_frequency
        )
        
        return {
            "message": "Contract billing configured successfully",
            "contract_id": contract.id,
            "billing_type": contract.billing_type,
            "billing_frequency": contract.billing_frequency,
            "next_billing_date": contract.next_billing_date
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting up contract billing: {str(e)}")


@router.post("/contracts/generate-recurring-invoices")
async def generate_recurring_invoices(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Generate all due recurring invoices (to be called by scheduled job)"""
    try:
        contract_service = ContractService(db)
        invoice_service = InvoiceService(db)
        contract_invoice_service = ContractInvoiceService(contract_service, invoice_service)
        
        user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
        
        invoices = await contract_invoice_service.generate_recurring_invoices(created_by=user_id)
        
        return {
            "message": f"Generated {len(invoices)} recurring invoices",
            "generated_count": len(invoices),
            "invoice_ids": [inv.id for inv in invoices]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recurring invoices: {str(e)}")


@router.get("/contracts/billing-types/list")
async def get_billing_types(
    current_user: dict = Depends(get_current_user)
):
    """Get list of available billing types"""
    return [
        {"value": "credit", "label": "Credit (Contractor receives payment)"},
        {"value": "debit", "label": "Debit (Customer pays for service)"},
        {"value": "recurring", "label": "Recurring (Auto-generated invoices)"},
        {"value": "one_time", "label": "One-time invoice"}
    ]


