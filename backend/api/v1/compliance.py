"""
Compliance API Endpoints - Contractor License Management
Provides admin-only access to contractor licensing system for regulatory compliance.

CRITICAL ENTERPRISE FEATURE:
- Eliminates legal liability from unlicensed contractor assignments
- Ensures regulatory compliance for property management operations
- Automated license expiration tracking and blocking
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional, Dict, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from services.contractor_service import ContractorService
from models.contractor_license import ContractorLicense, LicenseType, VerificationStatus
from utils.auth import get_current_user, get_property_manager_admin
from utils.dependencies import get_database
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models for API requests/responses
from pydantic import BaseModel, Field

class LicenseCreateRequest(BaseModel):
    """Request model for creating a new contractor license"""
    contractor_id: str = Field(..., description="ID of the contractor")
    license_type: LicenseType = Field(..., description="Type of license")
    license_number: str = Field(..., min_length=1, max_length=50, description="Official license number")
    issuing_authority: str = Field(..., min_length=1, max_length=100, description="Authority that issued license")
    issue_date: datetime = Field(..., description="Date license was issued")
    expiration_date: datetime = Field(..., description="Date license expires")
    verification_notes: Optional[str] = Field(None, max_length=500, description="Initial verification notes")

class LicenseUpdateRequest(BaseModel):
    """Request model for updating an existing contractor license"""
    license_type: Optional[LicenseType] = Field(None, description="Type of license")
    license_number: Optional[str] = Field(None, min_length=1, max_length=50, description="Official license number")
    issuing_authority: Optional[str] = Field(None, min_length=1, max_length=100, description="Authority that issued license")
    issue_date: Optional[datetime] = Field(None, description="Date license was issued")
    expiration_date: Optional[datetime] = Field(None, description="Date license expires")
    verification_status: Optional[VerificationStatus] = Field(None, description="Verification status")
    verification_notes: Optional[str] = Field(None, max_length=500, description="Verification notes")

class LicenseVerificationRequest(BaseModel):
    """Request model for updating license verification status"""
    verification_status: VerificationStatus = Field(..., description="New verification status")
    verification_notes: Optional[str] = Field(None, max_length=500, description="Verification notes")

class LicenseResponse(BaseModel):
    """Response model for contractor license"""
    license_id: Optional[str] = Field(None, description="License ID")
    contractor_id: str = Field(..., description="Contractor ID")
    license_type: LicenseType = Field(..., description="License type")
    license_number: str = Field(..., description="License number")
    issuing_authority: str = Field(..., description="Issuing authority")
    issue_date: datetime = Field(..., description="Issue date")
    expiration_date: datetime = Field(..., description="Expiration date")
    verification_status: VerificationStatus = Field(..., description="Verification status")
    verification_date: Optional[datetime] = Field(None, description="Last verification date")
    verification_notes: Optional[str] = Field(None, description="Verification notes")
    created_at: datetime = Field(..., description="Creation date")
    updated_at: datetime = Field(..., description="Last update date")
    
    # Computed fields
    is_expired: bool = Field(..., description="Whether license is expired")
    days_until_expiration: int = Field(..., description="Days until expiration (negative if expired)")
    is_valid_for_assignment: bool = Field(..., description="Whether license is valid for contractor assignment")

    @classmethod
    def from_license(cls, license_obj: ContractorLicense) -> "LicenseResponse":
        """Create response from ContractorLicense object"""
        return cls(
            license_id=license_obj.license_id,
            contractor_id=license_obj.contractor_id,
            license_type=license_obj.license_type,
            license_number=license_obj.license_number,
            issuing_authority=license_obj.issuing_authority,
            issue_date=license_obj.issue_date,
            expiration_date=license_obj.expiration_date,
            verification_status=license_obj.verification_status,
            verification_date=license_obj.verification_date,
            verification_notes=license_obj.verification_notes,
            created_at=license_obj.created_at,
            updated_at=license_obj.updated_at,
            is_expired=license_obj.is_expired(),
            days_until_expiration=license_obj.days_until_expiration(),
            is_valid_for_assignment=license_obj.is_valid_for_assignment()
        )

class ExpiringLicenseResponse(BaseModel):
    """Response model for expiring licenses with contractor details"""
    contractor_name: str = Field(..., description="Contractor full name")
    contractor_email: str = Field(..., description="Contractor email")
    license_count: int = Field(..., description="Number of expiring licenses")
    licenses: List[LicenseResponse] = Field(..., description="List of expiring licenses")

class LicenseSummaryResponse(BaseModel):
    """Response model for contractor license summary"""
    contractor_id: str = Field(..., description="Contractor ID")
    contractor_name: str = Field(..., description="Contractor full name")
    total_licenses: int = Field(..., description="Total number of licenses")
    valid_licenses: int = Field(..., description="Number of valid licenses")
    expired_licenses: int = Field(..., description="Number of expired licenses")
    expiring_soon: int = Field(..., description="Number of licenses expiring within 30 days")
    pending_verification: int = Field(..., description="Number of licenses pending verification")
    is_eligible_for_assignment: bool = Field(..., description="Whether contractor is eligible for assignments")
    licenses: List[LicenseResponse] = Field(..., description="All contractor licenses")

# License management requires property_manager_admin or super_admin privileges

# API Endpoints
# NOTE: Specific routes must come before generic parameterized routes

@router.get("/licenses/expiring", response_model=List[ExpiringLicenseResponse])
async def get_expiring_licenses(
    days_ahead: int = Query(30, ge=1, le=365, description="Number of days ahead to check for expiring licenses"),
    current_user = Depends(get_property_manager_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get licenses expiring within specified days with contractor details
    
    **Property Manager Admin+**: Critical for compliance monitoring and proactive license management
    """
    try:
        contractor_service = ContractorService(db)
        
        expiring_data = await contractor_service.get_expiring_licenses(days_ahead)
        
        response = []
        for contractor_data in expiring_data:
            licenses = [LicenseResponse.from_license(license) for license in contractor_data["licenses"]]
            response.append(ExpiringLicenseResponse(
                contractor_name=contractor_data["contractor_name"],
                contractor_email=contractor_data["contractor_email"],
                license_count=len(licenses),
                licenses=licenses
            ))
        
        logger.info(f"Found {len(response)} contractors with licenses expiring in {days_ahead} days")
        return response
        
    except Exception as e:
        logger.error(f"Error getting expiring licenses: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve expiring licenses"
        )

