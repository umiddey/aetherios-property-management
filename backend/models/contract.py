from pydantic import BaseModel, Field
from datetime import datetime
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


class ContractParty(BaseModel):
    name: str
    role: str  # "tenant", "landlord", "contractor", "service_provider", "employee", "employer", "bank", "insurance_company"
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None


class Contract(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    contract_type: ContractType
    parties: List[ContractParty]
    start_date: datetime
    end_date: Optional[datetime] = None
    status: ContractStatus = ContractStatus.DRAFT
    value: Optional[float] = None
    currency: str = "EUR"
    
    # Related entities
    related_property_id: Optional[str] = None
    related_tenant_id: Optional[str] = None
    related_user_id: Optional[str] = None
    
    # Contract details
    description: Optional[str] = None
    terms: Optional[str] = None
    renewal_info: Optional[Dict[str, Any]] = None
    
    # Document management
    documents: Optional[List[Dict[str, str]]] = None  # [{"name": "contract.pdf", "url": "..."}]
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_archived: bool = False
    
    # Type-specific fields (using flexible dict structure)
    type_specific_data: Optional[Dict[str, Any]] = None


class ContractCreate(BaseModel):
    title: str
    contract_type: ContractType
    parties: List[ContractParty]
    start_date: datetime
    end_date: Optional[datetime] = None
    value: Optional[float] = None
    currency: str = "EUR"
    
    related_property_id: Optional[str] = None
    related_tenant_id: Optional[str] = None
    related_user_id: Optional[str] = None
    
    description: Optional[str] = None
    terms: Optional[str] = None
    renewal_info: Optional[Dict[str, Any]] = None
    type_specific_data: Optional[Dict[str, Any]] = None


class ContractUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[ContractStatus] = None
    parties: Optional[List[ContractParty]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    value: Optional[float] = None
    currency: Optional[str] = None
    
    related_property_id: Optional[str] = None
    related_tenant_id: Optional[str] = None
    related_user_id: Optional[str] = None
    
    description: Optional[str] = None
    terms: Optional[str] = None
    renewal_info: Optional[Dict[str, Any]] = None
    type_specific_data: Optional[Dict[str, Any]] = None
    is_archived: Optional[bool] = None


class ContractResponse(BaseModel):
    id: str
    title: str
    contract_type: ContractType
    parties: List[ContractParty]
    start_date: datetime
    end_date: Optional[datetime] = None
    status: ContractStatus
    value: Optional[float] = None
    currency: str
    
    related_property_id: Optional[str] = None
    related_tenant_id: Optional[str] = None
    related_user_id: Optional[str] = None
    
    description: Optional[str] = None
    terms: Optional[str] = None
    renewal_info: Optional[Dict[str, Any]] = None
    documents: Optional[List[Dict[str, str]]] = None
    type_specific_data: Optional[Dict[str, Any]] = None
    
    created_at: datetime
    updated_at: datetime
    created_by: str
    is_archived: bool


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