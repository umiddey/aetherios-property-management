from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
from bson import ObjectId


class TechnicalObjectCategory(str, Enum):
    """German Legal Compliance Categories for Technical Objects (2024-2025)"""
    # BetrSichV/ÜAnlG Categories - Überwachungsbedürftige Anlagen
    ELEVATORS_LIFTS = "elevators_lifts"             # TÜV mandatory - Directive 2014/33/EU
    PRESSURE_EQUIPMENT = "pressure_equipment"        # TÜV mandatory - Boilers, pressure vessels
    FIRE_SAFETY_SYSTEMS = "fire_safety_systems"     # TÜV mandatory - Emergency systems
    
    # Schornsteinfeger Categories
    HEATING_COMBUSTION = "heating_combustion"        # Schornsteinfeger 1-3x/year
    
    # DGUV V3 Categories  
    ELECTRICAL_SYSTEMS = "electrical_systems"       # DGUV V3 - 6mo to 4yr intervals
    
    # Standard Building Systems
    HVAC_VENTILATION = "hvac_ventilation"           # Regular maintenance
    WATER_SANITARY = "water_sanitary"               # Sanitär, Entwässerung
    BUILDING_ENVELOPE = "building_envelope"          # Roof, facades, windows
    COMMUNICATION = "communication"                 # Intercom, building management
    SECURITY_ACCESS = "security_access"             # Security, access control


class TechnicalObjectType(str, Enum):
    # BetrSichV/ÜAnlG Mandatory Inspection Types
    ELEVATOR_PASSENGER = "elevator_passenger"       # TÜV - Passenger elevators
    ELEVATOR_FREIGHT = "elevator_freight"           # TÜV - Freight elevators  
    ELEVATOR_DISABLED = "elevator_disabled"         # TÜV - Disabled access elevators
    PRESSURE_VESSEL = "pressure_vessel"             # TÜV - Pressure vessels
    BOILER_SYSTEM = "boiler_system"                 # TÜV - Boiler systems
    FIRE_EXTINGUISHER = "fire_extinguisher"        # TÜV - Fire safety systems
    EMERGENCY_LIGHTING = "emergency_lighting"       # TÜV - Emergency systems
    
    # Schornsteinfeger Types
    HEATING_GAS = "heating_gas"                     # Schornsteinfeger - Gas heating
    HEATING_OIL = "heating_oil"                     # Schornsteinfeger - Oil heating
    HEATING_WOOD = "heating_wood"                   # Schornsteinfeger - Wood heating
    CHIMNEY = "chimney"                             # Schornsteinfeger - Chimney
    
    # DGUV V3 Electrical Types
    ELECTRICAL_INSTALLATION = "electrical_installation"  # DGUV V3 - Fixed installations
    ELECTRICAL_PORTABLE = "electrical_portable"          # DGUV V3 - Portable equipment
    
    # Standard Building Systems
    VENTILATION = "ventilation"
    AIR_CONDITIONING = "air_conditioning"
    WATER_SUPPLY = "water_supply"
    SEWAGE_SYSTEM = "sewage_system"
    INTERCOM = "intercom"
    SECURITY_SYSTEM = "security_system"
    SOLAR_PANELS = "solar_panels"
    BUILDING_MANAGEMENT = "building_management"


class TechnicalObjectStatus(str, Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    BROKEN = "broken"
    DECOMMISSIONED = "decommissioned"
    PLANNED = "planned"


class MaintenanceScheduleType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class TechnicalObject(BaseModel):
    """Base model for all technical objects in a property"""
    id: str = Field(default_factory=lambda: str(ObjectId()))
    property_id: str = Field(..., description="ID of the property this technical object belongs to")
    object_type: TechnicalObjectType
    name: str = Field(..., description="Human-readable name for this technical object")
    
    # German compliance category
    compliance_category: Optional[TechnicalObjectCategory] = None
    
    # Basic information
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    location: Optional[str] = None  # Physical location within property (e.g., "Basement", "Roof", "Unit 3A")
    installation_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None
    
    # Status and operational info
    status: TechnicalObjectStatus = TechnicalObjectStatus.ACTIVE
    last_maintenance_date: Optional[datetime] = None
    next_maintenance_date: Optional[datetime] = None
    maintenance_schedule: Optional[MaintenanceScheduleType] = None
    
    # German Legal Compliance Tracking
    last_inspection_date: Optional[datetime] = None
    next_inspection_due: Optional[datetime] = None
    inspection_interval_months: Optional[int] = None  # e.g., 12 for yearly TÜV
    is_inspection_overdue: bool = Field(default=False, description="Auto-calculated field")
    
    # Inspector Information
    inspector_company: Optional[str] = None      # e.g., "TÜV Süd", "Schornsteinfeger Müller"
    inspector_contact_name: Optional[str] = None
    inspector_phone: Optional[str] = None
    inspector_email: Optional[str] = None
    inspector_license_number: Optional[str] = None
    
    # Financial information
    purchase_cost: Optional[float] = None
    installation_cost: Optional[float] = None
    annual_maintenance_cost: Optional[float] = None
    annual_inspection_cost: Optional[float] = None
    
    # Serves which units (apartments/offices)
    serves_units: List[str] = Field(default_factory=list, description="List of property unit IDs this object serves")
    
    # Additional metadata (flexible for different object types)
    specifications: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = None
    
    # Audit fields
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    last_modified: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    modified_by: str
    is_active: bool = True


class TechnicalObjectCreate(BaseModel):
    property_id: str = Field(..., description="ID of the property this technical object belongs to")
    object_type: TechnicalObjectType
    name: str = Field(..., description="Human-readable name for this technical object")
    
    # Basic information
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    location: Optional[str] = None  # Physical location within property
    installation_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None
    
    # Status and operational info
    status: TechnicalObjectStatus = TechnicalObjectStatus.ACTIVE
    last_maintenance_date: Optional[datetime] = None
    next_maintenance_date: Optional[datetime] = None
    maintenance_schedule: Optional[MaintenanceScheduleType] = None
    
    # Financial information
    purchase_cost: Optional[float] = None
    installation_cost: Optional[float] = None
    annual_maintenance_cost: Optional[float] = None
    
    # Serves which units
    serves_units: List[str] = Field(default_factory=list)
    
    # Additional metadata
    specifications: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = None
    
    # Audit (auto-populated from JWT token)
    created_by: Optional[str] = None


class TechnicalObjectUpdate(BaseModel):
    name: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    location: Optional[str] = None
    installation_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None
    status: Optional[TechnicalObjectStatus] = None
    last_maintenance_date: Optional[datetime] = None
    next_maintenance_date: Optional[datetime] = None
    maintenance_schedule: Optional[MaintenanceScheduleType] = None
    purchase_cost: Optional[float] = None
    installation_cost: Optional[float] = None
    annual_maintenance_cost: Optional[float] = None
    serves_units: Optional[List[str]] = None
    specifications: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    modified_by: str
    is_active: Optional[bool] = None


class TechnicalObjectFilters(BaseModel):
    property_id: Optional[str] = None
    object_type: Optional[TechnicalObjectType] = None
    status: Optional[TechnicalObjectStatus] = None
    manufacturer: Optional[str] = None
    maintenance_due: Optional[bool] = None  # Objects needing maintenance
    warranty_expiring: Optional[bool] = None  # Objects with expiring warranty
    serves_unit: Optional[str] = None  # Objects serving specific unit