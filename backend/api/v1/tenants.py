from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime
import logging

from services.accounts.tenant_service import TenantService
from models.tenant import Tenant, TenantCreate, TenantUpdate, TenantFilters
from utils.auth import get_current_user
from utils.dependencies import get_tenant_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    current_user = Depends(get_current_user),
    tenant_service: TenantService = Depends(get_tenant_service)
):
    """Create a new tenant."""
    try:
        # Create tenant
        result = await tenant_service.create_tenant(tenant_data, current_user.id)
        
        return {
            "message": "Tenant created successfully",
            "tenant": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating tenant: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=List[dict])
async def get_tenants(
    archived: Optional[bool] = Query(False),
    gender: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(100),
    offset: Optional[int] = Query(0),
    current_user = Depends(get_current_user),
    tenant_service: TenantService = Depends(get_tenant_service)
):
    """Get tenants with optional filters."""
    try:
        
        # Create filters
        filters = TenantFilters(
            archived=archived,
            gender=gender,
            search=search
        )
        
        # Get tenants
        tenants = await tenant_service.get_tenants_with_filters(
            filters,
            limit=limit,
            offset=offset
        )
        
        return tenants
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tenants: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{tenant_id}", response_model=dict)
async def get_tenant(
    tenant_id: str,
    current_user = Depends(get_current_user),
    tenant_service: TenantService = Depends(get_tenant_service)
):
    """Get a specific tenant by ID."""
    try:
        
        # Get tenant
        tenant = await tenant_service.get_tenant_by_id(tenant_id)
        
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        return tenant
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{tenant_id}", response_model=dict)
async def update_tenant(
    tenant_id: str,
    tenant_update: TenantUpdate,
    current_user = Depends(get_current_user),
    tenant_service: TenantService = Depends(get_tenant_service)
):
    """Update a tenant."""
    try:
        
        # Update tenant
        result = await tenant_service.update_tenant(tenant_id, tenant_update)
        
        if not result:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        return {
            "message": "Tenant updated successfully",
            "tenant": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: str,
    current_user = Depends(get_current_user),
    tenant_service: TenantService = Depends(get_tenant_service)
):
    """Delete (archive) a tenant."""
    try:
        
        # Delete tenant
        success = await tenant_service.delete_tenant(tenant_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{tenant_id}/stats", response_model=dict)
async def get_tenant_stats(
    current_user = Depends(get_current_user),
    tenant_service: TenantService = Depends(get_tenant_service)
):
    """Get tenant statistics."""
    try:
        
        # Get stats
        stats = await tenant_service.get_tenant_stats()
        
        return stats
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tenant stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/search/{search_term}", response_model=List[dict])
async def search_tenants(
    search_term: str,
    archived: Optional[bool] = Query(False),
    current_user = Depends(get_current_user),
    tenant_service: TenantService = Depends(get_tenant_service)
):
    """Search tenants by name or email."""
    try:
        
        # Search tenants
        tenants = await tenant_service.search_tenants(search_term, archived)
        
        return tenants
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching tenants: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")