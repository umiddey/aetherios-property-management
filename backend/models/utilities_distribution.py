from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime, timezone
from enum import Enum
from bson import ObjectId


class CostType(str, Enum):
    # Heating and hot water (consumption-based allocation required)
    HEATING = "heating"
    HOT_WATER = "hot_water"
    
    # Common area costs (usually surface area based)
    CLEANING = "cleaning"
    LIGHTING = "lighting"
    ELEVATOR = "elevator"
    MAINTENANCE = "maintenance"
    
    # Equal distribution costs
    GARBAGE = "garbage"
    CHIMNEY_CLEANING = "chimney_cleaning"
    INSURANCE = "insurance"
    
    # Person-based costs
    WATER = "water"
    SEWAGE = "sewage"
    
    # Custom cost types
    OTHER = "other"


class DistributionMethod(str, Enum):
    SURFACE_AREA = "surface_area"          # By m² (most common)
    APARTMENT_COUNT = "apartment_count"    # Equal distribution
    PERSON_COUNT = "person_count"          # By number of residents
    CONSUMPTION_BASED = "consumption"      # Actual meter readings
    CUSTOM = "custom"                      # Manual percentages


class UtilitiesDistribution(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    property_id: str = Field(..., description="ID of the building/complex this distribution applies to")
    cost_type: CostType
    distribution_method: DistributionMethod
    
    # Percentage allocation per apartment/unit
    # Key: apartment_property_id, Value: percentage (0.0 to 1.0)
    percentage_allocation: Dict[str, float] = Field(default_factory=dict)
    
    # Additional metadata
    description: Optional[str] = None
    valid_from: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    valid_until: Optional[datetime] = None
    
    # Audit fields
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    last_modified: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    modified_by: str
    is_active: bool = True


class UtilitiesDistributionCreate(BaseModel):
    property_id: str = Field(..., description="ID of the building/complex this distribution applies to")
    cost_type: CostType
    distribution_method: DistributionMethod
    percentage_allocation: Dict[str, float] = Field(default_factory=dict)
    description: Optional[str] = None
    valid_from: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    valid_until: Optional[datetime] = None
    created_by: str


class UtilitiesDistributionUpdate(BaseModel):
    cost_type: Optional[CostType] = None
    distribution_method: Optional[DistributionMethod] = None
    percentage_allocation: Optional[Dict[str, float]] = None
    description: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    modified_by: str
    is_active: Optional[bool] = None


class DistributionCalculationResult(BaseModel):
    """Result of cost distribution calculation"""
    apartment_id: str
    apartment_name: str
    cost_type: CostType
    total_cost_amount: float
    allocated_amount: float
    allocation_percentage: float
    distribution_method: DistributionMethod
    calculation_basis: str  # e.g., "45 m² of 180 m² total" or "2 persons of 8 total"


class BuildingDistributionSummary(BaseModel):
    """Summary of all cost distributions for a building"""
    property_id: str
    property_name: str
    total_apartments: int
    distributions: list[UtilitiesDistribution]
    calculation_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))