"""
Enterprise Contractor Matching Service
Handles intelligent contractor assignment with geographic optimization, quality scoring, and availability management
"""

import math
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from dataclasses import dataclass

from models.service_request import ServiceRequest, ServiceRequestType, ServiceRequestPriority
from models.account import ContractorProfile
from services.contractor_service import ContractorService
from services.license_verification_service import LicenseVerificationService

logger = logging.getLogger(__name__)


@dataclass
class ContractorMatch:
    """Data class representing a contractor match with scoring"""
    contractor_profile: ContractorProfile
    distance_km: float
    quality_score: float
    availability_score: float
    total_score: float
    estimated_cost: float
    estimated_response_time: int  # in hours


@dataclass
class PropertyLocation:
    """Property location data for geographic calculations"""
    property_id: str
    address: str
    city: str
    postal_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ContractorMatchingService:
    """Enterprise-grade contractor matching with geographic intelligence and quality scoring"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.contractor_service = ContractorService(db)
        self.license_verification_service = LicenseVerificationService(db)
        
        # Service type mapping with priority requirements
        self.service_type_mapping = {
            ServiceRequestType.PLUMBING: "plumbing",
            ServiceRequestType.ELECTRICAL: "electrical", 
            ServiceRequestType.HVAC: "hvac",
            ServiceRequestType.APPLIANCE: "appliance_repair",
            ServiceRequestType.GENERAL_MAINTENANCE: "general_maintenance",
            ServiceRequestType.CLEANING: "cleaning",
            ServiceRequestType.SECURITY: "security",
            ServiceRequestType.OTHER: "general_maintenance"
        }
        
        # Emergency response time requirements (hours)
        self.response_time_requirements = {
            ServiceRequestPriority.EMERGENCY: 4,
            ServiceRequestPriority.URGENT: 24,
            ServiceRequestPriority.ROUTINE: 168  # 7 days
        }
        
        # Quality scoring weights
        self.quality_weights = {
            'rating': 0.30,           # 30% - Customer ratings
            'completion_rate': 0.25,  # 25% - Job completion success
            'on_time_rate': 0.20,     # 20% - On-time performance
            'response_time': 0.15,    # 15% - Response time performance
            'tenant_satisfaction': 0.10  # 10% - Tenant satisfaction scores
        }
    
    async def find_best_contractors(
        self, 
        service_request: ServiceRequest, 
        property_location: PropertyLocation,
        max_contractors: int = 3
    ) -> List[ContractorMatch]:
        """
        Find the best contractors for a service request with comprehensive scoring
        
        Args:
            service_request: The service request to match
            property_location: Property location for geographic calculations
            max_contractors: Maximum number of contractors to return
            
        Returns:
            List of ContractorMatch objects sorted by total score (best first)
        """
        try:
            service_keyword = self.service_type_mapping.get(
                service_request.request_type, 
                "general_maintenance"
            )
            
            # Get all contractors who offer this service
            contractors = await self._get_qualified_contractors(service_keyword)
            
            if not contractors:
                logger.warning(f"No contractors found for service type: {service_keyword}")
                return []
            
            # Score and rank contractors
            contractor_matches = []
            for contractor in contractors:
                match = await self._score_contractor(
                    contractor, 
                    service_request, 
                    property_location
                )
                if match:
                    contractor_matches.append(match)
            
            # Sort by total score (highest first) and return top matches
            contractor_matches.sort(key=lambda x: x.total_score, reverse=True)
            return contractor_matches[:max_contractors]
            
        except Exception as e:
            logger.error(f"Error in contractor matching: {e}")
            return []
    
    async def _get_qualified_contractors(self, service_keyword: str) -> List[ContractorProfile]:
        """Get all contractors qualified for the service type with VALID LICENSES"""
        try:
            # First get potentially qualified contractors (basic criteria)
            contractors_cursor = self.db.contractor_profiles.find({
                "services_offered": {"$in": [service_keyword]},
                "available": True,
                "insurance_verified": True
            })
            
            contractors = []
            async for contractor_doc in contractors_cursor:
                contractor = ContractorProfile(**contractor_doc)
                
                # CRITICAL: Verify actual license validity before including contractor
                # This replaces the hard-coded "license_verified": True field
                license_valid = await self.license_verification_service.verify_contractor_licenses(
                    contractor.account_id
                )
                
                # Additional service-specific license validation
                service_license_valid = await self.license_verification_service.validate_license_for_service_type(
                    contractor.account_id, 
                    service_keyword
                )
                
                if license_valid and service_license_valid:
                    contractors.append(contractor)
                    logger.debug(f"Contractor {contractor.account_id} qualified with valid licenses for {service_keyword}")
                else:
                    logger.warning(f"Contractor {contractor.account_id} blocked due to invalid/expired licenses for {service_keyword}")
            
            logger.info(f"Found {len(contractors)} license-verified contractors for service: {service_keyword}")
            return contractors
            
        except Exception as e:
            logger.error(f"Error getting qualified contractors: {e}")
            return []
    
    async def _score_contractor(
        self, 
        contractor: ContractorProfile, 
        service_request: ServiceRequest,
        property_location: PropertyLocation
    ) -> Optional[ContractorMatch]:
        """
        Score a contractor based on multiple factors
        
        Returns ContractorMatch with detailed scoring or None if contractor unsuitable
        """
        try:
            # 1. Geographic scoring - Distance and service area check
            distance_km = await self._calculate_distance(contractor, property_location)
            if distance_km > contractor.service_radius_km:
                logger.debug(f"Contractor {contractor.account_id} outside service radius")
                return None
            
            # 2. Availability scoring - Can they handle the job?
            availability_score = self._calculate_availability_score(contractor, service_request)
            if availability_score == 0:  # Fully booked
                logger.debug(f"Contractor {contractor.account_id} not available")
                return None
            
            # 3. Quality scoring - Performance metrics INCLUDING LICENSE STATUS
            quality_score = await self._calculate_quality_score(contractor)
            
            # 4. Combined scoring with geographic weighting
            geographic_weight = max(0.1, 1.0 - (distance_km / contractor.service_radius_km))
            
            total_score = (
                quality_score * 0.5 +           # 50% quality
                availability_score * 0.3 +      # 30% availability  
                geographic_weight * 0.2         # 20% geography
            )
            
            # 5. Cost estimation
            estimated_cost = self._estimate_service_cost(contractor, service_request, distance_km)
            
            # 6. Response time estimation
            estimated_response_time = self._estimate_response_time(contractor, service_request)
            
            return ContractorMatch(
                contractor_profile=contractor,
                distance_km=distance_km,
                quality_score=quality_score,
                availability_score=availability_score,
                total_score=total_score,
                estimated_cost=estimated_cost,
                estimated_response_time=estimated_response_time
            )
            
        except Exception as e:
            logger.error(f"Error scoring contractor {contractor.account_id}: {e}")
            return None
    
    async def _calculate_distance(
        self, 
        contractor: ContractorProfile, 
        property_location: PropertyLocation
    ) -> float:
        """
        Calculate distance between contractor and property
        Uses postal code matching as fallback if coordinates unavailable
        """
        # If both have coordinates, use haversine formula
        if (contractor.latitude and contractor.longitude and 
            property_location.latitude and property_location.longitude):
            return self._haversine_distance(
                contractor.latitude, contractor.longitude,
                property_location.latitude, property_location.longitude
            )
        
        # Fallback: Check if property postal code is in contractor's served areas
        if property_location.postal_code in contractor.postal_codes_served:
            return 5.0  # Assume 5km if in served postal codes
        
        # Default fallback based on city matching
        contractor_cities = [area.lower() for area in contractor.service_areas]
        if property_location.city.lower() in contractor_cities:
            return 15.0  # Assume 15km for same city
        
        # No geographic match found
        return 50.0  # Assume 50km (likely outside service area)
    
    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points using haversine formula"""
        R = 6371  # Earth's radius in kilometers
        
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def _calculate_availability_score(
        self, 
        contractor: ContractorProfile, 
        service_request: ServiceRequest
    ) -> float:
        """
        Calculate availability score based on workload and emergency requirements
        
        Returns:
            0.0 - 1.0 score (0 = unavailable, 1 = fully available)
        """
        # Check capacity
        capacity_utilization = contractor.current_job_count / contractor.max_concurrent_jobs
        if capacity_utilization >= 1.0:
            return 0.0  # Fully booked
        
        # Emergency priority requirements
        if service_request.priority == ServiceRequestPriority.EMERGENCY:
            if not contractor.emergency_available:
                return 0.3  # Reduced score for non-emergency contractors
        
        # Calculate availability score
        availability_score = 1.0 - capacity_utilization
        
        # Bonus for emergency availability
        if contractor.emergency_available and service_request.priority == ServiceRequestPriority.EMERGENCY:
            availability_score = min(1.0, availability_score * 1.2)
        
        return availability_score
    
    async def _calculate_quality_score(self, contractor: ContractorProfile) -> float:
        """
        Calculate quality score based on performance metrics INCLUDING LICENSE STATUS
        
        Returns:
            0.0 - 1.0 normalized quality score
        """
        scores = {}
        
        # Rating score (1-5 stars normalized to 0-1)
        scores['rating'] = (contractor.rating - 1) / 4 if contractor.rating else 0.5
        
        # Completion rate (0-100% normalized to 0-1)
        scores['completion_rate'] = contractor.completion_rate / 100
        
        # On-time rate (0-100% normalized to 0-1)
        scores['on_time_rate'] = contractor.on_time_rate / 100
        
        # Response time score (better response time = higher score)
        if contractor.average_response_time:
            # Normalize against 24-hour benchmark (faster = better)
            scores['response_time'] = max(0, 1 - (contractor.average_response_time / 24))
        else:
            scores['response_time'] = 0.5  # Default for new contractors
        
        # Tenant satisfaction (1-5 stars normalized to 0-1)
        scores['tenant_satisfaction'] = (contractor.tenant_satisfaction_score - 1) / 4
        
        # NEW: License health score - critical for regulatory compliance
        license_summary = await self.license_verification_service.get_contractor_license_summary(
            contractor.account_id
        )
        
        license_score = 0.5  # Default neutral score
        if license_summary.get("has_valid_licenses", False):
            # Perfect score if all licenses are valid and none expiring soon
            if (license_summary.get("expired_licenses", 0) == 0 and 
                license_summary.get("expiring_soon", 0) == 0):
                license_score = 1.0
            # Good score if valid but some expiring soon
            elif license_summary.get("expired_licenses", 0) == 0:
                license_score = 0.8
            # Poor score if has expired licenses
            else:
                license_score = 0.3
        
        scores['license_health'] = license_score
        
        # Updated quality weights to include license health
        updated_weights = {
            'rating': 0.25,           # 25% - Customer ratings (reduced from 30%)
            'completion_rate': 0.20,  # 20% - Job completion success (reduced from 25%)
            'on_time_rate': 0.20,     # 20% - On-time performance (same)
            'response_time': 0.15,    # 15% - Response time performance (same)
            'tenant_satisfaction': 0.10,  # 10% - Tenant satisfaction scores (same)
            'license_health': 0.10    # 10% - NEW: License validity and health
        }
        
        # Weighted total
        total_score = sum(
            scores[metric] * weight 
            for metric, weight in updated_weights.items()
        )
        
        return min(1.0, total_score)
    
    def _estimate_service_cost(
        self, 
        contractor: ContractorProfile, 
        service_request: ServiceRequest,
        distance_km: float
    ) -> float:
        """Estimate total service cost including travel"""
        base_rate = contractor.fixed_rates.get(
            self.service_type_mapping[service_request.request_type],
            contractor.hourly_rate or 50.0  # Default hourly rate
        )
        
        # Apply emergency multiplier
        if service_request.priority == ServiceRequestPriority.EMERGENCY:
            base_rate *= contractor.emergency_rate_multiplier
        
        # Add travel cost
        travel_cost = distance_km * contractor.travel_rate_per_km
        
        return base_rate + travel_cost
    
    def _estimate_response_time(
        self, 
        contractor: ContractorProfile, 
        service_request: ServiceRequest
    ) -> int:
        """Estimate response time in hours"""
        if service_request.priority == ServiceRequestPriority.EMERGENCY:
            return min(2, contractor.response_time_target)
        elif service_request.priority == ServiceRequestPriority.URGENT:
            return contractor.response_time_target * 2
        else:
            return contractor.response_time_target * 12  # Routine jobs
    
    async def assign_contractors_to_request(
        self, 
        service_request: ServiceRequest,
        property_location: PropertyLocation,
        assignment_strategy: str = "best_match"
    ) -> List[str]:
        """
        Assign contractors to a service request using specified strategy
        
        Args:
            service_request: Service request to assign
            property_location: Property location data
            assignment_strategy: "best_match", "multiple_bid", or "load_balance"
            
        Returns:
            List of contractor emails for notification
        """
        contractor_matches = await self.find_best_contractors(
            service_request, 
            property_location, 
            max_contractors=3
        )
        
        if not contractor_matches:
            logger.warning(f"No suitable contractors found for service request {service_request.id}")
            return []
        
        contractor_emails = []
        
        if assignment_strategy == "best_match":
            # Assign to single best contractor
            best_contractor = contractor_matches[0]
            account = await self._get_contractor_account(best_contractor.contractor_profile.account_id)
            if account and account.email:
                contractor_emails.append(account.email)
                logger.info(f"Assigned to best contractor: {account.email} (score: {best_contractor.total_score:.2f})")
        
        elif assignment_strategy == "multiple_bid":
            # Send to top 3 contractors for emergency/urgent requests
            if service_request.priority in [ServiceRequestPriority.EMERGENCY, ServiceRequestPriority.URGENT]:
                for match in contractor_matches:
                    account = await self._get_contractor_account(match.contractor_profile.account_id)
                    if account and account.email:
                        contractor_emails.append(account.email)
                logger.info(f"Multiple bid assignment to {len(contractor_emails)} contractors")
        
        elif assignment_strategy == "load_balance":
            # Choose contractor with lowest current workload
            sorted_by_workload = sorted(
                contractor_matches, 
                key=lambda x: x.contractor_profile.current_job_count
            )
            best_contractor = sorted_by_workload[0]
            account = await self._get_contractor_account(best_contractor.contractor_profile.account_id)
            if account and account.email:
                contractor_emails.append(account.email)
                logger.info(f"Load balanced assignment to: {account.email}")
        
        return contractor_emails
    
    async def _get_contractor_account(self, account_id: str):
        """Get contractor account information"""
        try:
            return await self.contractor_service.get_contractor_by_id(account_id)
        except Exception as e:
            logger.error(f"Error getting contractor account {account_id}: {e}")
            return None
    
    async def update_contractor_workload(self, contractor_account_id: str, job_assigned: bool = True):
        """Update contractor's current job count"""
        try:
            increment = 1 if job_assigned else -1
            await self.db.contractor_profiles.update_one(
                {"account_id": contractor_account_id},
                {"$inc": {"current_job_count": increment}}
            )
            logger.info(f"Updated contractor {contractor_account_id} workload: {'+' if job_assigned else '-'}1")
        except Exception as e:
            logger.error(f"Error updating contractor workload: {e}")
    
    async def record_job_completion(
        self, 
        contractor_account_id: str,
        completion_time_hours: float,
        on_time: bool,
        tenant_rating: float
    ):
        """Record job completion metrics for contractor scoring"""
        try:
            # Update performance metrics
            update_data = {
                "$inc": {
                    "completed_jobs": 1,
                    "current_job_count": -1  # Reduce active job count
                },
                "$set": {
                    "last_job_completed": datetime.utcnow()
                }
            }
            
            # Update average response time (running average)
            contractor = await self.db.contractor_profiles.find_one({"account_id": contractor_account_id})
            if contractor:
                current_avg = contractor.get("average_response_time", 0)
                completed_jobs = contractor.get("completed_jobs", 0)
                
                new_avg = ((current_avg * completed_jobs) + completion_time_hours) / (completed_jobs + 1)
                update_data["$set"]["average_response_time"] = new_avg
                
                # Update on-time rate
                current_on_time_jobs = (contractor.get("on_time_rate", 100) / 100) * completed_jobs
                if on_time:
                    current_on_time_jobs += 1
                new_on_time_rate = (current_on_time_jobs / (completed_jobs + 1)) * 100
                update_data["$set"]["on_time_rate"] = new_on_time_rate
                
                # Update tenant satisfaction (running average)
                current_satisfaction = contractor.get("tenant_satisfaction_score", 5.0)
                new_satisfaction = ((current_satisfaction * completed_jobs) + tenant_rating) / (completed_jobs + 1)
                update_data["$set"]["tenant_satisfaction_score"] = new_satisfaction
            
            await self.db.contractor_profiles.update_one(
                {"account_id": contractor_account_id},
                update_data
            )
            
            logger.info(f"Recorded job completion for contractor {contractor_account_id}")
            
        except Exception as e:
            logger.error(f"Error recording job completion: {e}")