"""
German Legal Compliance Service

Handles automated inspection scheduling, deadline tracking, and compliance management
based on German property management laws (BetrSichV, KÜO, DGUV V3).

Created: 2025-08-22
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from models.technical_object import TechnicalObject, TechnicalObjectType, TechnicalObjectCategory
from repositories.technical_object_repository import TechnicalObjectRepository

logger = logging.getLogger(__name__)


class ComplianceStatus(str, Enum):
    """Compliance status for technical objects"""
    COMPLIANT = "compliant"
    DUE_SOON = "due_soon"         # Within 30 days
    OVERDUE = "overdue"
    CRITICAL = "critical"         # Overdue > 90 days
    UNKNOWN = "unknown"


class InspectionUrgency(str, Enum):
    """Inspection urgency levels"""
    LOW = "low"           # > 60 days
    MEDIUM = "medium"     # 30-60 days  
    HIGH = "high"         # 7-30 days
    CRITICAL = "critical" # < 7 days or overdue


class ComplianceAlert(BaseModel):
    """Compliance alert model"""
    technical_object_id: str
    property_id: str
    object_name: str
    object_type: TechnicalObjectType
    compliance_category: TechnicalObjectCategory
    status: ComplianceStatus
    urgency: InspectionUrgency
    days_until_due: int
    next_inspection_due: datetime
    inspector_company: Optional[str] = None
    inspector_contact_name: Optional[str] = None
    inspector_phone: Optional[str] = None
    estimated_cost: Optional[float] = None
    legal_requirement: str
    consequences: str


class ComplianceSummary(BaseModel):
    """Property compliance summary"""
    property_id: str
    total_objects: int
    compliant_count: int
    due_soon_count: int
    overdue_count: int
    critical_count: int
    compliance_percentage: float
    total_estimated_costs: float
    alerts: List[ComplianceAlert]


class GermanComplianceService:
    """
    German Legal Compliance Service
    
    Manages automated inspection scheduling and compliance tracking based on:
    - BetrSichV/ÜAnlG (TÜV inspections)
    - KÜO (Schornsteinfeger inspections)  
    - DGUV V3 (Electrical safety inspections)
    """
    
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.technical_object_repository = TechnicalObjectRepository(db)
        
        # German legal inspection intervals (months)
        self.INSPECTION_INTERVALS = {
            # BetrSichV/ÜAnlG - TÜV Inspections
            TechnicalObjectType.ELEVATOR_PASSENGER: 12,
            TechnicalObjectType.ELEVATOR_FREIGHT: 12,
            TechnicalObjectType.ELEVATOR_DISABLED: 12,
            TechnicalObjectType.PRESSURE_VESSEL: 24,
            TechnicalObjectType.BOILER_SYSTEM: 12,
            TechnicalObjectType.FIRE_EXTINGUISHER: 24,
            TechnicalObjectType.EMERGENCY_LIGHTING: 12,
            
            # KÜO - Schornsteinfeger Inspections
            TechnicalObjectType.HEATING_GAS: 12,         # Annual
            TechnicalObjectType.HEATING_OIL: 12,         # Annual
            TechnicalObjectType.HEATING_WOOD: 4,         # 3x per year
            TechnicalObjectType.CHIMNEY: 36,             # Every 3 years
            
            # DGUV V3 - Electrical Safety  
            TechnicalObjectType.ELECTRICAL_INSTALLATION: 48,  # 4 years (typical)
            TechnicalObjectType.ELECTRICAL_PORTABLE: 12,      # Annual (workplace)
        }
        
        # Estimated inspection costs (EUR)
        self.INSPECTION_COSTS = {
            # TÜV costs
            TechnicalObjectType.ELEVATOR_PASSENGER: 250.0,
            TechnicalObjectType.ELEVATOR_FREIGHT: 300.0,
            TechnicalObjectType.PRESSURE_VESSEL: 180.0,
            TechnicalObjectType.BOILER_SYSTEM: 200.0,
            TechnicalObjectType.FIRE_EXTINGUISHER: 80.0,
            
            # Schornsteinfeger costs
            TechnicalObjectType.HEATING_GAS: 120.0,
            TechnicalObjectType.HEATING_OIL: 140.0,
            TechnicalObjectType.HEATING_WOOD: 160.0,
            TechnicalObjectType.CHIMNEY: 100.0,
            
            # DGUV V3 costs
            TechnicalObjectType.ELECTRICAL_INSTALLATION: 300.0,
            TechnicalObjectType.ELECTRICAL_PORTABLE: 50.0,
        }
        
        # Legal requirements descriptions
        self.LEGAL_REQUIREMENTS = {
            TechnicalObjectCategory.ELEVATORS_LIFTS: "BetrSichV §14 + EU Directive 2014/33/EU",
            TechnicalObjectCategory.PRESSURE_EQUIPMENT: "BetrSichV §15 + PED 2014/68/EU",
            TechnicalObjectCategory.FIRE_SAFETY_SYSTEMS: "BetrSichV §14 + Bauordnung",
            TechnicalObjectCategory.HEATING_COMBUSTION: "KÜO + 1. BImSchV",
            TechnicalObjectCategory.ELECTRICAL_SYSTEMS: "DGUV Vorschrift 3 (BGV A3)",
        }
        
        # Legal consequences
        self.CONSEQUENCES = {
            TechnicalObjectCategory.ELEVATORS_LIFTS: "Betriebsverbot + Bußgeld bis €50.000 + Haftung bei Unfällen",
            TechnicalObjectCategory.PRESSURE_EQUIPMENT: "Betriebsverbot + Bußgeld bis €25.000 + Versicherungsschutz erlischt",
            TechnicalObjectCategory.FIRE_SAFETY_SYSTEMS: "Bußgeld + Versicherungsschutz erlischt + Haftung bei Brandschäden",
            TechnicalObjectCategory.HEATING_COMBUSTION: "Bußgeld €50-€5.000 + Versicherungsschutz erlischt + Mietminderung",
            TechnicalObjectCategory.ELECTRICAL_SYSTEMS: "Straftat + Bußgeld + Versicherungsschutz erlischt + Betriebsverbot",
        }

    async def get_property_compliance_summary(self, property_id: str) -> ComplianceSummary:
        """Get comprehensive compliance summary for a property"""
        
        # Get all technical objects for property
        technical_objects = await self.technical_object_repository.get_by_property_id(property_id)
        
        if not technical_objects:
            return ComplianceSummary(
                property_id=property_id,
                total_objects=0,
                compliant_count=0,
                due_soon_count=0,
                overdue_count=0,
                critical_count=0,
                compliance_percentage=100.0,
                total_estimated_costs=0.0,
                alerts=[]
            )
        
        alerts = []
        total_estimated_costs = 0.0
        
        # Analyze each technical object
        for obj in technical_objects:
            alert = await self._analyze_object_compliance(obj)
            if alert:
                alerts.append(alert)
                if alert.estimated_cost:
                    total_estimated_costs += alert.estimated_cost
        
        # Calculate summary statistics
        total_objects = len(technical_objects)
        compliant_count = len([a for a in alerts if a.status == ComplianceStatus.COMPLIANT])
        due_soon_count = len([a for a in alerts if a.status == ComplianceStatus.DUE_SOON])
        overdue_count = len([a for a in alerts if a.status == ComplianceStatus.OVERDUE])
        critical_count = len([a for a in alerts if a.status == ComplianceStatus.CRITICAL])
        
        compliance_percentage = (compliant_count / total_objects * 100) if total_objects > 0 else 100.0
        
        return ComplianceSummary(
            property_id=property_id,
            total_objects=total_objects,
            compliant_count=compliant_count,
            due_soon_count=due_soon_count,
            overdue_count=overdue_count,
            critical_count=critical_count,
            compliance_percentage=compliance_percentage,
            total_estimated_costs=total_estimated_costs,
            alerts=sorted(alerts, key=lambda x: x.days_until_due)
        )

    async def get_technical_object_compliance(self, technical_object_id: str) -> Optional[ComplianceAlert]:
        """Get compliance status for a specific technical object by ID"""
        try:
            # Get the specific technical object
            technical_object = await self.technical_object_repository.get_by_id(technical_object_id)
            if not technical_object:
                return None
            
            # Analyze its compliance status
            compliance_alert = await self._analyze_object_compliance(technical_object)
            return compliance_alert
            
        except Exception as e:
            logger.error(f"Error getting compliance for technical object {technical_object_id}: {str(e)}")
            return None

    async def _analyze_object_compliance(self, obj: TechnicalObject) -> Optional[ComplianceAlert]:
        """Analyze compliance status of a single technical object"""
        
        # DEBUG: Log object type checking
        logger.error(f"🔍 COMPLIANCE DEBUG - Object: {obj.name}")
        logger.error(f"🔍 obj.object_type: '{obj.object_type}' (type: {type(obj.object_type)})")
        logger.error(f"🔍 INSPECTION_INTERVALS keys: {list(self.INSPECTION_INTERVALS.keys())}")
        logger.error(f"🔍 obj.object_type in INSPECTION_INTERVALS: {obj.object_type in self.INSPECTION_INTERVALS}")
        
        # Skip objects that don't require inspections
        # Handle both string and enum values for object_type
        object_type = obj.object_type
        if isinstance(object_type, str):
            # Convert string to enum if needed
            try:
                object_type = TechnicalObjectType(object_type)
            except ValueError:
                logger.error(f"❌ Invalid object_type: '{object_type}'")
                return None
        
        if object_type not in self.INSPECTION_INTERVALS:
            logger.error(f"❌ RETURNING NONE: object_type '{object_type}' not in INSPECTION_INTERVALS")
            return None
        
        now = datetime.now(timezone.utc)
        
        # Calculate next inspection due date if not set
        next_due = obj.next_inspection_due
        if not next_due and obj.last_inspection_date:
            interval_months = self.INSPECTION_INTERVALS[object_type]
            # Ensure timezone-aware calculation
            last_inspection = obj.last_inspection_date
            if last_inspection.tzinfo is None:
                last_inspection = last_inspection.replace(tzinfo=timezone.utc)
            next_due = last_inspection + timedelta(days=interval_months * 30)
        elif not next_due:
            # No inspection history - calculate from installation date
            if obj.installation_date:
                interval_months = self.INSPECTION_INTERVALS[object_type]
                # First inspection should have been done shortly after installation
                installation = obj.installation_date
                if installation.tzinfo is None:
                    installation = installation.replace(tzinfo=timezone.utc)
                next_due = installation + timedelta(days=interval_months * 30)
            else:
                # No installation date either - assume due now for compliance
                next_due = now
        
        # Ensure next_due is timezone-aware
        if next_due.tzinfo is None:
            next_due = next_due.replace(tzinfo=timezone.utc)
        
        # Calculate days until due
        days_until_due = (next_due - now).days
        
        # Determine compliance status
        if days_until_due > 30:
            status = ComplianceStatus.COMPLIANT
            urgency = InspectionUrgency.LOW
        elif days_until_due > 0:
            status = ComplianceStatus.DUE_SOON
            if days_until_due > 7:
                urgency = InspectionUrgency.MEDIUM
            else:
                urgency = InspectionUrgency.HIGH
        elif days_until_due > -90:
            status = ComplianceStatus.OVERDUE
            urgency = InspectionUrgency.CRITICAL
        else:
            status = ComplianceStatus.CRITICAL
            urgency = InspectionUrgency.CRITICAL
        
        return ComplianceAlert(
            technical_object_id=obj.id,
            property_id=obj.property_id,
            object_name=obj.name,
            object_type=obj.object_type,
            compliance_category=obj.compliance_category or self._get_category_for_type(obj.object_type),
            status=status,
            urgency=urgency,
            days_until_due=days_until_due,
            next_inspection_due=next_due,
            inspector_company=obj.inspector_company,
            inspector_contact_name=obj.inspector_contact_name,
            inspector_phone=obj.inspector_phone,
            estimated_cost=self.INSPECTION_COSTS.get(object_type),
            legal_requirement=self.LEGAL_REQUIREMENTS.get(
                obj.compliance_category or self._get_category_for_type(obj.object_type), 
                "German property management law"
            ),
            consequences=self.CONSEQUENCES.get(
                obj.compliance_category or self._get_category_for_type(obj.object_type),
                "Legal penalties and insurance issues"
            )
        )

    def _get_category_for_type(self, object_type: TechnicalObjectType) -> TechnicalObjectCategory:
        """Map object type to compliance category"""
        
        type_to_category = {
            # BetrSichV/ÜAnlG
            TechnicalObjectType.ELEVATOR_PASSENGER: TechnicalObjectCategory.ELEVATORS_LIFTS,
            TechnicalObjectType.ELEVATOR_FREIGHT: TechnicalObjectCategory.ELEVATORS_LIFTS,
            TechnicalObjectType.ELEVATOR_DISABLED: TechnicalObjectCategory.ELEVATORS_LIFTS,
            TechnicalObjectType.PRESSURE_VESSEL: TechnicalObjectCategory.PRESSURE_EQUIPMENT,
            TechnicalObjectType.BOILER_SYSTEM: TechnicalObjectCategory.PRESSURE_EQUIPMENT,
            TechnicalObjectType.FIRE_EXTINGUISHER: TechnicalObjectCategory.FIRE_SAFETY_SYSTEMS,
            TechnicalObjectType.EMERGENCY_LIGHTING: TechnicalObjectCategory.FIRE_SAFETY_SYSTEMS,
            
            # KÜO
            TechnicalObjectType.HEATING_GAS: TechnicalObjectCategory.HEATING_COMBUSTION,
            TechnicalObjectType.HEATING_OIL: TechnicalObjectCategory.HEATING_COMBUSTION,
            TechnicalObjectType.HEATING_WOOD: TechnicalObjectCategory.HEATING_COMBUSTION,
            TechnicalObjectType.CHIMNEY: TechnicalObjectCategory.HEATING_COMBUSTION,
            
            # DGUV V3
            TechnicalObjectType.ELECTRICAL_INSTALLATION: TechnicalObjectCategory.ELECTRICAL_SYSTEMS,
            TechnicalObjectType.ELECTRICAL_PORTABLE: TechnicalObjectCategory.ELECTRICAL_SYSTEMS,
        }
        
        return type_to_category.get(object_type, TechnicalObjectCategory.HVAC_VENTILATION)

    async def schedule_next_inspection(self, technical_object_id: str) -> datetime:
        """Schedule next inspection based on German legal requirements"""
        
        obj = await self.technical_object_repository.get_by_id(technical_object_id)
        if not obj:
            raise ValueError(f"Technical object {technical_object_id} not found")
        
        if obj.object_type not in self.INSPECTION_INTERVALS:
            raise ValueError(f"No inspection schedule defined for {obj.object_type}")
        
        interval_months = self.INSPECTION_INTERVALS[obj.object_type]
        now = datetime.now(timezone.utc)
        
        # Schedule based on last inspection or now
        base_date = obj.last_inspection_date or now
        next_due = base_date + timedelta(days=interval_months * 30)
        
        # Update technical object
        await self.technical_object_repository.update(technical_object_id, {
            "next_inspection_due": next_due,
            "inspection_interval_months": interval_months,
            "is_inspection_overdue": False
        })
        
        return next_due

    async def get_overdue_inspections(self, days_overdue: int = 0) -> List[ComplianceAlert]:
        """Get all overdue inspections across all properties"""
        
        # Get all technical objects requiring inspections
        all_objects = await self.technical_object_repository.get_all()
        overdue_alerts = []
        
        for obj in all_objects:
            if obj.object_type in self.INSPECTION_INTERVALS:
                alert = await self._analyze_object_compliance(obj)
                if alert and alert.days_until_due <= -days_overdue:
                    overdue_alerts.append(alert)
        
        return sorted(overdue_alerts, key=lambda x: x.days_until_due)

    async def mark_inspection_completed(
        self, 
        technical_object_id: str, 
        inspection_date: datetime,
        inspector_notes: Optional[str] = None
    ) -> None:
        """Mark inspection as completed and schedule next one"""
        
        obj = await self.technical_object_repository.get_by_id(technical_object_id)
        if not obj:
            raise ValueError(f"Technical object {technical_object_id} not found")
        
        # Calculate next inspection due
        if obj.object_type in self.INSPECTION_INTERVALS:
            interval_months = self.INSPECTION_INTERVALS[object_type]
            next_due = inspection_date + timedelta(days=interval_months * 30)
        else:
            next_due = None
        
        # Update object
        update_data = {
            "last_inspection_date": inspection_date,
            "next_inspection_due": next_due,
            "is_inspection_overdue": False,
            "last_modified": datetime.now(timezone.utc)
        }
        
        if inspector_notes:
            current_notes = obj.notes or ""
            update_data["notes"] = f"{current_notes}\n[{inspection_date.date()}] {inspector_notes}".strip()
        
        await self.technical_object_repository.update(technical_object_id, update_data)

    async def get_inspection_schedule_for_month(self, year: int, month: int) -> Dict[str, List[ComplianceAlert]]:
        """Get inspection schedule for a specific month"""
        
        # Date range for the month
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        
        # Get all technical objects
        all_objects = await self.technical_object_repository.get_all()
        monthly_schedule = {}
        
        for obj in all_objects:
            if obj.object_type in self.INSPECTION_INTERVALS and obj.next_inspection_due:
                if start_date <= obj.next_inspection_due < end_date:
                    day_key = obj.next_inspection_due.strftime("%Y-%m-%d")
                    
                    if day_key not in monthly_schedule:
                        monthly_schedule[day_key] = []
                    
                    alert = await self._analyze_object_compliance(obj)
                    if alert:
                        monthly_schedule[day_key].append(alert)
        
        return monthly_schedule