from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import logging

from models.furnished_item import FurnishedItemCreate, FurnishedItemUpdate, FurnishedItemFilters
from services.property_service import PropertyService
from utils.auth import get_current_user
from utils.dependencies import get_property_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/furnished-items", tags=["furnished-items"])


@router.post("/")
async def create_furnished_item(
    item_data: FurnishedItemCreate,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Create a new furnished item for a property."""
    try:
        item_dict = await property_service.create_furnished_item(item_data, current_user.id)
        return item_dict
    except Exception as e:
        logger.error(f"Error creating furnished item: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to create furnished item: {str(e)}")


@router.get("/")
async def get_furnished_items(
    property_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
    ownership: Optional[str] = Query(None),
    is_essential: Optional[bool] = Query(None),
    is_active: Optional[bool] = Query(True),
    search: Optional[str] = Query(None),
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Get furnished items with optional filtering."""
    try:
        filters = FurnishedItemFilters(
            property_id=property_id,
            category=category,
            condition=condition,
            ownership=ownership,
            is_essential=is_essential,
            is_active=is_active,
            search=search
        )
        
        items = await property_service.get_furnished_items_with_filters(filters)
        return items
    except Exception as e:
        logger.error(f"Error getting furnished items: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get furnished items: {str(e)}")


@router.get("/property/{property_id}")
async def get_furnished_items_by_property(
    property_id: str,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Get all furnished items for a specific property."""
    try:
        items = await property_service.get_furnished_items_by_property(property_id)
        return items
    except Exception as e:
        logger.error(f"Error getting furnished items for property {property_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get furnished items: {str(e)}")


@router.get("/{item_id}")
async def get_furnished_item(
    item_id: str,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Get a specific furnished item by ID."""
    try:
        item = await property_service.get_furnished_item_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Furnished item not found")
        return item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting furnished item {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get furnished item: {str(e)}")


@router.put("/{item_id}")
async def update_furnished_item(
    item_id: str,
    update_data: FurnishedItemUpdate,
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Update a furnished item."""
    try:
        updated_item = await property_service.update_furnished_item(item_id, update_data)
        if not updated_item:
            raise HTTPException(status_code=404, detail="Furnished item not found")
        return updated_item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating furnished item {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update furnished item: {str(e)}")


@router.delete("/{item_id}")
async def delete_furnished_item(
    item_id: str,
    property_id: str = Query(..., description="Property ID that owns this item"),
    current_user = Depends(get_current_user),
    property_service: PropertyService = Depends(get_property_service)
):
    """Delete a furnished item (soft delete)."""
    try:
        success = await property_service.delete_furnished_item(item_id, property_id)
        if not success:
            raise HTTPException(status_code=404, detail="Furnished item not found")
        return {"message": "Furnished item deleted successfully", "item_id": item_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting furnished item {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete furnished item: {str(e)}")