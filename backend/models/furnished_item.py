from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class ItemCategory(str, Enum):
    FURNITURE = "furniture"
    APPLIANCE = "appliance"
    ELECTRONICS = "electronics"
    KITCHEN = "kitchen"
    BATHROOM = "bathroom"
    DECORATION = "decoration"
    LIGHTING = "lighting"
    OTHER = "other"


class ItemCondition(str, Enum):
    NEW = "new"
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class ItemOwnership(str, Enum):
    LANDLORD = "landlord"
    TENANT = "tenant"


class FurnishedItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str = Field(..., description="ID of the property this item belongs to")
    name: str = Field(..., min_length=1, max_length=200)
    category: ItemCategory
    description: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    condition: ItemCondition = ItemCondition.GOOD
    ownership: ItemOwnership = ItemOwnership.LANDLORD
    warranty_until: Optional[datetime] = None
    maintenance_notes: Optional[str] = None
    is_essential: bool = False  # Required for basic living (affects legal liability)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_active: bool = True


class FurnishedItemCreate(BaseModel):
    property_id: str
    name: str = Field(..., min_length=1, max_length=200)
    category: ItemCategory
    description: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    condition: ItemCondition = ItemCondition.GOOD
    ownership: ItemOwnership = ItemOwnership.LANDLORD
    warranty_until: Optional[datetime] = None
    maintenance_notes: Optional[str] = None
    is_essential: bool = False


class FurnishedItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[ItemCategory] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    condition: Optional[ItemCondition] = None
    ownership: Optional[ItemOwnership] = None
    warranty_until: Optional[datetime] = None
    maintenance_notes: Optional[str] = None
    is_essential: Optional[bool] = None
    is_active: Optional[bool] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class FurnishedItemFilters(BaseModel):
    property_id: Optional[str] = None
    category: Optional[ItemCategory] = None
    condition: Optional[ItemCondition] = None
    ownership: Optional[ItemOwnership] = None
    is_essential: Optional[bool] = None
    is_active: Optional[bool] = None
    search: Optional[str] = None