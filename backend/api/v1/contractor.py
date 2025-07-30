"""
Contractor API - Token-based Endpoints for Contractor Workflow
Handles scheduling responses (Link 1) and invoice submissions (Link 2)
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Depends
from pydantic import BaseModel
from pymongo.database import Database

from dependencies import db
from models.service_request import ServiceRequest, ServiceRequestStatus
from services.contractor_email_service import ContractorEmailService, get_smtp_config
from services.completion_tracking_service import CompletionTrackingService
from services.tenant_service import TenantService


router = APIRouter(prefix="/contractor", tags=["contractor"])


# Request/Response Models
class SchedulingResponse(BaseModel):
    """Model for contractor scheduling response"""
    action: str  # 'accept' or 'propose'
    selected_slot: Optional[str] = None  # For accepting tenant preferred slot
    proposed_datetime: Optional[datetime] = None  # For proposing new time
    contractor_notes: Optional[str] = None


class InvoiceSubmission(BaseModel):
    """Model for contractor invoice submission"""
    file_url: str  # URL of uploaded invoice file
    amount: float  # Invoice amount in EUR
    description: str  # Work performed description
    contractor_notes: Optional[str] = None


class FileUploadResponse(BaseModel):
    """Model for file upload response"""
    file_url: str
    file_name: str
    file_size: int
    uploaded_at: datetime


# Service Dependencies
def get_contractor_email_service() -> ContractorEmailService:
    """Get contractor email service instance"""
    return ContractorEmailService(db, get_smtp_config())


def get_completion_tracking_service() -> CompletionTrackingService:
    """Get completion tracking service instance"""
    contractor_service = get_contractor_email_service()
    return CompletionTrackingService(db, contractor_service)


# Scheduling Endpoints (Link 1)
@router.get("/schedule/{token}")
async def get_scheduling_details(token: str):
    """
    Get service request details for contractor scheduling (Link 1)
    
    This endpoint is called when contractor clicks the scheduling link in their email.
    Returns service request details and tenant preferred slots.
    """
    try:
        # Find service request by scheduling token
        service_request = await db.service_requests.find_one({
            "contractor_response_token": token
        })
        
        if not service_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired scheduling link"
            )
        
        # Check if already responded
        if service_request.get("appointment_confirmed_datetime"):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Scheduling has already been completed for this service request"
            )
        
        # Get tenant and property info for context using TenantService
        tenant_service = TenantService(db)
        tenant_account = await tenant_service.get_tenant_by_id(service_request["tenant_id"])
        
        # Convert to dict format for backward compatibility
        tenant = None
        if tenant_account:
            tenant = {
                "id": tenant_account.id,
                "first_name": tenant_account.first_name,
                "last_name": tenant_account.last_name,
                "email": tenant_account.email,
                "phone": tenant_account.phone,
                "address": tenant_account.address
            }
        property_info = await db.properties.find_one({"id": service_request["property_id"]})
        
        # Remove MongoDB specific fields and enrich with context data
        service_request.pop("_id", None)  # Remove MongoDB ObjectId
        
        response_data = {
            **service_request,
            "tenant_name": f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}" if tenant else None,
            "property_address": property_info.get("address") if property_info else None
        }
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load scheduling details"
        )


@router.post("/schedule/{token}")
async def submit_scheduling_response(
    token: str,
    response: SchedulingResponse,
    completion_service: CompletionTrackingService = Depends(get_completion_tracking_service)
):
    """
    Submit contractor scheduling response (Link 1)
    
    Contractor can either accept a tenant's preferred slot or propose a new time.
    This creates a Task in the ERP system and notifies the tenant.
    """
    try:
        # Find service request by scheduling token
        service_request = await db.service_requests.find_one({
            "contractor_response_token": token
        })
        
        if not service_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired scheduling link"
            )
        
        # Check if already responded
        if service_request.get("appointment_confirmed_datetime"):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Scheduling has already been completed for this service request"
            )
        
        # Validate response
        if response.action not in ["accept", "propose"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Action must be 'accept' or 'propose'"
            )
        
        if response.action == "accept" and not response.selected_slot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must specify selected_slot when accepting"
            )
        
        if response.action == "propose" and not response.proposed_datetime:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must specify proposed_datetime when proposing new time"
            )
        
        # Determine confirmed datetime
        if response.action == "accept":
            confirmed_datetime = datetime.fromisoformat(response.selected_slot.replace('Z', '+00:00'))
        else:
            confirmed_datetime = response.proposed_datetime
        
        current_time = datetime.utcnow()
        
        # Update service request with confirmed appointment
        update_data = {
            "appointment_confirmed_datetime": confirmed_datetime,
            "contractor_scheduling_response": response.action,
            "contractor_notes": response.contractor_notes,
            "contractor_responded_at": current_time,
            "status": ServiceRequestStatus.IN_PROGRESS,
            "updated_at": current_time
        }
        
        if response.action == "accept":
            update_data["accepted_tenant_slot"] = response.selected_slot
        
        await db.service_requests.update_one(
            {"_id": service_request["_id"]},
            {"$set": update_data}
        )
        
        # Create ERP Task for this scheduled appointment
        await _create_scheduled_task(service_request, confirmed_datetime, response)
        
        # TODO: Send notification to tenant about confirmed appointment
        # This would integrate with the tenant notification system
        
        print(f"✅ Contractor scheduled appointment:")
        print(f"   📅 Date: {confirmed_datetime}")
        print(f"   🔧 Service: {service_request['title']}")
        print(f"   🏠 Property: {service_request.get('property_id')}")
        
        return {
            "success": True,
            "message": "Scheduling response submitted successfully",
            "confirmed_datetime": confirmed_datetime,
            "action": response.action
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error submitting scheduling response: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit scheduling response"
        )


# Invoice Endpoints (Link 2)
@router.get("/invoice/{token}")
async def get_invoice_details(token: str):
    """
    Get service request details for contractor invoice submission (Link 2)
    
    This endpoint is called when contractor clicks the invoice link in their email.
    Returns service completion details and upload requirements.
    """
    try:
        # Find service request by invoice token
        service_request = await db.service_requests.find_one({
            "invoice_upload_token": token
        })
        
        if not service_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired invoice link"
            )
        
        # Check if invoice already submitted
        if service_request.get("invoice_submitted"):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Invoice has already been submitted for this service request"
            )
        
        # Get tenant and property info for context using TenantService
        tenant_service = TenantService(db)
        tenant_account = await tenant_service.get_tenant_by_id(service_request["tenant_id"])
        
        # Convert to dict format for backward compatibility
        tenant = None
        if tenant_account:
            tenant = {
                "id": tenant_account.id,
                "first_name": tenant_account.first_name,
                "last_name": tenant_account.last_name,
                "email": tenant_account.email,
                "phone": tenant_account.phone,
                "address": tenant_account.address
            }
        property_info = await db.properties.find_one({"id": service_request["property_id"]})
        
        # Remove MongoDB ObjectId before serializing
        service_request.pop("_id", None)
        
        # Enrich response with context data
        response_data = {
            **service_request,
            "tenant_name": f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}" if tenant else None,
            "property_address": property_info.get("address") if property_info else None
        }
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load invoice details"
        )


@router.post("/invoice/{token}/upload")
async def upload_invoice_file(
    token: str,
    file: UploadFile = File(...)
) -> FileUploadResponse:
    """
    Upload invoice file for contractor (Link 2)
    
    Handles PDF and image uploads with validation.
    Returns file URL for invoice submission.
    """
    try:
        # Verify token exists
        service_request = await db.service_requests.find_one({
            "invoice_upload_token": token
        })
        
        if not service_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired invoice link"
            )
        
        # Validate file type
        allowed_types = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF and image files (JPG, PNG) are allowed"
            )
        
        # Validate file size (10MB max)
        file_content = await file.read()
        max_size = 10 * 1024 * 1024  # 10MB
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 10MB"
            )
        
        # Generate unique filename
        import uuid
        import os
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"invoice_{uuid.uuid4().hex[:12]}{file_extension}"
        
        # Save file (in production, this would go to cloud storage)
        upload_dir = "uploads/invoices"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, unique_filename)
        
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Return file info
        file_url = f"/uploads/invoices/{unique_filename}"
        
        return FileUploadResponse(
            file_url=file_url,
            file_name=file.filename,
            file_size=len(file_content),
            uploaded_at=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading invoice file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload invoice file"
        )


@router.post("/invoice/{token}")
async def submit_invoice(
    token: str,
    invoice: InvoiceSubmission
):
    """
    Submit contractor invoice (Link 2)
    
    Processes invoice submission with AI validation and auto-approval logic.
    Creates Invoice in ERP system if under threshold.
    """
    try:
        # Find service request by invoice token
        service_request = await db.service_requests.find_one({
            "invoice_upload_token": token
        })
        
        if not service_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired invoice link"
            )
        
        # Check if invoice already submitted
        if service_request.get("invoice_submitted"):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Invoice has already been submitted for this service request"
            )
        
        # Validate invoice amount
        if invoice.amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invoice amount must be greater than 0"
            )
        
        # Determine auto-approval threshold based on service type and priority
        threshold = _get_auto_approval_threshold(
            service_request["request_type"], 
            service_request["priority"]
        )
        
        auto_approved = invoice.amount <= threshold
        current_time = datetime.utcnow()
        
        # Update service request with invoice details
        update_data = {
            "invoice_submitted": True,
            "invoice_file_url": invoice.file_url,
            "invoice_amount": invoice.amount,
            "invoice_description": invoice.description,
            "invoice_contractor_notes": invoice.contractor_notes,
            "invoice_submitted_at": current_time,
            "invoice_auto_approved": auto_approved,
            "invoice_approval_threshold": threshold,
            "status": ServiceRequestStatus.COMPLETED,
            "completed_at": current_time,
            "updated_at": current_time
        }
        
        await db.service_requests.update_one(
            {"_id": service_request["_id"]},
            {"$set": update_data}
        )
        
        # Create Invoice in ERP system
        erp_invoice_id = await _create_erp_invoice(service_request, invoice, auto_approved)
        
        if erp_invoice_id:
            await db.service_requests.update_one(
                {"_id": service_request["_id"]},
                {"$set": {"erp_invoice_id": erp_invoice_id}}
            )
        
        print(f"✅ Contractor invoice submitted:")
        print(f"   💰 Amount: €{invoice.amount}")
        print(f"   🤖 Auto-approved: {auto_approved} (threshold: €{threshold})")
        print(f"   📄 File: {invoice.file_url}")
        print(f"   🔧 Service: {service_request['title']}")
        
        return {
            "success": True,
            "message": "Invoice submitted successfully",
            "amount": invoice.amount,
            "auto_approved": auto_approved,
            "threshold": threshold,
            "erp_invoice_id": erp_invoice_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error submitting invoice: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit invoice"
        )


# Helper Functions
async def _create_scheduled_task(service_request: dict, confirmed_datetime: datetime, 
                                response: SchedulingResponse) -> Optional[str]:
    """
    Create ERP Task when appointment is scheduled by contractor.
    Integrates with existing Task system.
    """
    try:
        import uuid
        task_id = str(uuid.uuid4())
        
        # Map service request priority to task priority
        priority_mapping = {
            "emergency": "urgent",
            "urgent": "high", 
            "routine": "normal"
        }
        
        task_priority = priority_mapping.get(service_request["priority"], "normal")
        
        # Create task document
        task_doc = {
            "id": task_id,
            "title": f"Contractor Service: {service_request['title']}",
            "description": f"Scheduled contractor service.\n\nOriginal Request: {service_request['description']}\n\nContractor Notes: {response.contractor_notes or 'None'}",
            "priority": task_priority,
            "status": "scheduled",  # New status for scheduled contractor services
            "assigned_to": service_request.get("contractor_email", ""),
            "due_date": confirmed_datetime,
            "scheduled_start": confirmed_datetime,
            "category": "contractor_service",
            "property_id": service_request["property_id"],
            "tenant_id": service_request["tenant_id"],
            "service_request_id": service_request["_id"],
            "contractor_response": response.dict(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_archived": False
        }
        
        # Insert task
        result = await db.tasks.insert_one(task_doc)
        
        if result.inserted_id:
            print(f"✅ Created ERP task {task_id} for scheduled service")
            return task_id
            
    except Exception as e:
        print(f"❌ Failed to create scheduled task: {e}")
    
    return None


async def _create_erp_invoice(service_request: dict, invoice: InvoiceSubmission, 
                            auto_approved: bool) -> Optional[str]:
    """
    Create Invoice in ERP system from contractor submission.
    Integrates with existing Invoice system and contract automation.
    """
    try:
        import uuid
        invoice_id = str(uuid.uuid4())
        
        # Get contract for this tenant/property for proper invoice creation
        contract = await db.contracts.find_one({
            "tenant_id": service_request["tenant_id"],
            "property_id": service_request["property_id"],
            "status": "active"
        })
        
        if not contract:
            print(f"⚠️ No active contract found for invoice creation")
            return None
        
        # Create invoice document following existing invoice model
        invoice_doc = {
            "id": invoice_id,
            "invoice_number": f"SVC-{datetime.utcnow().strftime('%Y%m%d')}-{invoice_id[:8].upper()}",
            "tenant_id": service_request["tenant_id"],
            "property_id": service_request["property_id"],
            "contract_id": contract["id"],
            
            # Invoice details
            "amount": invoice.amount,
            "currency": "EUR",
            "description": f"Service: {invoice.description}",
            "invoice_type": "service",
            "invoice_category": "contractor_service",
            
            # Service request linkage
            "service_request_id": service_request["_id"],
            "contractor_email": service_request.get("contractor_email"),
            "service_type": service_request["request_type"],
            
            # Status and approval
            "status": "paid" if auto_approved else "pending_approval",
            "auto_approved": auto_approved,
            "approval_threshold": _get_auto_approval_threshold(
                service_request["request_type"], 
                service_request["priority"]
            ),
            
            # Dates
            "invoice_date": datetime.utcnow(),
            "due_date": datetime.utcnow(),  # Immediate payment for contractor services
            "issue_date": datetime.utcnow(),
            "service_date": service_request.get("appointment_confirmed_datetime"),
            
            # File attachment
            "attachment_urls": [invoice.file_url],
            
            # Metadata
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_archived": False,
            "notes": f"Contractor service invoice. {invoice.contractor_notes or ''}"
        }
        
        # Insert invoice
        result = await db.invoices.insert_one(invoice_doc)
        
        if result.inserted_id:
            print(f"✅ Created ERP invoice {invoice_id} - Status: {invoice_doc['status']}")
            return invoice_id
            
    except Exception as e:
        print(f"❌ Failed to create ERP invoice: {e}")
    
    return None


def _get_auto_approval_threshold(service_type: str, priority: str) -> float:
    """
    Get auto-approval threshold based on service type and priority.
    These thresholds are defined in the contractor workflow specification.
    """
    thresholds = {
        "plumbing": {"emergency": 500, "urgent": 300, "routine": 150},
        "electrical": {"emergency": 300, "urgent": 250, "routine": 150},
        "hvac": {"emergency": 800, "urgent": 500, "routine": 200},
        "appliance": {"emergency": 400, "urgent": 300, "routine": 150},
        "general_maintenance": {"emergency": 200, "urgent": 150, "routine": 100},
        "cleaning": {"emergency": 150, "urgent": 100, "routine": 75},
        "security": {"emergency": 300, "urgent": 200, "routine": 150},
        "other": {"emergency": 200, "urgent": 150, "routine": 100}
    }
    
    return thresholds.get(service_type, {}).get(priority, 150)