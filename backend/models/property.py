from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Union, Literal
from datetime import datetime, timezone
from enum import Enum
import uuid


class PropertyType(str, Enum):
    COMPLEX = "complex"      # Immobilienkomplex (top level)
    BUILDING = "building"    # Gebäude (within complex)
    UNIT = "unit"           # Einheit (within building)


class UnitType(str, Enum):
    APARTMENT = "apartment"  # Wohnung
    HOUSE = "house"         # Haus (can be standalone or in complex)
    OFFICE = "office"       # Büro
    COMMERCIAL = "commercial" # Gewerbe
    STORAGE = "storage"     # Lager/Keller
    PARKING = "parking"     # Stellplatz


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


# Base Property class - contains fields ALL property types have
class PropertyBase(BaseModel):
    id: str = Field(..., description="User-defined ID")
    name: str
    street: str
    house_nr: str
    postcode: str
    city: str
    floor: Optional[str] = None
    surface_area: float
    number_of_rooms: int
    description: Optional[str] = None
    status: PropertyStatus = PropertyStatus.EMPTY
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    manager_id: str = Field(..., description="User ID of the property manager")
    owned_by_firm: bool = Field(default=False)
    
    # German Legal Compliance Fields
    energieausweis_type: Optional[EnergieCertificateType] = None
    energieausweis_class: Optional[EnergyClass] = None
    energieausweis_value: Optional[float] = None  # kWh/(m²·a)
    energieausweis_expiry: Optional[datetime] = None
    energieausweis_co2: Optional[float] = None  # kg CO2/(m²·a)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    is_archived: bool = False


# Complex - top level container, no parent, no rental fields
class Complex(PropertyBase):
    property_type: Literal["complex"] = "complex"
    # Complexes have no additional fields - just the base property info


# Building - inherits all Complex fields + can have rental info + must have Complex parent  
class Building(PropertyBase):
    property_type: Literal["building"] = "building"
    parent_id: str = Field(..., description="Must reference a Complex")
    furnishing_status: FurnishingStatus = FurnishingStatus.UNFURNISHED
    
    # Buildings CAN have rental fields (if rented as whole building)
    rent_per_sqm: Optional[float] = None
    betriebskosten_per_sqm: Optional[float] = None
    cold_rent: Optional[float] = None


# Unit - inherits all Building fields + requires unit_type + requires rental fields
class Unit(PropertyBase):
    property_type: Literal["unit"] = "unit" 
    unit_type: UnitType = Field(..., description="Type of unit")
    parent_id: str = Field(..., description="Must reference a Building")
    furnishing_status: FurnishingStatus = FurnishingStatus.UNFURNISHED
    
    # Units MUST have rental fields (they are always rentable)
    rent_per_sqm: float = Field(..., description="Required for units")
    betriebskosten_per_sqm: Optional[float] = None
    cold_rent: Optional[float] = None
    num_toilets: Optional[int] = None
    max_tenants: Optional[int] = None


# Union type for API endpoints
Property = Union[Complex, Building, Unit]


# Create models with same inheritance pattern
class PropertyCreateBase(BaseModel):
    id: str = Field(..., min_length=3, max_length=50)
    name: str
    street: str
    house_nr: str
    postcode: str
    city: str
    floor: Optional[str] = None
    surface_area: float
    number_of_rooms: int
    description: Optional[str] = None
    status: PropertyStatus = PropertyStatus.EMPTY
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    manager_id: str = Field(..., description="User ID of the property manager")
    owned_by_firm: bool = Field(default=False)
    
    # German Legal Compliance Fields
    energieausweis_type: Optional[EnergieCertificateType] = None
    energieausweis_class: Optional[EnergyClass] = None
    energieausweis_value: Optional[float] = None
    energieausweis_expiry: Optional[datetime] = None
    energieausweis_co2: Optional[float] = None


class ComplexCreate(PropertyCreateBase):
    property_type: Literal["complex"] = "complex"


class BuildingCreate(PropertyCreateBase):
    property_type: Literal["building"] = "building"
    parent_id: str = Field(..., description="Must reference a Complex")
    furnishing_status: FurnishingStatus = FurnishingStatus.UNFURNISHED
    rent_per_sqm: Optional[float] = None
    betriebskosten_per_sqm: Optional[float] = None
    cold_rent: Optional[float] = None


class UnitCreate(PropertyCreateBase):
    property_type: Literal["unit"] = "unit"
    unit_type: UnitType = Field(..., description="Type of unit")
    parent_id: str = Field(..., description="Must reference a Building")
    furnishing_status: FurnishingStatus = FurnishingStatus.UNFURNISHED
    rent_per_sqm: float = Field(..., description="Required for units")
    betriebskosten_per_sqm: Optional[float] = None
    cold_rent: Optional[float] = None
    num_toilets: Optional[int] = None
    max_tenants: Optional[int] = None


# Union type for API create endpoints
PropertyCreate = Union[ComplexCreate, BuildingCreate, UnitCreate]

# Update model - just make everything optional for now
class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    street: Optional[str] = None
    house_nr: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    floor: Optional[str] = None
    surface_area: Optional[float] = None
    number_of_rooms: Optional[int] = None
    description: Optional[str] = None
    status: Optional[PropertyStatus] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None
    furnishing_status: Optional[FurnishingStatus] = None
    owned_by_firm: Optional[bool] = None
    
    # Unit-specific optional fields
    unit_type: Optional[UnitType] = None
    rent_per_sqm: Optional[float] = None
    betriebskosten_per_sqm: Optional[float] = None
    cold_rent: Optional[float] = None
    num_toilets: Optional[int] = None
    max_tenants: Optional[int] = None
    
    # German Legal Compliance Fields
    energieausweis_type: Optional[EnergieCertificateType] = None
    energieausweis_class: Optional[EnergyClass] = None
    energieausweis_value: Optional[float] = None
    energieausweis_expiry: Optional[datetime] = None
    energieausweis_co2: Optional[float] = None
    
    is_archived: Optional[bool] = None


class PropertyFilters(BaseModel):
    property_type: Optional[PropertyType] = None
    property_type_in: Optional[List[PropertyType]] = None
    unit_type: Optional[UnitType] = None
    unit_type_in: Optional[List[UnitType]] = None
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