"""
Service Request API - Customer Portal Maintenance Request Endpoints
Provides REST API for service request management with tenant isolation
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Query, UploadFile, File
from pymongo.database import Database

from models.service_request import (
    ServiceRequest,
    ServiceRequestCreate,
    ServiceRequestUpdate,
    ServiceRequestResponse,
    ServiceRequestSummary,
    ServiceRequestStats,
    PortalServiceRequestCreate,
    PortalServiceRequestResponse,
    FileUploadResponse,
    ServiceRequestType,
    ServiceRequestPriority,
    ServiceRequestStatus,
    ServiceRequestApprovalStatus,
    ServiceRequestApproval
)
from dependencies import get_current_user, get_portal_user, db
from services.service_request_service import ServiceRequestService

router = APIRouter(prefix="/service-requests", tags=["service-requests"])
public_router = APIRouter(prefix="/service-requests", tags=["service-requests-public"])

# Export both routers
__all__ = ["router", "public_router"]


# Initialize service request service
def get_service_request_service() -> ServiceRequestService:
    """Dependency to get service request service instance"""
    return ServiceRequestService(db)


# Admin/ERP System Endpoints (Full Access)
@router.post("/", response_model=ServiceRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_service_request(
    request: ServiceRequestCreate,
    current_user=Depends(get_current_user),
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """
    Create a new service request (Admin/ERP interface)
    
    This endpoint is used by property managers to create service requests on behalf of tenants
    or for internal maintenance scheduling.
    """
    try:
        # Validate that tenant and property exist and are associated
        await service.validate_tenant_property_association(request.tenant_id, request.property_id)
        
        # Create the service request
        service_request = await service.create_service_request(request, current_user["id"])
        
        return service_request
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create service request")


@router.get("/", response_model=List[ServiceRequestSummary])
async def get_service_requests(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of records to return"),
    status_filter: Optional[ServiceRequestStatus] = Query(None, description="Filter by status"),
    priority_filter: Optional[ServiceRequestPriority] = Query(None, description="Filter by priority"),
    type_filter: Optional[ServiceRequestType] = Query(None, description="Filter by request type"),
    property_id: Optional[str] = Query(None, description="Filter by property"),
    tenant_id: Optional[str] = Query(None, description="Filter by tenant"),
    current_user=Depends(get_current_user),
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """
    Get service requests with filtering and pagination (Admin/ERP interface)
    
    Supports filtering by status, priority, type, property, and tenant.
    Results are paginated for performance.
    """
    try:
        filters = {}
        if status_filter:
            filters["status"] = status_filter
        if priority_filter:
            filters["priority"] = priority_filter
        if type_filter:
            filters["request_type"] = type_filter
        if property_id:
            filters["property_id"] = property_id
        if tenant_id:
            filters["tenant_id"] = tenant_id
            
        print(f"🔍 DEBUG API - Current user: {current_user}")
        print(f"🔍 DEBUG API - Filters: {filters}")
        
        service_requests = await service.get_service_requests_with_filters(
            filters=filters,
            skip=skip,
            limit=limit,
            user_role=getattr(current_user, "role", "user"),
            user_id=current_user.id
        )
        
        print(f"🔍 DEBUG API - Service returned {len(service_requests)} requests")
        return service_requests
    except Exception as e:
        print(f"❌ DEBUG API - Exception in get_service_requests: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to retrieve service requests: {str(e)}")


# Property Manager Approval Endpoints - MUST COME BEFORE /{request_id} ROUTE
@router.get("/pending-approval", response_model=List[ServiceRequestSummary])
async def get_pending_approval_requests(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of records to return"),
    current_user=Depends(get_current_user),
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """
    Get service requests that are pending property manager approval
    
    This endpoint returns all service requests that require property manager approval
    before contractor workflow can be triggered.
    """
    try:
        print(f"🔍 API: get_pending_approval_requests called")
        print(f"🔍 API: current_user = {current_user}")
        print(f"🔍 API: user role = {getattr(current_user, 'role', 'user')}")
        print(f"🔍 API: user id = {current_user.id}")
        
        pending_requests = await service.get_pending_approval_requests(
            skip=skip,
            limit=limit,
            user_role=getattr(current_user, "role", "user"),
            user_id=current_user.id
        )
        
        print(f"🔍 API: returning {len(pending_requests)} pending requests")
        return pending_requests
    except Exception as e:
        print(f"❌ ERROR - Failed to get pending approval requests: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve pending approval requests")


@router.get("/{request_id}", response_model=ServiceRequestResponse)
async def get_service_request(
    request_id: str,
    current_user=Depends(get_current_user),
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """Get specific service request by ID (Admin/ERP interface)"""
    try:
        service_request = await service.get_service_request_by_id(request_id, getattr(current_user, "role", "user"))
        
        if not service_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
            
        return service_request
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve service request")


@router.put("/{request_id}/status", response_model=ServiceRequestResponse)
async def update_service_request_status(
    request_id: str,
    update: ServiceRequestUpdate,
    current_user=Depends(get_current_user),
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """
    Update service request status and details (Admin only)
    
    Used by property managers to update request status, assign staff, 
    add internal notes, and set completion estimates.
    """
    try:
        # Only admins and super_admins can update service requests
        if getattr(current_user, "role", "user") not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Insufficient permissions to update service requests"
            )
        
        service_request = await service.update_service_request(request_id, update, current_user["id"])
        
        if not service_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
            
        return service_request
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update service request")


@router.delete("/{request_id}")
async def delete_service_request(
    request_id: str,
    current_user=Depends(get_current_user),
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """
    Archive service request (Admin only)
    
    Service requests are never truly deleted, only archived for audit trail.
    """
    try:
        # Only super_admins can archive service requests
        if getattr(current_user, "role", "user") != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Insufficient permissions to archive service requests"
            )
        
        success = await service.archive_service_request(request_id, current_user["id"])
        
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
            
        return {"message": "Service request archived successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to archive service request")




@router.put("/{request_id}/approve", response_model=ServiceRequestResponse)
async def approve_service_request(
    request_id: str,
    approval: ServiceRequestApproval,
    current_user=Depends(get_current_user),
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """
    Approve or reject a service request
    
    When approved, this triggers the contractor workflow automation.
    When rejected, the request is marked as cancelled.
    
    Only property managers and admins can approve service requests.
    """
    try:
        # Check permissions - property managers and above can approve
        user_role = getattr(current_user, "role", "user")
        if user_role not in ["user", "property_manager_admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to approve service requests"
            )
        
        # Approve or reject the request
        updated_request = await service.approve_service_request(
            request_id=request_id,
            approval=approval,
            approved_by=current_user.id
        )
        
        if not updated_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service request not found or not in pending approval status"
            )
        
        return updated_request
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        print(f"❌ ERROR - Failed to approve service request: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to approve service request")


# File Upload Endpoints
@router.post("/{request_id}/files", response_model=FileUploadResponse)
async def upload_service_request_file(
    request_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """
    Upload file attachment for service request
    
    Supports image files (JPG, PNG, WEBP) up to 10MB for documentation purposes.
    """
    try:
        # Validate file type and size
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        max_size = 10 * 1024 * 1024  # 10MB
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JPG, PNG, and WEBP image files are allowed"
            )
        
        # Check file size
        file_content = await file.read()
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 10MB"
            )
        
        # Reset file pointer
        await file.seek(0)
        
        # Upload file and attach to service request
        file_response = await service.upload_attachment(request_id, file, current_user["id"])
        
        return file_response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload file")


# Statistics and Analytics Endpoints
@router.get("/stats/overview", response_model=ServiceRequestStats)
async def get_service_request_stats(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    property_id: Optional[str] = Query(None, description="Filter by property"),
    current_user=Depends(get_current_user),
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """
    Get service request statistics for dashboard
    
    Provides counts by status, priority, and average response/completion times.
    """
    try:
        # Only admins can view statistics
        if getattr(current_user, "role", "user") not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Insufficient permissions to view statistics"
            )
        
        stats = await service.get_service_request_statistics(days, property_id)
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve statistics")


# Customer Portal Endpoints (Tenant-specific, limited access)
@router.post("/portal/submit", response_model=PortalServiceRequestResponse, status_code=status.HTTP_201_CREATED)
async def submit_portal_service_request(
    request: PortalServiceRequestCreate,
    portal_user=Depends(get_portal_user),  # ✅ Portal JWT authentication
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """
    Submit service request from customer portal
    
    This endpoint is used by tenants through the customer portal to submit maintenance requests.
    Tenant ID and property ID are extracted from the portal JWT token.
    Portal authentication maintains security isolation from admin ERP system.
    """
    try:
        # Extract tenant info from portal JWT token
        tenant_id = portal_user["account_id"]
        
        # DEBUG: Log the incoming request data
        print(f"🔍 DEBUG PORTAL - Request data: {request.dict()}")
        print(f"🔍 DEBUG PORTAL - Tenant preferred slots: {request.tenant_preferred_slots}")
        print(f"🔍 DEBUG PORTAL - Number of preferred slots: {len(request.tenant_preferred_slots)}")
        
        # Get tenant's property association
        property_id = await service.get_tenant_property_id(tenant_id)
        print(f"🔍 DEBUG - Tenant ID: {tenant_id}")
        print(f"🔍 DEBUG - Property ID found: {property_id}")
        if not property_id:
            print(f"❌ DEBUG - No property found for tenant: {tenant_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No active rental agreement found for tenant {tenant_id}. Please contact your property manager."
            )
        
        # Create full service request from portal request
        full_request = ServiceRequestCreate(
            tenant_id=tenant_id,
            property_id=property_id,
            request_type=request.request_type,
            priority=request.priority,
            title=request.title,
            description=request.description,
            attachment_urls=[],
            tenant_preferred_slots=request.tenant_preferred_slots
        )
        
        # Create the service request
        service_request = await service.create_service_request(full_request, tenant_id)
        
        # Return limited portal response
        portal_response = PortalServiceRequestResponse(
            id=service_request.id,
            request_type=service_request.request_type,
            priority=service_request.priority,
            title=service_request.title,
            description=service_request.description,
            attachment_urls=service_request.attachment_urls,
            status=service_request.status,
            submitted_at=service_request.submitted_at,
            estimated_completion=service_request.estimated_completion
        )
        
        return portal_response
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to submit service request")


@router.get("/portal/my-requests", response_model=List[PortalServiceRequestResponse])
async def get_portal_service_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    portal_user=Depends(get_portal_user),  # ✅ Portal JWT authentication
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """
    Get tenant's service requests from customer portal
    
    Returns only the requests submitted by the authenticated tenant.
    Portal authentication ensures tenant data isolation.
    """
    try:
        # Extract tenant info from portal JWT token
        tenant_id = portal_user["account_id"]
        
        # Get tenant's service requests
        service_requests = await service.get_tenant_service_requests(tenant_id, skip, limit)
        
        # Convert to portal response format
        portal_responses = []
        for sr in service_requests:
            portal_response = PortalServiceRequestResponse(
                id=sr.id,
                request_type=sr.request_type,
                priority=sr.priority,
                title=sr.title,
                description=sr.description,
                attachment_urls=sr.attachment_urls,
                status=sr.status,
                submitted_at=sr.submitted_at,
                estimated_completion=sr.estimated_completion
            )
            portal_responses.append(portal_response)
        
        return portal_responses
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve service requests")


@router.get("/portal/my-requests/{request_id}", response_model=ServiceRequestResponse)
async def get_portal_service_request_detail(
    request_id: str,
    portal_user=Depends(get_portal_user),  # ✅ Portal JWT authentication
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """
    Get full service request details with contractor workflow information
    
    Returns comprehensive service request data including appointment dates,
    contractor information, and completion status for tenant interaction.
    """
    try:
        # Extract tenant info from portal JWT token
        tenant_id = portal_user["account_id"]
        
        # Get service request and verify ownership
        service_request = await service.get_tenant_service_request_by_id(request_id, tenant_id)
        
        if not service_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
        
        return service_request
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve service request")


@router.post("/portal/my-requests/{request_id}/complete")
async def mark_service_request_complete(
    request_id: str,
    completion_data: dict,
    portal_user=Depends(get_portal_user),  # ✅ Portal JWT authentication
    service: ServiceRequestService = Depends(get_service_request_service)
):
    """
    Mark service request as completed by tenant
    
    Triggers the Link 2 invoice workflow automatically.
    Only the tenant who submitted the request can mark it as complete.
    """
    try:
        # Extract tenant info from portal JWT token
        tenant_id = portal_user["account_id"]
        
        # Get service request and verify ownership
        service_request = await service.get_tenant_service_request_by_id(request_id, tenant_id)
        
        if not service_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
        
        if service_request.status != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Service request must be in progress to mark as complete"
            )
        
        # Update completion status
        completion_notes = completion_data.get("completion_notes", "")
        completed_by_tenant = completion_data.get("completed_by_tenant", True)
        
        updated_request = await service.mark_service_request_complete(
            request_id, 
            tenant_id, 
            completion_notes, 
            completed_by_tenant
        )
        
        return {"message": "Service request marked as completed", "request": updated_request}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to mark service request as complete")


# Utility Endpoints (Public - No Authentication Required)
@public_router.get("/types", response_model=List[str])
async def get_service_request_types():
    """Get all available service request types"""
    return [request_type.value for request_type in ServiceRequestType]


@public_router.get("/priorities", response_model=List[str])  
async def get_service_request_priorities():
    """Get all available service request priorities"""
    return [priority.value for priority in ServiceRequestPriority]


@public_router.get("/statuses", response_model=List[str])
async def get_service_request_statuses():
    """Get all available service request statuses"""
    return [status.value for status in ServiceRequestStatus]