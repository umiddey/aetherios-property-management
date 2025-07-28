"""
Service Request Models - Customer Portal Maintenance Request System
Core models for tenant service requests that integrate with the main ERP system
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid


class ServiceRequestType(str, Enum):
    """Service request categories for maintenance and repair"""
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    HVAC = "hvac"
    APPLIANCE = "appliance"
    GENERAL_MAINTENANCE = "general_maintenance"
    CLEANING = "cleaning"
    SECURITY = "security"
    OTHER = "other"


class ServiceRequestPriority(str, Enum):
    """Service request priority levels with expected response times"""
    EMERGENCY = "emergency"      # Response within 2 hours - water leaks, electrical hazards
    URGENT = "urgent"           # Response within 24 hours - non-functioning appliances
    ROUTINE = "routine"         # Response within 3-5 days - cosmetic issues, general maintenance


class ServiceRequestStatus(str, Enum):
    """Service request lifecycle status"""
    SUBMITTED = "submitted"         # Initial submission from customer portal
    ASSIGNED = "assigned"          # Assigned to internal team or contractor
    IN_PROGRESS = "in_progress"    # Work has begun
    COMPLETED = "completed"        # Work finished, awaiting tenant confirmation
    CLOSED = "closed"             # Request resolved and closed
    CANCELLED = "cancelled"       # Request cancelled by tenant or admin


# Base Service Request Model
class ServiceRequest(BaseModel):
    """
    Core service request model for customer portal maintenance requests.
    Links tenant requests to the main ERP system through task creation.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Tenant and Property Association
    tenant_id: str  # Links to accounts collection (account_type: "tenant")
    property_id: str  # Links to properties collection
    
    # Request Details
    request_type: ServiceRequestType
    priority: ServiceRequestPriority
    title: str = Field(..., min_length=5, max_length=100, description="Brief description of the issue")
    description: str = Field(..., min_length=10, max_length=1000, description="Detailed description of the problem")
    
    # File Attachments
    attachment_urls: List[str] = Field(default_factory=list, description="URLs to uploaded photos/documents")
    
    # Status and Workflow
    status: ServiceRequestStatus = ServiceRequestStatus.SUBMITTED
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    
    # ERP Integration
    assigned_task_id: Optional[str] = None  # Links to main ERP task system when assigned
    assigned_user_id: Optional[str] = None  # Property manager or maintenance staff
    
    # Contractor Automation Fields
    tenant_preferred_slots: List[datetime] = Field(default_factory=list, description="Tenant's 1-3 preferred appointment times")
    contractor_email: Optional[str] = None  # Auto-mapped by service_type from ContractorProfile
    appointment_confirmed_datetime: Optional[datetime] = None  # Contractor's confirmed appointment time
    completion_status: str = "pending"  # pending/tenant_confirmed/auto_confirmed
    invoice_link_sent: bool = False  # Whether Link 2 (invoice) email has been sent
    contractor_response_token: Optional[str] = None  # Unique token for Link 1 (scheduling)
    invoice_upload_token: Optional[str] = None  # Unique token for Link 2 (invoice upload)
    contractor_email_sent_at: Optional[datetime] = None  # When contractor automation email was sent
    
    # Internal Notes (admin only)
    internal_notes: Optional[str] = None
    estimated_completion: Optional[datetime] = None
    
    # System Fields
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_archived: bool = False


# Request Models for API
class ServiceRequestCreate(BaseModel):
    """Model for creating new service requests from customer portal"""
    tenant_id: str
    property_id: str
    request_type: ServiceRequestType
    priority: ServiceRequestPriority
    title: str = Field(..., min_length=5, max_length=100)
    description: str = Field(..., min_length=10, max_length=1000)
    attachment_urls: List[str] = Field(default_factory=list)
    tenant_preferred_slots: List[datetime] = Field(default_factory=list, description="Tenant's 1-3 preferred appointment times")


class ServiceRequestUpdate(BaseModel):
    """Model for updating service requests (admin only)"""
    status: Optional[ServiceRequestStatus] = None
    assigned_user_id: Optional[str] = None
    internal_notes: Optional[str] = None
    estimated_completion: Optional[datetime] = None


class ServiceRequestResponse(BaseModel):
    """Full service request response model for API"""
    id: str
    tenant_id: str
    property_id: str
    request_type: ServiceRequestType
    priority: ServiceRequestPriority
    title: str
    description: str
    attachment_urls: List[str]
    status: ServiceRequestStatus
    submitted_at: datetime
    assigned_at: Optional[datetime]
    completed_at: Optional[datetime]
    closed_at: Optional[datetime]
    assigned_task_id: Optional[str]
    assigned_user_id: Optional[str]
    internal_notes: Optional[str]
    estimated_completion: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    # Contractor Automation Fields
    tenant_preferred_slots: List[datetime]
    contractor_email: Optional[str]
    appointment_confirmed_datetime: Optional[datetime]
    completion_status: str
    invoice_link_sent: bool
    contractor_response_token: Optional[str]
    invoice_upload_token: Optional[str]
    
    # Additional fields for frontend display
    tenant_name: Optional[str] = None  # Populated from accounts collection
    property_address: Optional[str] = None  # Populated from properties collection
    assigned_user_name: Optional[str] = None  # Populated from users collection


class ServiceRequestSummary(BaseModel):
    """Lightweight service request model for list views"""
    id: str
    title: str
    request_type: ServiceRequestType
    priority: ServiceRequestPriority
    status: ServiceRequestStatus
    submitted_at: datetime
    property_address: Optional[str] = None


# File Upload Models
class FileUploadResponse(BaseModel):
    """Response model for file upload endpoints"""
    file_url: str
    file_name: str
    file_size: int
    uploaded_at: datetime


# Statistics Models
class ServiceRequestStats(BaseModel):
    """Service request statistics for dashboards"""
    total_requests: int
    submitted_count: int
    assigned_count: int
    in_progress_count: int
    completed_count: int
    closed_count: int
    cancelled_count: int
    emergency_count: int
    urgent_count: int
    routine_count: int
    avg_response_time_hours: Optional[float] = None
    avg_completion_time_hours: Optional[float] = None


# Portal-specific models for customer-facing API
class PortalServiceRequestCreate(BaseModel):
    """Simplified model for customer portal service request creation"""
    request_type: ServiceRequestType
    priority: ServiceRequestPriority
    title: str = Field(..., min_length=5, max_length=100)
    description: str = Field(..., min_length=10, max_length=1000)
    tenant_preferred_slots: List[datetime] = Field(default_factory=list, description="Tenant's 1-3 preferred appointment times")
    # tenant_id and property_id will be extracted from JWT token


class PortalServiceRequestResponse(BaseModel):
    """Customer portal service request response (limited fields)"""
    id: str
    request_type: ServiceRequestType
    priority: ServiceRequestPriority
    title: str
    description: str
    attachment_urls: List[str]
    status: ServiceRequestStatus
    submitted_at: datetime
    estimated_completion: Optional[datetime]
    # Internal fields like assigned_user_id and internal_notes are excluded