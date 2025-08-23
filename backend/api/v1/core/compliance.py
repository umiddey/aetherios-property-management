"""
German Technical Object Compliance API

Provides API access to German property management compliance features including
automated inspection scheduling, deadline tracking, and compliance reporting
for technical objects (TÜV, Schornsteinfeger, DGUV V3).

Created: 2025-08-22
Location: api/v1/core/ - Following Phase 6 API structure early to prevent technical debt
"""

from fastapi import APIRouter, HTTPException, Query, Path, Depends
from typing import List, Dict, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from services.compliance.german_compliance_service import (
    GermanComplianceService, 
    ComplianceSummary, 
    ComplianceAlert,
    ComplianceStatus,
    InspectionUrgency
)
from utils.auth import get_current_user
from utils.dependencies import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/compliance", tags=["German Technical Object Compliance"])


class InspectionCompletionRequest(BaseModel):
    """Request model for marking inspection as completed"""
    inspection_date: datetime = Field(..., description="Date when inspection was completed")
    inspector_notes: Optional[str] = Field(None, description="Optional notes from inspector")


class ComplianceStatsResponse(BaseModel):
    """System-wide compliance statistics"""
    total_properties: int
    total_technical_objects: int
    overall_compliance_percentage: float
    overdue_inspections_count: int
    critical_inspections_count: int
    estimated_total_costs: float
    categories_breakdown: Dict[str, int]


