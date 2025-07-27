from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid


class ContractType(str, Enum):
    RENTAL = "rental"
    SERVICE = "service"
    VENDOR = "vendor"
    EMPLOYMENT = "employment"
    FINANCIAL = "financial"


class ContractStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"
    PENDING = "pending"


class ContractBillingType(str, Enum):
    CREDIT = "credit"  # Service provider receives money (contractor payment)
    DEBIT = "debit"    # Customer pays money (tenant charges)
    RECURRING = "recurring"  # Auto-recurring invoices (rent, salary)
    ONE_TIME = "one_time"    # Single invoice generation


class ContractParty(BaseModel):
    name: str
    role: str  # "tenant", "landlord", "contractor", "service_provider", "employee", "employer", "bank", "insurance_company"
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None


# Base contract model with all shared fields
class ContractBase(BaseModel):
    """Base contract model containing all shared fields across contract operations"""
    title: str
    contract_type: ContractType
    parties: List[ContractParty]
    start_date: date
    end_date: Optional[date] = None
    value: Optional[float] = None
    currency: str = "EUR"
    
    # Invoice generation settings
    billing_type: Optional[ContractBillingType] = None
    billing_frequency: Optional[str] = None  # "monthly", "quarterly", "yearly", "one_time"
    next_billing_date: Optional[date] = None
    
    # Related entities
    property_id: Optional[str] = None  # Property this contract relates to
    other_party_id: Optional[str] = None  # Account ID of the other party (tenant/contractor/employee)
    other_party_type: Optional[str] = None  # "tenant", "contractor", "employee" for clarity
    
    # Contract details
    description: Optional[str] = None
    terms: Optional[str] = None
    renewal_info: Optional[Dict[str, Any]] = None
    type_specific_data: Optional[Dict[str, Any]] = None


class ContractCreate(ContractBase):
    """Contract creation model - inherits all fields from ContractBase"""
    pass


class Contract(ContractBase):
    """Full contract model with metadata fields"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: ContractStatus = ContractStatus.DRAFT
    
    # Document management
    documents: Optional[List[Dict[str, str]]] = None  # [{"name": "contract.pdf", "url": "..."}]
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_archived: bool = False


class ContractUpdate(BaseModel):
    """Contract update model - all fields optional for partial updates"""
    title: Optional[str] = None
    status: Optional[ContractStatus] = None
    parties: Optional[List[ContractParty]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    value: Optional[float] = None
    currency: Optional[str] = None
    
    # Invoice generation settings
    billing_type: Optional[ContractBillingType] = None
    billing_frequency: Optional[str] = None
    next_billing_date: Optional[date] = None
    
    # Related entities
    property_id: Optional[str] = None
    other_party_id: Optional[str] = None
    other_party_type: Optional[str] = None
    
    # Contract details
    description: Optional[str] = None
    terms: Optional[str] = None
    renewal_info: Optional[Dict[str, Any]] = None
    type_specific_data: Optional[Dict[str, Any]] = None
    is_archived: Optional[bool] = None


class ContractResponse(Contract):
    """Contract response model - inherits from Contract for API responses"""
    
    @field_validator('start_date', 'end_date', mode='before')
    @classmethod
    def convert_datetime_to_date(cls, v):
        if isinstance(v, datetime):
            return v.date()
        return v


# Specialized contract types for better type safety and validation
class RentalContractData(BaseModel):
    monthly_rent: float
    security_deposit: Optional[float] = None
    utilities_included: bool = False
    pet_allowed: bool = False
    furnished: bool = False


class ServiceContractData(BaseModel):
    service_type: str  # "maintenance", "cleaning", "security", "landscaping"
    frequency: str  # "daily", "weekly", "monthly", "quarterly", "yearly", "one_time"
    scope_of_work: str
    payment_terms: str  # "monthly", "per_service", "quarterly"


class VendorContractData(BaseModel):
    vendor_type: str  # "construction", "utilities", "insurance", "legal"
    contract_number: Optional[str] = None
    payment_terms: str
    delivery_terms: Optional[str] = None


class EmploymentContractData(BaseModel):
    position: str
    department: str
    salary: float
    benefits: Optional[str] = None
    working_hours: str
    probation_period: Optional[int] = None  # days


class FinancialContractData(BaseModel):
    financial_type: str  # "loan", "mortgage", "insurance", "banking"
    account_number: Optional[str] = None
    interest_rate: Optional[float] = None
    payment_schedule: Optional[str] = None
    collateral: Optional[str] = None