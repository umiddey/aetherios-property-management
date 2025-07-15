from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"


class PaymentMethod(str, Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CARD = "card"
    CHECK = "check"


class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    tenant_id: str
    property_id: str
    amount: float
    description: str
    invoice_date: datetime
    due_date: datetime
    status: InvoiceStatus = InvoiceStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_archived: bool = False


class InvoiceCreate(BaseModel):
    tenant_id: str
    property_id: str
    amount: float
    description: str
    invoice_date: datetime
    due_date: datetime


class InvoiceUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    status: Optional[InvoiceStatus] = None
    is_archived: Optional[bool] = None


class InvoiceFilters(BaseModel):
    tenant_id: Optional[str] = None
    property_id: Optional[str] = None
    status: Optional[InvoiceStatus] = None
    archived: Optional[bool] = None
    overdue_only: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_id: str
    amount: float
    payment_date: datetime
    payment_method: PaymentMethod
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str


class PaymentCreate(BaseModel):
    invoice_id: str
    amount: float
    payment_date: datetime
    payment_method: PaymentMethod
    notes: Optional[str] = None


class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    payment_date: Optional[datetime] = None
    payment_method: Optional[PaymentMethod] = None
    notes: Optional[str] = None