@router.get("/licenses/stats/overview")
async def get_license_overview_stats(
    current_user = Depends(get_property_manager_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get system-wide license statistics for compliance dashboard
    
    **Property Manager Admin+**: High-level compliance metrics for management oversight
    """
    try:
        contractor_service = ContractorService(db)
        
        # Get all contractors and their license summaries
        contractors_collection = db["accounts"]
        contractors = await contractors_collection.find({"account_type": "contractor"}).to_list(None)
        
        total_contractors = len(contractors)
        total_licenses = 0
        contractors_with_valid_licenses = 0
        contractors_with_expired_licenses = 0
        contractors_with_expiring_licenses = 0
        
        for contractor in contractors:
            try:
                summary = await contractor_service.get_contractor_license_summary(contractor["id"])
                total_licenses += summary["total_licenses"]
                
                if summary["is_eligible_for_assignment"]:
                    contractors_with_valid_licenses += 1
                if summary["expired_licenses"] > 0:
                    contractors_with_expired_licenses += 1
                if summary["expiring_soon"] > 0:
                    contractors_with_expiring_licenses += 1
                    
            except Exception as e:
                logger.warning(f"Error getting summary for contractor {contractor['id']}: {str(e)}")
                continue
        
        stats = {
            "total_contractors": total_contractors,
            "total_licenses": total_licenses,
            "contractors_with_valid_licenses": contractors_with_valid_licenses,
            "contractors_with_expired_licenses": contractors_with_expired_licenses,
            "contractors_with_expiring_licenses": contractors_with_expiring_licenses,
            "compliance_percentage": round((contractors_with_valid_licenses / total_contractors * 100), 2) if total_contractors > 0 else 0
        }
        
        logger.info("Generated license overview statistics")
        return stats
        
    except Exception as e:
        logger.error(f"Error getting license overview stats: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve license statistics"
        )

@router.get("/licenses/summary/{contractor_id}", response_model=LicenseSummaryResponse)
async def get_contractor_license_summary(
    contractor_id: str,
    current_user = Depends(get_property_manager_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get comprehensive license summary for a contractor
    
    **Property Manager Admin+**: Complete overview of contractor license status for assignment decisions
    """
    try:
        contractor_service = ContractorService(db)
        
        # Verify contractor exists
        contractor = await contractor_service.get_contractor_by_id(contractor_id)
        if not contractor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Contractor not found: {contractor_id}"
            )
        
        summary_data = await contractor_service.get_contractor_license_summary(contractor_id)
        
        # Get actual licenses for the response
        contractor_licenses = await contractor_service.get_contractor_licenses(contractor_id)
        licenses = [LicenseResponse.from_license(license) for license in contractor_licenses]
        
        response = LicenseSummaryResponse(
            contractor_id=contractor_id,
            contractor_name=f"{contractor.first_name} {contractor.last_name}",
            total_licenses=summary_data.get("total_licenses", 0),
            valid_licenses=summary_data.get("valid_licenses", 0),
            expired_licenses=summary_data.get("expired_licenses", 0),
            expiring_soon=summary_data.get("expiring_soon", 0),
            pending_verification=summary_data.get("pending_verification", 0),
            is_eligible_for_assignment=summary_data.get("is_eligible_for_assignment", False),
            licenses=licenses
        )
        
        logger.info(f"Generated license summary for contractor {contractor_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting contractor license summary: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve contractor license summary"
        )

@router.get("/licenses/{contractor_id}", response_model=List[LicenseResponse])
async def get_contractor_licenses(
    contractor_id: str,
    current_user = Depends(get_property_manager_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get all licenses for a specific contractor
    
    **Property Manager Admin+**: Requires property manager admin privileges for compliance management
    """
    try:
        contractor_service = ContractorService(db)
        licenses = await contractor_service.get_contractor_licenses(contractor_id)
        
        if not licenses:
            # Verify contractor exists
            contractor = await contractor_service.get_contractor_by_id(contractor_id)
            if not contractor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Contractor not found: {contractor_id}"
                )
            return []  # Contractor exists but has no licenses
        
        return [LicenseResponse.from_license(license) for license in licenses]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting contractor licenses: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve contractor licenses"
        )

@router.post("/licenses", response_model=LicenseResponse)
async def create_contractor_license(
    license_data: LicenseCreateRequest,
    current_user = Depends(get_property_manager_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create a new contractor license
    
    **Property Manager Admin+**: Requires property manager admin privileges for compliance management
    """
    try:
        contractor_service = ContractorService(db)
        
        # Validate contractor exists
        contractor = await contractor_service.get_contractor_by_id(license_data.contractor_id)
        if not contractor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Contractor not found: {license_data.contractor_id}"
            )
        
        # Create license
        license_dict = license_data.dict()
        new_license = await contractor_service.add_contractor_license(
            license_data.contractor_id, 
            license_dict
        )
        
        logger.info(f"Created license {new_license.license_id} for contractor {license_data.contractor_id}")
        return LicenseResponse.from_license(new_license)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating contractor license: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create contractor license: {str(e)}"
        )

@router.put("/licenses/{license_id}", response_model=LicenseResponse)
async def update_contractor_license(
    license_id: str,
    license_data: LicenseUpdateRequest,
    current_user = Depends(get_property_manager_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update an existing contractor license
    
    **Property Manager Admin+**: Requires property manager admin privileges for compliance management
    """
    try:
        contractor_service = ContractorService(db)
        
        # Update license with only provided fields
        update_dict = {k: v for k, v in license_data.dict().items() if v is not None}
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No update data provided"
            )
        
        updated_license = await contractor_service.update_contractor_license(
            license_id,
            update_dict
        )
        
        if not updated_license:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"License not found: {license_id}"
            )
        
        logger.info(f"Updated license {license_id}")
        return LicenseResponse.from_license(updated_license)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating contractor license: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update contractor license: {str(e)}"
        )

@router.delete("/licenses/{license_id}")
async def remove_contractor_license(
    license_id: str,
    current_user = Depends(get_property_manager_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Remove/archive a contractor license
    
    **Property Manager Admin+**: Requires property manager admin privileges for compliance management
    """
    try:
        contractor_service = ContractorService(db)
        
        success = await contractor_service.remove_contractor_license(license_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"License not found: {license_id}"
            )
        
        logger.info(f"Removed license {license_id}")
        return {"message": "License removed successfully", "license_id": license_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing contractor license: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove contractor license: {str(e)}"
        )

@router.post("/licenses/{license_id}/verify", response_model=LicenseResponse)
async def update_license_verification(
    license_id: str,
    verification_data: LicenseVerificationRequest,
    current_user = Depends(get_property_manager_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update license verification status
    
    **Property Manager Admin+**: Critical compliance operation for license verification management
    """
    try:
        contractor_service = ContractorService(db)
        
        # Prepare update data with verification timestamp
        update_data = {
            "verification_status": verification_data.verification_status,
            "verification_date": datetime.utcnow(),
            "verification_notes": verification_data.verification_notes
        }
        
        updated_license = await contractor_service.update_contractor_license(
            license_id,
            update_data
        )
        
        if not updated_license:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"License not found: {license_id}"
            )
        
        logger.info(f"Updated verification status for license {license_id} to {verification_data.verification_status}")
        return LicenseResponse.from_license(updated_license)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating license verification: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update license verification: {str(e)}"
        )