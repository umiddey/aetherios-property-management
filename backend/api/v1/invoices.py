from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime
import logging

from services.invoice_service import InvoiceService
from models.invoice import Invoice, InvoiceCreate, InvoiceUpdate, InvoiceFilters, InvoiceStatus
from utils.auth import get_current_user
from utils.dependencies import get_invoice_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Create a new invoice."""
    try:
        
        # Create invoice
        result = await invoice_service.create_invoice(invoice_data, current_user.id)
        
        return {
            "message": "Invoice created successfully",
            "invoice": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=List[dict])
async def get_invoices(
    tenant_id: Optional[str] = Query(None),
    property_id: Optional[str] = Query(None),
    status: Optional[InvoiceStatus] = Query(None),
    archived: Optional[bool] = Query(False),
    overdue_only: Optional[bool] = Query(False),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    limit: Optional[int] = Query(100),
    offset: Optional[int] = Query(0),
    current_user = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Get invoices with optional filters."""
    try:
        
        # Create filters
        filters = InvoiceFilters(
            tenant_id=tenant_id,
            property_id=property_id,
            status=status,
            archived=archived,
            overdue_only=overdue_only,
            date_from=date_from,
            date_to=date_to
        )
        
        # Get invoices
        invoices = await invoice_service.get_invoices_with_filters(
            filters,
            limit=limit,
            offset=offset
        )
        
        return invoices
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invoices: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{invoice_id}", response_model=dict)
async def get_invoice(
    invoice_id: str,
    current_user = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Get a specific invoice by ID."""
    try:
        
        # Get invoice
        invoice = await invoice_service.get_invoice_by_id(invoice_id)
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return invoice
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invoice {invoice_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{invoice_id}", response_model=dict)
async def update_invoice(
    invoice_id: str,
    invoice_update: InvoiceUpdate,
    current_user = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Update an invoice."""
    try:
        
        # Update invoice
        result = await invoice_service.update_invoice(invoice_id, invoice_update)
        
        if not result:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return {
            "message": "Invoice updated successfully",
            "invoice": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating invoice {invoice_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: str,
    current_user = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Delete (archive) an invoice."""
    try:
        
        # Delete invoice
        success = await invoice_service.delete_invoice(invoice_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting invoice {invoice_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{invoice_id}/mark-paid", response_model=dict)
async def mark_invoice_paid(
    invoice_id: str,
    current_user = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Mark an invoice as paid."""
    try:
        
        # Mark as paid
        result = await invoice_service.mark_invoice_as_paid(invoice_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return {
            "message": "Invoice marked as paid",
            "invoice": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking invoice as paid {invoice_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{invoice_id}/mark-sent", response_model=dict)
async def mark_invoice_sent(
    invoice_id: str,
    current_user = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Mark an invoice as sent."""
    try:
        
        # Mark as sent
        result = await invoice_service.mark_invoice_as_sent(invoice_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return {
            "message": "Invoice marked as sent",
            "invoice": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking invoice as sent {invoice_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/overdue/list", response_model=List[dict])
async def get_overdue_invoices(
    current_user = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Get all overdue invoices."""
    try:
        
        # Get overdue invoices
        invoices = await invoice_service.get_overdue_invoices()
        
        return invoices
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting overdue invoices: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/stats/summary", response_model=dict)
async def get_invoice_stats(
    current_user = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Get invoice statistics."""
    try:
        
        # Get stats
        stats = await invoice_service.get_invoice_stats()
        
        return stats
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invoice stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/update-overdue", response_model=dict)
async def update_overdue_invoices(
    current_user = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Update overdue invoice statuses."""
    try:
        
        # Update overdue invoices
        count = await invoice_service.update_overdue_invoices()
        
        return {
            "message": f"Updated {count} invoices to overdue status",
            "updated_count": count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating overdue invoices: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/tenant/{tenant_id}/list", response_model=List[dict])
async def get_tenant_invoices(
    tenant_id: str,
    archived: Optional[bool] = Query(False),
    current_user = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Get all invoices for a specific tenant."""
    try:
        
        # Get tenant invoices
        invoices = await invoice_service.get_invoices_by_tenant(tenant_id, archived)
        
        return invoices
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tenant invoices: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/property/{property_id}/list", response_model=List[dict])
async def get_property_invoices(
    property_id: str,
    archived: Optional[bool] = Query(False),
    current_user = Depends(get_current_user),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Get all invoices for a specific property."""
    try:
        
        # Get property invoices
        invoices = await invoice_service.get_invoices_by_property(property_id, archived)
        
        return invoices
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting property invoices: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")