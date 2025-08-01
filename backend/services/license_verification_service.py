"""
License Verification Service

Critical service for eliminating legal liability from unlicensed contractor work.
Property managers are legally liable for contractor licensing violations.

This service integrates with the ContractorLicense model to validate contractor
licenses before assignment and track license expiration.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.contractor_license import ContractorLicense, VerificationStatus
import logging

logger = logging.getLogger(__name__)

class LicenseVerificationService:
    """Service for contractor license verification and management"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = self.db.contractor_licenses
    
    async def verify_contractor_licenses(self, contractor_id: str) -> bool:
        """
        Verify if contractor has valid licenses for assignment
        
        Args:
            contractor_id: Contractor's account ID
            
        Returns:
            bool: True if contractor has at least one valid license
        """
        try:
            # Get all licenses for contractor
            licenses = await self.get_licenses_for_contractor(contractor_id)
            
            if not licenses:
                logger.warning(f"No licenses found for contractor {contractor_id}")
                return False
            
            # Check if any license is valid for assignment
            valid_licenses = [license for license in licenses if license.is_valid_for_assignment()]
            
            if not valid_licenses:
                logger.warning(f"No valid licenses found for contractor {contractor_id}")
                return False
            
            logger.info(f"Contractor {contractor_id} has {len(valid_licenses)} valid licenses")
            return True
            
        except Exception as e:
            logger.error(f"Error verifying licenses for contractor {contractor_id}: {str(e)}")
            return False
    
    async def get_licenses_for_contractor(self, contractor_id: str) -> List[ContractorLicense]:
        """
        Get all licenses for a specific contractor
        
        Args:
            contractor_id: Contractor's account ID
            
        Returns:
            List[ContractorLicense]: List of contractor licenses
        """
        try:
            cursor = self.collection.find({"contractor_id": contractor_id})
            license_docs = await cursor.to_list(length=None)
            
            licenses = []
            for doc in license_docs:
                try:
                    # Convert MongoDB document to ContractorLicense model
                    license = ContractorLicense(**doc)
                    licenses.append(license)
                except Exception as e:
                    logger.error(f"Error parsing license document {doc.get('_id')}: {str(e)}")
                    continue
            
            return licenses
            
        except Exception as e:
            logger.error(f"Error getting licenses for contractor {contractor_id}: {str(e)}")
            return []
    
    async def get_expired_licenses(self, days_ahead: int = 30) -> List[ContractorLicense]:
        """
        Get licenses that are expired or expiring within specified days
        
        Args:
            days_ahead: Number of days to look ahead for expiring licenses
            
        Returns:
            List[ContractorLicense]: List of expired/expiring licenses
        """
        try:
            cutoff_date = datetime.utcnow() + timedelta(days=days_ahead)
            
            cursor = self.collection.find({
                "expiration_date": {"$lte": cutoff_date}
            })
            license_docs = await cursor.to_list(length=None)
            
            licenses = []
            for doc in license_docs:
                try:
                    license = ContractorLicense(**doc)
                    licenses.append(license)
                except Exception as e:
                    logger.error(f"Error parsing license document {doc.get('_id')}: {str(e)}")
                    continue
            
            return licenses
            
        except Exception as e:
            logger.error(f"Error getting expired licenses: {str(e)}")
            return []
    
    async def get_licenses_by_type(self, license_type: str, contractor_id: str = None) -> List[ContractorLicense]:
        """
        Get licenses by type, optionally filtered by contractor
        
        Args:
            license_type: Type of license (electrical, plumbing, etc.)
            contractor_id: Optional contractor ID filter
            
        Returns:
            List[ContractorLicense]: List of matching licenses
        """
        try:
            query = {"license_type": license_type}
            if contractor_id:
                query["contractor_id"] = contractor_id
            
            cursor = self.collection.find(query)
            license_docs = await cursor.to_list(length=None)
            
            licenses = []
            for doc in license_docs:
                try:
                    license = ContractorLicense(**doc)
                    licenses.append(license)
                except Exception as e:
                    logger.error(f"Error parsing license document {doc.get('_id')}: {str(e)}")
                    continue
            
            return licenses
            
        except Exception as e:
            logger.error(f"Error getting licenses by type {license_type}: {str(e)}")
            return []
    
    async def create_license(self, license_data: dict) -> Optional[ContractorLicense]:
        """
        Create a new contractor license
        
        Args:
            license_data: License data dictionary
            
        Returns:
            ContractorLicense: Created license or None if failed
        """
        try:
            # Validate license data with ContractorLicense model
            license = ContractorLicense(**license_data)
            
            # Insert into database
            result = await self.collection.insert_one(license.dict(by_alias=True))
            
            if result.inserted_id:
                license.license_id = str(result.inserted_id)
                logger.info(f"Created license {result.inserted_id} for contractor {license.contractor_id}")
                return license
            
            return None
            
        except Exception as e:
            logger.error(f"Error creating license: {str(e)}")
            return None
    
    async def update_license_verification_status(
        self, 
        license_id: str, 
        status: VerificationStatus,
        notes: str = None
    ) -> bool:
        """
        Update license verification status
        
        Args:
            license_id: License ID to update
            status: New verification status
            notes: Optional verification notes
            
        Returns:
            bool: True if update successful
        """
        try:
            update_data = {
                "verification_status": status,
                "verification_date": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            if notes:
                update_data["verification_notes"] = notes
            
            result = await self.collection.update_one(
                {"_id": ObjectId(license_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.info(f"Updated license {license_id} verification status to {status}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error updating license verification status: {str(e)}")
            return False
    
    async def get_contractor_license_summary(self, contractor_id: str) -> dict:
        """
        Get summary of contractor's license status
        
        Args:
            contractor_id: Contractor's account ID
            
        Returns:
            dict: License summary with counts and status
        """
        try:
            licenses = await self.get_licenses_for_contractor(contractor_id)
            
            summary = {
                "total_licenses": len(licenses),
                "valid_licenses": 0,
                "expired_licenses": 0,
                "expiring_soon": 0,  # Within 30 days
                "pending_verification": 0,
                "license_types": set()
            }
            
            for license in licenses:
                summary["license_types"].add(license.license_type)
                
                if license.is_valid_for_assignment():
                    summary["valid_licenses"] += 1
                
                if license.is_expired():
                    summary["expired_licenses"] += 1
                elif license.needs_renewal(30):
                    summary["expiring_soon"] += 1
                
                if license.verification_status == VerificationStatus.PENDING:
                    summary["pending_verification"] += 1
            
            summary["license_types"] = list(summary["license_types"])
            summary["has_valid_licenses"] = summary["valid_licenses"] > 0
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting license summary for contractor {contractor_id}: {str(e)}")
            return {
                "total_licenses": 0,
                "valid_licenses": 0,
                "expired_licenses": 0,
                "expiring_soon": 0,
                "pending_verification": 0,
                "license_types": [],
                "has_valid_licenses": False,
                "error": str(e)
            }
    
    async def validate_license_for_service_type(self, contractor_id: str, service_type: str) -> bool:
        """
        Validate if contractor has valid license for specific service type
        
        Args:
            contractor_id: Contractor's account ID
            service_type: Service type (electrical, plumbing, etc.)
            
        Returns:
            bool: True if contractor has valid license for service type
        """
        try:
            # Map service types to license types
            service_to_license_mapping = {
                "electrical": "electrical",
                "plumbing": "plumbing", 
                "hvac": "hvac",
                "appliance_repair": "electrical",  # Appliance repair often requires electrical license
                "general_maintenance": "general_contractor",
                "cleaning": None,  # No license required
                "security": None,  # Usually handled by company license
            }
            
            required_license_type = service_to_license_mapping.get(service_type)
            
            # If no license required for this service type
            if required_license_type is None:
                return True
            
            # Get licenses for this specific type
            licenses = await self.get_licenses_by_type(required_license_type, contractor_id)
            
            # Check if any license is valid for assignment
            valid_licenses = [license for license in licenses if license.is_valid_for_assignment()]
            
            if valid_licenses:
                logger.info(f"Contractor {contractor_id} has valid {required_license_type} license for {service_type}")
                return True
            else:
                logger.warning(f"Contractor {contractor_id} lacks valid {required_license_type} license for {service_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error validating service type license for contractor {contractor_id}: {str(e)}")
            return False