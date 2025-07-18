from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class RentalAgreement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str
    tenant_id: str
    start_date: datetime
    end_date: Optional[datetime] = None
    monthly_rent: float
    deposit: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_active: bool = True
    is_archived: bool = False


class RentalAgreementCreate(BaseModel):
    property_id: str
    tenant_id: str
    start_date: datetime
    end_date: Optional[datetime] = None
    monthly_rent: float = Field(..., gt=0)
    deposit: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=2000)


class RentalAgreementUpdate(BaseModel):
    property_id: Optional[str] = None
    tenant_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    monthly_rent: Optional[float] = Field(None, gt=0)
    deposit: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=2000)
    is_active: Optional[bool] = None
    is_archived: Optional[bool] = None


class RentalAgreementResponse(BaseModel):
    id: str
    property_id: str
    tenant_id: str
    start_date: datetime
    end_date: Optional[datetime] = None
    monthly_rent: float
    deposit: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: str
    is_active: bool = True
    is_archived: bool = False


class RentalAgreementFilters(BaseModel):
    property_id: Optional[str] = None
    tenant_id: Optional[str] = None
    is_active: Optional[bool] = None
    is_archived: Optional[bool] = None