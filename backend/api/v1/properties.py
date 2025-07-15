from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import logging

from models.property import PropertyCreate, PropertyUpdate, PropertyFilters
from services.property_service import PropertyService
from dependencies import get_current_user, get_property_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/properties", tags=["properties"])


@router.post("/")
async def create_property(
    property_data: PropertyCreate,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Create a new property."""
    try:
        property_dict = await property_service.create_property(property_data, current_user.id)
        return property_dict
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
    property_service: PropertyService = Depends(get_property_service)
):
    """Update a property."""
    try:
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