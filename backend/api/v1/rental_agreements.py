from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging

from services.rental_agreement_service import RentalAgreementService
from models.rental_agreement import (
    RentalAgreement, 
    RentalAgreementCreate, 
    RentalAgreementUpdate, 
    RentalAgreementResponse,
    RentalAgreementFilters
)
from utils.auth import get_current_user
from utils.dependencies import get_database

logger = logging.getLogger(__name__)

router = APIRouter()

# Rental Agreement routes
@router.post("/rental-agreements/", response_model=RentalAgreementResponse)
async def create_rental_agreement(
    agreement_data: RentalAgreementCreate,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new rental agreement."""
    try:
        service = RentalAgreementService(db)
        agreement = await service.create_rental_agreement(agreement_data, current_user.id)
        return RentalAgreementResponse(**agreement)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating rental agreement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create rental agreement")

@router.get("/rental-agreements/", response_model=List[RentalAgreementResponse])
async def get_rental_agreements(
    property_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    is_archived: Optional[bool] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get rental agreements with optional filters."""
    try:
        service = RentalAgreementService(db)
        
        filters = {
            "property_id": property_id,
            "tenant_id": tenant_id,
            "is_active": is_active,
            "is_archived": is_archived
        }
        
        agreements = await service.get_rental_agreements(filters, offset=offset, limit=limit)
        return [RentalAgreementResponse(**agreement) for agreement in agreements]
    except Exception as e:
        logger.error(f"Error fetching rental agreements: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch rental agreements")

@router.get("/rental-agreements/{agreement_id}", response_model=RentalAgreementResponse)
async def get_rental_agreement(
    agreement_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific rental agreement by ID."""
    try:
        service = RentalAgreementService(db)
        agreement = await service.get_rental_agreement_by_id(agreement_id)
        
        if not agreement:
            raise HTTPException(status_code=404, detail="Rental agreement not found")
        
        return RentalAgreementResponse(**agreement)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching rental agreement {agreement_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch rental agreement")

@router.put("/rental-agreements/{agreement_id}", response_model=RentalAgreementResponse)
async def update_rental_agreement(
    agreement_id: str,
    agreement_data: RentalAgreementUpdate,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update a rental agreement."""
    try:
        service = RentalAgreementService(db)
        agreement = await service.update_rental_agreement(agreement_id, agreement_data)
        
        if not agreement:
            raise HTTPException(status_code=404, detail="Rental agreement not found")
        
        return RentalAgreementResponse(**agreement)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating rental agreement {agreement_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update rental agreement")

@router.delete("/rental-agreements/{agreement_id}")
async def delete_rental_agreement(
    agreement_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a rental agreement."""
    try:
        service = RentalAgreementService(db)
        success = await service.delete_rental_agreement(agreement_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Rental agreement not found")
        
        return {"message": "Rental agreement deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting rental agreement {agreement_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete rental agreement")

@router.get("/rental-agreements/property/{property_id}/active", response_model=List[RentalAgreementResponse])
async def get_active_agreements_for_property(
    property_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get active rental agreements for a specific property."""
    try:
        service = RentalAgreementService(db)
        agreements = await service.get_active_agreements_for_property(property_id)
        return [RentalAgreementResponse(**agreement) for agreement in agreements]
    except Exception as e:
        logger.error(f"Error fetching active agreements for property {property_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch active agreements")

@router.get("/rental-agreements/tenant/{tenant_id}", response_model=List[RentalAgreementResponse])
async def get_agreements_for_tenant(
    tenant_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get rental agreements for a specific tenant."""
    try:
        service = RentalAgreementService(db)
        agreements = await service.get_agreements_for_tenant(tenant_id)
        return [RentalAgreementResponse(**agreement) for agreement in agreements]
    except Exception as e:
        logger.error(f"Error fetching agreements for tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch tenant agreements")

@router.post("/rental-agreements/{agreement_id}/archive")
async def archive_rental_agreement(
    agreement_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Archive a rental agreement."""
    try:
        service = RentalAgreementService(db)
        success = await service.archive_rental_agreement(agreement_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Rental agreement not found")
        
        return {"message": "Rental agreement archived successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error archiving rental agreement {agreement_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to archive rental agreement")

@router.post("/rental-agreements/{agreement_id}/activate")
async def activate_rental_agreement(
    agreement_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Activate a rental agreement."""
    try:
        service = RentalAgreementService(db)
        success = await service.activate_rental_agreement(agreement_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Rental agreement not found")
        
        return {"message": "Rental agreement activated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating rental agreement {agreement_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to activate rental agreement")

@router.post("/rental-agreements/{agreement_id}/deactivate")
async def deactivate_rental_agreement(
    agreement_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Deactivate a rental agreement."""
    try:
        service = RentalAgreementService(db)
        success = await service.deactivate_rental_agreement(agreement_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Rental agreement not found")
        
        return {"message": "Rental agreement deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating rental agreement {agreement_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to deactivate rental agreement")

@router.get("/rental-agreements/stats/summary")
async def get_rental_agreement_stats(
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get rental agreement statistics."""
    try:
        service = RentalAgreementService(db)
        stats = await service.get_rental_agreement_stats()
        return stats
    except Exception as e:
        logger.error(f"Error fetching rental agreement stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch rental agreement statistics")