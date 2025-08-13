"""
Account System Models - Unified entity management for Tenants, Employees, and Contractors
Replaces the fragmented tenant/customer system with a hierarchical account structure
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field, EmailStr
import uuid


class AccountType(str, Enum):
    """Account type enumeration for different entity categories"""
    TENANT = "tenant"
    EMPLOYEE = "employee" 
    CONTRACTOR = "contractor"


class AccountStatus(str, Enum):
    """Account status for lifecycle management"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"


# Base Account Model
class Account(BaseModel):
    """
    Unified account model that serves as the central hub for all person/entity management.
    Replaces separate tenant/customer models with a hierarchical approach.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_type: AccountType
    status: AccountStatus = AccountStatus.ACTIVE
    
    # Core Identity Fields
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    
    # System Fields
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    is_archived: bool = False
    
    
    # Notification Preferences
    notification_preferences: Dict[str, List[str]] = Field(default_factory=lambda: {
        "service_requests": ["email"],
        "emergency_alerts": ["email", "sms"],
        "general_updates": ["email"]
    })
    
    # Flexible metadata for account-type specific data
    metadata: Dict[str, Any] = Field(default_factory=dict)


# Account Profile Models (Type-Specific Extensions)
class TenantProfile(BaseModel):
    """Tenant-specific profile data extending the base account"""
    account_id: str
    
    # Tenant-Specific Fields (migrated from existing Tenant model)
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    bank_account: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    
    # Lease Information
    lease_start_date: Optional[datetime] = None
    lease_end_date: Optional[datetime] = None
    monthly_rent: Optional[float] = None
    security_deposit: Optional[float] = None
    
    # Property Associations
    current_property_ids: List[str] = Field(default_factory=list)
    
    # Tenant Notes
    notes: Optional[str] = None
    
    # Tenant Status Computation Fields
    rental_status: Optional[str] = None  # active, inactive, notice_given, etc.
    last_payment_date: Optional[datetime] = None
    outstanding_balance: Optional[float] = 0.0
    
    # Portal Access (moved from base Account - tenant-specific)
    portal_code: Optional[str] = None  # Random 7-char code for portal access (one-time invitation)
    portal_active: bool = False        # True after first login/activation
    portal_email: Optional[str] = None  # Email chosen during portal activation (can differ from main email)
    portal_password_hash: Optional[str] = None  # Hashed password for portal login
    portal_last_login: Optional[datetime] = None


class EmployeeProfile(BaseModel):
    """Employee-specific profile data extending the base account"""
    account_id: str
    
    # Employment Information
    employee_id: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[datetime] = None
    termination_date: Optional[datetime] = None
    
    # Compensation
    salary: Optional[float] = None
    hourly_rate: Optional[float] = None
    currency: str = "EUR"
    
    # Work Information
    work_schedule: Optional[str] = None
    manager_account_id: Optional[str] = None
    office_location: Optional[str] = None
    
    # HR Fields
    employee_status: Optional[str] = "active"  # active, on_leave, terminated
    benefits_eligible: bool = True
    
    # System Access
    system_access_level: Optional[str] = "basic"  # basic, manager, admin
    last_performance_review: Optional[datetime] = None


class ContractorProfile(BaseModel):
    """Contractor-specific profile data extending the base account"""
    account_id: str
    
    # Business Information
    business_name: Optional[str] = None
    tax_id: Optional[str] = None
    license_number: Optional[str] = None
    insurance_info: Optional[str] = None
    
    # Service Information
    services_offered: List[str] = Field(default_factory=list)
    specializations: List[str] = Field(default_factory=list)
    service_areas: List[str] = Field(default_factory=list)  # Geographic areas
    
    # Geographic Intelligence
    service_radius_km: float = 25.0  # Default 25km service radius
    latitude: Optional[float] = None  # Contractor base location
    longitude: Optional[float] = None
    postal_codes_served: List[str] = Field(default_factory=list)  # Specific postal codes
    travel_rate_per_km: float = 0.50  # Travel compensation per km
    
    # Rates and Billing
    hourly_rate: Optional[float] = None
    fixed_rates: Dict[str, float] = Field(default_factory=dict)  # service -> rate
    emergency_rate_multiplier: float = 1.5  # Emergency service rate multiplier
    currency: str = "EUR"
    
    # Performance Metrics & Quality Scoring
    rating: float = 5.0  # Average rating (1-5 stars)
    completed_jobs: int = 0
    average_response_time: Optional[float] = None  # in hours
    completion_rate: float = 100.0  # Percentage of jobs completed successfully
    on_time_rate: float = 100.0  # Percentage of jobs completed on time
    tenant_satisfaction_score: float = 5.0  # Average tenant satisfaction (1-5)
    last_job_completed: Optional[datetime] = None
    
    # Availability & Capacity Management
    available: bool = True
    max_concurrent_jobs: int = 3  # Maximum jobs contractor can handle simultaneously
    current_job_count: int = 0  # Current active jobs
    availability_schedule: Optional[str] = None
    emergency_available: bool = False  # Available for emergency calls 24/7
    preferred_contact_method: str = "email"
    response_time_target: int = 2  # Target response time in hours
    
    # Business Verification
    license_verified: bool = False
    insurance_verified: bool = False
    background_check_completed: bool = False
    verification_date: Optional[datetime] = None


# API Request/Response Models
class AccountCreate(BaseModel):
    """Account creation request model"""
    account_type: AccountType
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    
    # Profile-specific data (will be stored in respective profile tables)
    profile_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AccountUpdate(BaseModel):
    """Account update request model"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: Optional[AccountStatus] = None
    notification_preferences: Optional[Dict[str, List[str]]] = None
    metadata: Optional[Dict[str, Any]] = None


