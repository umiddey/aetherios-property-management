from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
from bson import ObjectId


class TechnicalObjectType(str, Enum):
    HEATING_SYSTEM = "heating_system"
    ELEVATOR = "elevator"
    INTERCOM = "intercom"
    BUILDING_MANAGEMENT = "building_management"
    SECURITY_SYSTEM = "security_system"
    VENTILATION = "ventilation"
    SOLAR_PANELS = "solar_panels"
    FIRE_SAFETY = "fire_safety"
    WATER_SYSTEM = "water_system"
    ELECTRICAL_SYSTEM = "electrical_system"


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
    
    # Basic information
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
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