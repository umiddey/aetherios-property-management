from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class PropertyType(str, Enum):
    APARTMENT = "apartment"
    HOUSE = "house"
    OFFICE = "office"
    COMMERCIAL = "commercial"
    COMPLEX = "complex"


class PropertyStatus(str, Enum):
    ACTIVE = "active"
    CANCEL = "cancel"
    EMPTY = "empty"


class Property(BaseModel):
    id: str  # User-defined ID (format: whoobjectnumber)
    name: str
    property_type: PropertyType
    street: str
    house_nr: str
    postcode: str
    city: str
    floor: Optional[str] = None
    surface_area: float
    number_of_rooms: int
    num_toilets: Optional[int] = None
    description: Optional[str] = None
    rent_per_sqm: Optional[float] = None
    cold_rent: Optional[float] = None
    status: PropertyStatus = PropertyStatus.EMPTY
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    parent_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_archived: bool = False


class PropertyCreate(BaseModel):
    id: str = Field(..., min_length=3, max_length=50)  # User must provide ID
    name: str
    property_type: PropertyType
    street: str
    house_nr: str
    postcode: str
    city: str
    floor: Optional[str] = None
    surface_area: float
    number_of_rooms: int
    num_toilets: Optional[int] = None
    description: Optional[str] = None
    rent_per_sqm: float
    cold_rent: Optional[float] = None
    status: PropertyStatus = PropertyStatus.EMPTY
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    parent_id: Optional[str] = None


class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    property_type: Optional[PropertyType] = None
    street: Optional[str] = None
    house_nr: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    floor: Optional[str] = None
    surface_area: Optional[float] = None
    number_of_rooms: Optional[int] = None
    num_toilets: Optional[int] = None
    description: Optional[str] = None
    rent_per_sqm: Optional[float] = None
    cold_rent: Optional[float] = None
    status: Optional[PropertyStatus] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    parent_id: Optional[str] = None
    is_archived: Optional[bool] = None


class PropertyFilters(BaseModel):
    property_type: Optional[PropertyType] = None
    min_rooms: Optional[int] = None
    max_rooms: Optional[int] = None
    min_surface: Optional[float] = None
    max_surface: Optional[float] = None
    status: Optional[PropertyStatus] = None
    archived: Optional[bool] = None
    city: Optional[str] = None
    parent_id: Optional[str] = None
    search: Optional[str] = None