class AccountResponse(BaseModel):
    """Account response model with computed fields"""
    id: str
    account_type: AccountType
    status: AccountStatus
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    address: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    is_archived: bool
    
    # Computed Fields
    full_name: str = ""  # Will be computed as first_name + last_name
    display_name: str = ""  # Business logic for display
    
    # Profile Data (populated based on account_type)
    profile_data: Optional[Dict[str, Any]] = None


class TenantAccountResponse(AccountResponse):
    """Tenant-specific account response with portal fields"""
    # Portal Information (only for tenant accounts)
    portal_code: Optional[str] = None
    portal_active: bool = False
    portal_last_login: Optional[datetime] = None
    
    def __init__(self, **data):
        super().__init__(**data)
        self.full_name = f"{self.first_name} {self.last_name}"
        self.display_name = self.full_name


# Portal-Specific Models
class PortalCodeGenerate(BaseModel):
    """Request to generate a new portal access code"""
    account_id: str
    

class PortalInvitationResponse(BaseModel):
    """Response for portal invitation lookup"""
    account_id: str
    first_name: str
    last_name: str
    email: str
    address: Optional[str]
    account_type: AccountType
    is_valid: bool  # True if code is valid and not yet activated
    

class PortalActivation(BaseModel):
    """Portal account activation request"""
    portal_code: str
    email: Optional[EmailStr] = None  # Optional custom email (will use account email if not provided)
    password: str = Field(..., min_length=8, max_length=100)
    

class PortalLogin(BaseModel):
    """Portal login request"""
    email: EmailStr
    password: str
    

class PortalLoginResponse(BaseModel):
    """Portal login response"""
    access_token: str
    token_type: str = "bearer"
    account: AccountResponse
    

class PortalAccess(BaseModel):
    """Portal access validation model"""
    portal_code: str


# Migration Helper Models
class TenantMigration(BaseModel):
    """Helper model for migrating existing tenant data to account system"""
    tenant_data: Dict[str, Any]
    created_by: str