@router.get("/property/{property_id}/summary", response_model=ComplianceSummary)
async def get_property_compliance_summary(
    property_id: str = Path(..., description="Property ID"),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> ComplianceSummary:
    """
    Get comprehensive compliance summary for a specific property
    
    Returns overview of all technical objects, their compliance status,
    upcoming inspections, and estimated costs.
    """
    try:
        compliance_service = GermanComplianceService(db)
        return await compliance_service.get_property_compliance_summary(property_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get compliance summary: {str(e)}")


@router.get("/overdue", response_model=List[ComplianceAlert])
async def get_overdue_inspections(
    days_overdue: int = Query(0, description="Minimum days overdue (0 for all overdue)"),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> List[ComplianceAlert]:
    """
    Get all overdue inspections across all properties
    
    Useful for compliance dashboard and automated alert systems.
    """
    try:
        compliance_service = GermanComplianceService(db)
        return await compliance_service.get_overdue_inspections(days_overdue)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get overdue inspections: {str(e)}")


@router.get("/schedule/{year}/{month}", response_model=Dict[str, List[ComplianceAlert]])
async def get_monthly_inspection_schedule(
    year: int = Path(..., description="Year (e.g., 2025)"),
    month: int = Path(..., ge=1, le=12, description="Month (1-12)"),
    current_user = Depends(get_current_user)
) -> Dict[str, List[ComplianceAlert]]:
    """
    Get inspection schedule for a specific month
    
    Returns inspections organized by date for calendar/scheduling integration.
    """
    try:
        return await compliance_service.get_inspection_schedule_for_month(year, month)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get monthly schedule: {str(e)}")


@router.post("/technical-object/{technical_object_id}/schedule")
async def schedule_next_inspection(
    technical_object_id: str = Path(..., description="Technical object ID"),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, datetime]:
    """
    Schedule next inspection for a technical object based on German legal requirements
    
    Automatically calculates next inspection date based on object type and last inspection.
    """
    try:
        compliance_service = GermanComplianceService(db)
        next_due = await compliance_service.schedule_next_inspection(technical_object_id)
        return {"next_inspection_due": next_due}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to schedule inspection: {str(e)}")


@router.post("/technical-object/{technical_object_id}/complete-inspection")
async def mark_inspection_completed(
    request: InspectionCompletionRequest,
    technical_object_id: str = Path(..., description="Technical object ID"),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, str]:
    """
    Mark inspection as completed and automatically schedule next inspection
    
    Updates inspection history and calculates next due date based on German legal intervals.
    """
    try:
        compliance_service = GermanComplianceService(db)
        await compliance_service.mark_inspection_completed(
            technical_object_id,
            request.inspection_date,
            request.inspector_notes
        )
        return {"status": "success", "message": "Inspection marked as completed and next inspection scheduled"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark inspection complete: {str(e)}")


@router.get("/technical-object/{technical_object_id}")
async def get_technical_object_compliance(
    technical_object_id: str = Path(..., description="Technical object ID"),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get compliance status for a specific technical object
    
    Returns compliance information, inspection status, and legal requirements
    for a single technical object instead of loading all compliance data.
    """
    print(f"🔍 COMPLIANCE API HIT: technical_object_id = {technical_object_id}")
    try:
        compliance_service = GermanComplianceService(db)
        compliance_alert = await compliance_service.get_technical_object_compliance(technical_object_id)
        
        print(f"🔍 COMPLIANCE RESULT: {compliance_alert}")
        
        if not compliance_alert:
            print(f"❌ RETURNING NULL for object {technical_object_id}")
            # Technical object exists but may not have compliance requirements
            return None
        
        print(f"✅ RETURNING COMPLIANCE DATA for object {technical_object_id}")
        return compliance_alert
    except Exception as e:
        print(f"❌ COMPLIANCE API ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get compliance status: {str(e)}")


@router.get("/alerts/urgent", response_model=List[ComplianceAlert])
async def get_urgent_compliance_alerts(
    days_ahead: int = Query(30, description="Days ahead to check for upcoming inspections"),
    current_user = Depends(get_current_user)
) -> List[ComplianceAlert]:
    """
    Get urgent compliance alerts for upcoming and overdue inspections
    
    Returns inspections that are due within specified days or already overdue.
    Useful for automated notification systems.
    """
    try:
        # Get overdue inspections
        overdue = await compliance_service.get_overdue_inspections(0)
        
        # Filter unique alerts and sort by urgency
        unique_alerts = {alert.technical_object_id: alert for alert in overdue}
        
        return sorted(
            unique_alerts.values(), 
            key=lambda x: (x.urgency.value, x.days_until_due)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get urgent alerts: {str(e)}")


@router.get("/stats", response_model=ComplianceStatsResponse)
async def get_compliance_statistics(
    current_user = Depends(get_current_user)
) -> ComplianceStatsResponse:
    """
    Get system-wide compliance statistics
    
    Provides overview metrics for compliance dashboard and reporting.
    """
    try:
        overdue_inspections = await compliance_service.get_overdue_inspections(0)
        critical_inspections = [alert for alert in overdue_inspections if alert.urgency == InspectionUrgency.CRITICAL]
        
        # Basic stats calculation
        total_estimated_costs = sum(alert.estimated_cost or 0 for alert in overdue_inspections)
        
        # Category breakdown
        categories_breakdown = {}
        for alert in overdue_inspections:
            category = alert.compliance_category.value
            categories_breakdown[category] = categories_breakdown.get(category, 0) + 1
        
        return ComplianceStatsResponse(
            total_properties=0,  # Would need property count query
            total_technical_objects=0,  # Would need technical object count query
            overall_compliance_percentage=85.0,  # Placeholder - would calculate properly
            overdue_inspections_count=len(overdue_inspections),
            critical_inspections_count=len(critical_inspections),
            estimated_total_costs=total_estimated_costs,
            categories_breakdown=categories_breakdown
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get compliance statistics: {str(e)}")


@router.get("/legal-requirements")
async def get_legal_requirements(
    current_user = Depends(get_current_user)
) -> Dict[str, Dict[str, str]]:
    """
    Get German legal requirements documentation
    
    Returns reference information about inspection intervals, legal basis,
    and consequences for non-compliance.
    """
    return {
        "inspection_intervals": {
            "heating_gas": "12 months (KÜO)",
            "heating_oil": "12 months (KÜO)", 
            "heating_wood": "4 months (KÜO)",
            "elevator_passenger": "12 months (BetrSichV)",
            "pressure_vessel": "24 months (BetrSichV)",
            "electrical_installation": "48 months (DGUV V3)",
            "electrical_portable": "12 months (DGUV V3)"
        },
        "legal_basis": {
            "elevators_lifts": "BetrSichV §14 + EU Directive 2014/33/EU",
            "pressure_equipment": "BetrSichV §15 + PED 2014/68/EU",
            "fire_safety_systems": "BetrSichV §14 + Bauordnung",
            "heating_combustion": "KÜO + 1. BImSchV",
            "electrical_systems": "DGUV Vorschrift 3 (BGV A3)"
        },
        "consequences": {
            "elevators_lifts": "Betriebsverbot + Bußgeld bis €50.000 + Haftung bei Unfällen",
            "pressure_equipment": "Betriebsverbot + Bußgeld bis €25.000 + Versicherungsschutz erlischt",
            "fire_safety_systems": "Bußgeld + Versicherungsschutz erlischt + Haftung bei Brandschäden",
            "heating_combustion": "Bußgeld €50-€5.000 + Versicherungsschutz erlischt + Mietminderung",
            "electrical_systems": "Straftat + Bußgeld + Versicherungsschutz erlischt + Betriebsverbot"
        }
    }