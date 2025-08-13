from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class PropertyType(str, Enum):
    APARTMENT = "apartment"
    HOUSE = "house"
    OFFICE = "office"
    COMMERCIAL = "commercial"
    BUILDING = "building"
    COMPLEX = "complex"


class PropertyStatus(str, Enum):
    ACTIVE = "active"
    CANCEL = "cancel"
    EMPTY = "empty"


class FurnishingStatus(str, Enum):
    FURNISHED = "furnished"
    UNFURNISHED = "unfurnished"
    PARTIALLY_FURNISHED = "partially_furnished"


class EnergieCertificateType(str, Enum):
    VERBRAUCHSAUSWEIS = "verbrauchsausweis"  # Consumption-based
    BEDARFSAUSWEIS = "bedarfsausweis"        # Demand-based


class EnergyClass(str, Enum):
    A_PLUS = "A+"
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    F = "F"
    G = "G"
    H = "H"


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
    max_tenants: Optional[int] = None  # Maximum number of tenants allowed
    description: Optional[str] = None
    rent_per_sqm: Optional[float] = None
    betriebskosten_per_sqm: Optional[float] = None  # German operating costs per m²
    cold_rent: Optional[float] = None
    status: PropertyStatus = PropertyStatus.EMPTY
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: str = Field(..., description="User ID of the property manager responsible for this property")
    furnishing_status: FurnishingStatus = FurnishingStatus.UNFURNISHED
    owned_by_firm: bool = Field(default=False, description="True if property is owned by the property management firm")
    
    # German Legal Compliance Fields - Property Characteristics Only
    # Energy certificate (GEG mandatory - building characteristic)
    energieausweis_type: Optional[EnergieCertificateType] = None
    energieausweis_class: Optional[EnergyClass] = None
    energieausweis_value: Optional[float] = None  # kWh/(m²·a)
    energieausweis_expiry: Optional[datetime] = None
    energieausweis_co2: Optional[float] = None  # kg CO2/(m²·a)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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
    max_tenants: Optional[int] = None  # Maximum number of tenants allowed
    description: Optional[str] = None
    rent_per_sqm: float
    betriebskosten_per_sqm: Optional[float] = None  # German operating costs per m²
    cold_rent: Optional[float] = None
    status: PropertyStatus = PropertyStatus.EMPTY
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: str = Field(..., description="User ID of the property manager responsible for this property")
    furnishing_status: FurnishingStatus = FurnishingStatus.UNFURNISHED
    owned_by_firm: bool = Field(default=False, description="True if property is owned by the property management firm")
    
    # German Legal Compliance Fields - Property Characteristics Only
    # Energy certificate (GEG mandatory - building characteristic)
    energieausweis_type: Optional[EnergieCertificateType] = None
    energieausweis_class: Optional[EnergyClass] = None
    energieausweis_value: Optional[float] = None  # kWh/(m²·a)
    energieausweis_expiry: Optional[datetime] = None
    energieausweis_co2: Optional[float] = None  # kg CO2/(m²·a)

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
    max_tenants: Optional[int] = None
    description: Optional[str] = None
    rent_per_sqm: Optional[float] = None
    betriebskosten_per_sqm: Optional[float] = None  # German operating costs per m²
    cold_rent: Optional[float] = None
    status: Optional[PropertyStatus] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: Optional[str] = Field(None, description="User ID of the property manager responsible for this property")
    furnishing_status: Optional[FurnishingStatus] = None
    owned_by_firm: Optional[bool] = None
    
    # German Legal Compliance Fields - Property Characteristics Only
    # Energy certificate (GEG mandatory - building characteristic)
    energieausweis_type: Optional[EnergieCertificateType] = None
    energieausweis_class: Optional[EnergyClass] = None
    energieausweis_value: Optional[float] = None  # kWh/(m²·a)
    energieausweis_expiry: Optional[datetime] = None
    energieausweis_co2: Optional[float] = None  # kg CO2/(m²·a)
    
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
    furnishing_status: Optional[FurnishingStatus] = None
    search: Optional[str] = None