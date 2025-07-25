"""
Account System Models - Unified entity management for Tenants, Employees, and Contractors
Replaces the fragmented tenant/customer system with a hierarchical account structure
"""

from datetime import datetime
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
    company_id: str  # For SaaS multi-tenancy isolation
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    is_archived: bool = False
    
    # Portal Access (for customer portal)
    portal_code: Optional[str] = None  # Random 7-char code for portal access (one-time invitation)
    portal_active: bool = False        # True after first login/activation
    portal_password_hash: Optional[str] = None  # Hashed password for portal login
    portal_last_login: Optional[datetime] = None
    
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
    
    # Rates and Billing
    hourly_rate: Optional[float] = None
    fixed_rates: Dict[str, float] = Field(default_factory=dict)  # service -> rate
    currency: str = "EUR"
    
    # Performance Metrics
    rating: Optional[float] = None
    completed_jobs: int = 0
    average_response_time: Optional[float] = None  # in hours
    
    # Availability
    available: bool = True
    availability_schedule: Optional[str] = None
    preferred_contact_method: str = "email"


# API Request/Response Models
class AccountCreate(BaseModel):
    """Account creation request model"""
    account_type: AccountType
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    company_id: str
    
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
    company_id: str
    created_at: datetime
    updated_at: Optional[datetime]
    is_archived: bool
    
    # Portal Information
    portal_code: Optional[str]
    portal_active: bool
    portal_last_login: Optional[datetime]
    
    # Computed Fields
    full_name: str = ""  # Will be computed as first_name + last_name
    display_name: str = ""  # Business logic for display
    
    # Profile Data (populated based on account_type)
    profile_data: Optional[Dict[str, Any]] = None
    
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
    company_domain: str  # For multi-tenant validation


# Migration Helper Models
class TenantMigration(BaseModel):
    """Helper model for migrating existing tenant data to account system"""
    tenant_data: Dict[str, Any]
    company_id: str
    created_by: str