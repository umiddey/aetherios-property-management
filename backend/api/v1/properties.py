from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import logging
from datetime import datetime

from models.property import PropertyCreate, PropertyUpdate, PropertyFilters
from services.property_service import PropertyService
from services.property_validation import PropertyValidationService, Jurisdiction
from dependencies import get_current_user, get_property_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/properties", tags=["properties"])

# Initialize validation service
validation_service = PropertyValidationService()

def get_validation_service():
    """Dependency to get property validation service"""
    return validation_service


@router.post("/")
async def create_property(
    property_data: PropertyCreate,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service),
    validator: PropertyValidationService = Depends(get_validation_service)
):
    """Create a new property with German legal compliance validation."""
    try:
        # German legal compliance validation
        jurisdiction = Jurisdiction.GERMANY  # Default to Germany for now
        
        # Validate energy certificate (mandatory for marketing)
        if property_data.energieausweis_type or property_data.energieausweis_class:
            energy_result = validator.validate_energy_certificate(
                jurisdiction,
                property_data.energieausweis_type,
                property_data.energieausweis_expiry,
                property_data.energieausweis_class,
                property_data.energieausweis_value
            )
            if not energy_result.is_valid:
                raise HTTPException(status_code=400, detail=f"Energy certificate validation failed: {energy_result.message}")
            
            # Log warnings
            if energy_result.warning:
                logger.warning(f"Energy certificate warning for property {property_data.id}: {energy_result.message}")
        
        # Heating system validation moved to Technical Objects API
        
        # Validate marketing compliance if this is a rental property
        if property_data.rent_per_sqm and property_data.rent_per_sqm > 0:
            marketing_data = {
                "energieausweis_type": property_data.energieausweis_type,
                "energieausweis_class": property_data.energieausweis_class,
                "energieausweis_value": property_data.energieausweis_value
            }
            marketing_result = validator.validate_marketing_compliance(jurisdiction, marketing_data)
            if not marketing_result.is_valid:
                raise HTTPException(status_code=400, detail=f"Marketing compliance validation failed: {marketing_result.message}")
        
        # Create property if validation passes
        property_dict = await property_service.create_property(property_data, current_user.id)
        return property_dict
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"Error creating property: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to create property: {str(e)}")


@router.get("/")
async def get_properties(
    property_type: Optional[str] = Query(None),
    min_rooms: Optional[int] = Query(None),
    max_rooms: Optional[int] = Query(None),
    min_surface: Optional[float] = Query(None),
    max_surface: Optional[float] = Query(None),
    status: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    archived: Optional[bool] = Query(None),
    parent_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Get properties with optional filtering."""
    try:
        filters = PropertyFilters(
            property_type=property_type,
            min_rooms=min_rooms,
            max_rooms=max_rooms,
            min_surface=min_surface,
            max_surface=max_surface,
            status=status,
            city=city,
            archived=archived,
            parent_id=parent_id,
            search=search
        )
        
        properties = await property_service.get_properties_with_filters(
            filters, 
            skip=skip, 
            limit=limit
        )
        return properties
    except Exception as e:
        logger.error(f"Error fetching properties: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch properties")


@router.get("/{property_id}")
async def get_property(
    property_id: str,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Get a specific property by ID."""
    try:
        property_dict = await property_service.get_property_by_id(property_id)
        if not property_dict:
            raise HTTPException(status_code=404, detail="Property not found")
        return property_dict
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching property {property_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch property")


@router.put("/{property_id}")
async def update_property(
    property_id: str,
    property_data: PropertyUpdate,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service),
    validator: PropertyValidationService = Depends(get_validation_service)
):
    """Update a property with German legal compliance validation."""
    try:
        # German legal compliance validation for updated fields
        jurisdiction = Jurisdiction.GERMANY  # Default to Germany for now
        
        # Validate energy certificate if being updated
        if (property_data.energieausweis_type is not None or 
            property_data.energieausweis_class is not None or
            property_data.energieausweis_value is not None or
            property_data.energieausweis_expiry is not None):
            
            energy_result = validator.validate_energy_certificate(
                jurisdiction,
                property_data.energieausweis_type,
                property_data.energieausweis_expiry,
                property_data.energieausweis_class,
                property_data.energieausweis_value
            )
            if not energy_result.is_valid:
                raise HTTPException(status_code=400, detail=f"Energy certificate validation failed: {energy_result.message}")
            
            # Log warnings
            if energy_result.warning:
                logger.warning(f"Energy certificate warning for property {property_id}: {energy_result.message}")
        
        # Heating system validation moved to Technical Objects API
        
        # Update property if validation passes
        updated_property = await property_service.update_property(property_id, property_data)
        if not updated_property:
            raise HTTPException(status_code=404, detail="Property not found")
        return updated_property
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating property {property_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update property")


@router.delete("/{property_id}")
async def delete_property(
    property_id: str,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Delete a property."""
    try:
        success = await property_service.delete(property_id)
        if not success:
            raise HTTPException(status_code=404, detail="Property not found")
        return {"message": "Property deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting property {property_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete property")


@router.put("/{property_id}/archive")
async def archive_property(
    property_id: str,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Archive a property (soft delete)."""
    try:
        success = await property_service.archive(property_id)
        if not success:
            raise HTTPException(status_code=404, detail="Property not found")
        return {"message": "Property archived successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error archiving property {property_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to archive property")


@router.get("/{property_id}/children")
async def get_child_properties(
    property_id: str,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Get all child properties of a given parent property."""
    try:
        child_properties = await property_service.get_child_properties(property_id)
        return child_properties
    except Exception as e:
        logger.error(f"Error fetching child properties for {property_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch child properties")


@router.get("/type/{property_type}")
async def get_properties_by_type(
    property_type: str,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Get properties by type."""
    try:
        properties = await property_service.get_properties_by_type(property_type)
        return properties
    except Exception as e:
        logger.error(f"Error fetching properties by type {property_type}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch properties by type")


@router.get("/status/vacant")
async def get_vacant_properties(
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Get all vacant properties."""
    try:
        vacant_properties = await property_service.get_vacant_properties()
        return vacant_properties
    except Exception as e:
        logger.error(f"Error fetching vacant properties: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch vacant properties")


@router.get("/stats/overview")
async def get_property_stats(
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Get property statistics."""
    try:
        stats = await property_service.get_property_stats()
        return stats
    except Exception as e:
        logger.error(f"Error fetching property stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch property statistics")


@router.get("/parent-options/{property_type}")
async def get_parent_options(
    property_type: str,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Get valid parent properties for a given property type based on hierarchy rules."""
    try:
        parent_options = await property_service.get_valid_parent_properties(property_type)
        return parent_options
    except Exception as e:
        logger.error(f"Error fetching parent options for {property_type}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch parent options")