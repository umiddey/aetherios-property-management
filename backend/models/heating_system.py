from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Literal, Union
from datetime import datetime, timezone
from enum import Enum
from models.technical_object import TechnicalObject, TechnicalObjectCreate, TechnicalObjectUpdate, TechnicalObjectType


class HeatingType(str, Enum):
    ZENTRALHEIZUNG = "zentralheizung"  # Central heating
    ETAGENHEIZUNG = "etagenheizung"    # Floor heating
    EINZELHEIZUNG = "einzelheizung"    # Individual heating


class HeatingDistributionKey(str, Enum):
    SURFACE_AREA = "surface_area"
    APARTMENT_COUNT = "apartment_count"
    CONSUMPTION = "consumption"


class FuelType(str, Enum):
    GAS = "gas"
    OIL = "oil"
    ELECTRICITY = "electricity"
    DISTRICT_HEATING = "district_heating"
    HEAT_PUMP = "heat_pump"
    BIOMASS = "biomass"
    SOLAR = "solar"
    HYBRID = "hybrid"


class HeatingEfficiencyClass(str, Enum):
    A_PLUS_PLUS_PLUS = "A+++"
    A_PLUS_PLUS = "A++"
    A_PLUS = "A+"
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    F = "F"
    G = "G"


class HeatingSystem(TechnicalObject):
    """Heating system as a technical object - MOVED FROM PROPERTY MODEL"""
    
    # Override object_type to support all heating types - updated for German compliance
    object_type: Union[
        Literal[TechnicalObjectType.HEATING_GAS],
        Literal[TechnicalObjectType.HEATING_OIL], 
        Literal[TechnicalObjectType.HEATING_WOOD]
    ]
    
    # Heating-specific fields
    heating_type: HeatingType
    heating_distribution_key: HeatingDistributionKey
    fuel_type: FuelType
    efficiency_class: Optional[HeatingEfficiencyClass] = None
    efficiency_percentage: Optional[float] = None  # e.g., 0.95 for 95%
    
    # Technical specifications
    power_output_kw: Optional[float] = None
    heating_area_sqm: Optional[float] = None
    hot_water_capacity_liters: Optional[int] = None
    
    # Operating costs and consumption
    annual_fuel_consumption: Optional[float] = None
    annual_operating_cost: Optional[float] = None
    co2_emissions_kg_per_year: Optional[float] = None
    
    # German legal compliance
    betrKV_compliant: bool = Field(default=True, description="Complies with German BetrKV regulations")
    cost_allocation_setup: bool = Field(default=False, description="Cost allocation meters/system setup")
    
    # Specific heating system data
    radiator_count: Optional[int] = None
    has_smart_thermostats: bool = False
    remote_monitoring: bool = False


class HeatingSystemCreate(TechnicalObjectCreate):
    """Create model for heating systems"""
    
    # Override to support all heating types
    object_type: Union[
        Literal[TechnicalObjectType.HEATING_GAS],
        Literal[TechnicalObjectType.HEATING_OIL], 
        Literal[TechnicalObjectType.HEATING_WOOD]
    ]
    
    # Required heating-specific fields
    heating_type: HeatingType
    heating_distribution_key: HeatingDistributionKey
    fuel_type: FuelType
    
    # Optional heating fields
    efficiency_class: Optional[HeatingEfficiencyClass] = None
    efficiency_percentage: Optional[float] = None
    power_output_kw: Optional[float] = None
    heating_area_sqm: Optional[float] = None
    hot_water_capacity_liters: Optional[int] = None
    annual_fuel_consumption: Optional[float] = None
    annual_operating_cost: Optional[float] = None
    co2_emissions_kg_per_year: Optional[float] = None
    betrKV_compliant: bool = True
    cost_allocation_setup: bool = False
    radiator_count: Optional[int] = None
    has_smart_thermostats: bool = False
    remote_monitoring: bool = False


class HeatingSystemUpdate(TechnicalObjectUpdate):
    """Update model for heating systems"""
    
    heating_type: Optional[HeatingType] = None
    heating_distribution_key: Optional[HeatingDistributionKey] = None
    fuel_type: Optional[FuelType] = None
    efficiency_class: Optional[HeatingEfficiencyClass] = None
    efficiency_percentage: Optional[float] = None
    power_output_kw: Optional[float] = None
    heating_area_sqm: Optional[float] = None
    hot_water_capacity_liters: Optional[int] = None
    annual_fuel_consumption: Optional[float] = None
    annual_operating_cost: Optional[float] = None
    co2_emissions_kg_per_year: Optional[float] = None
    betrKV_compliant: Optional[bool] = None
    cost_allocation_setup: Optional[bool] = None
    radiator_count: Optional[int] = None
    has_smart_thermostats: Optional[bool] = None
    remote_monitoring: Optional[bool] = None


class HeatingSystemSummary(BaseModel):
    """Summary model for heating system in property context"""
    id: str
    name: str
    heating_type: HeatingType
    fuel_type: FuelType
    efficiency_class: Optional[HeatingEfficiencyClass]
    status: str
    serves_units: List[str]
    annual_operating_cost: Optional[float]
    last_maintenance_date: Optional[datetime]
    next_maintenance_date: Optional[datetime]
    betrKV_compliant: bool


class HeatingCostAllocation(BaseModel):
    """Model for heating cost allocation calculations"""
    heating_system_id: str
    property_id: str
    allocation_period: str  # e.g., "2025-01"
    distribution_method: HeatingDistributionKey
    total_cost: float
    unit_allocations: Dict[str, float]  # unit_id -> allocated_cost
    calculation_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    calculated_by: str