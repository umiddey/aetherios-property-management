from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from enum import Enum
from bson import ObjectId
import uuid

class LicenseType(str, Enum):
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    HVAC = "hvac"
    GENERAL_CONTRACTOR = "general_contractor"
    LANDSCAPING = "landscaping"
    ROOFING = "roofing"
    FLOORING = "flooring"
    PAINTING = "painting"
    PEST_CONTROL = "pest_control"

class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    EXPIRED = "expired"
    INVALID = "invalid"
    SUSPENDED = "suspended"

class ContractorLicense(BaseModel):
    """
    Contractor License Model for regulatory compliance
    
    Critical for eliminating legal liability from unlicensed contractor work.
    Property managers are legally liable for contractor licensing violations.
    """
    
    license_id: Optional[str] = Field(None, alias="_id")
    contractor_id: str = Field(..., description="Reference to contractor account")
    license_type: LicenseType = Field(..., description="Type of license (electrical, plumbing, etc.)")
    license_number: str = Field(..., min_length=1, max_length=50, description="Official license number")
    issuing_authority: str = Field(..., min_length=1, max_length=100, description="Authority that issued license")
    issue_date: datetime = Field(..., description="Date license was issued")
    expiration_date: datetime = Field(..., description="Date license expires")
    verification_status: VerificationStatus = Field(default=VerificationStatus.PENDING, description="Current verification status")
    verification_date: Optional[datetime] = Field(None, description="Last verification date")
    verification_notes: Optional[str] = Field(None, max_length=500, description="Verification details/notes")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @validator('license_id', pre=True)
    def validate_license_id(cls, v):
        # Convert ObjectId to string if needed
        if isinstance(v, ObjectId):
            return str(v)
        return v
    
    @validator('contractor_id')
    def validate_contractor_id(cls, v):
        # Accept both UUID strings (from account system) and ObjectId strings
        try:
            # Try UUID format first (account system uses UUIDs)
            uuid.UUID(v)
            return v
        except ValueError:
            try:
                # Fallback to ObjectId format
                ObjectId(v)
                return v
            except:
                raise ValueError('contractor_id must be a valid UUID or ObjectId')
    
    @validator('issue_date')
    def validate_issue_date(cls, v):
        if v > datetime.now(timezone.utc):
            raise ValueError('issue_date cannot be in the future')
        return v
    
    @validator('expiration_date')
    def validate_expiration_date(cls, v, values):
        if 'issue_date' in values and v <= values['issue_date']:
            raise ValueError('expiration_date must be after issue_date')
        return v
    
    @validator('license_number')
    def validate_license_number(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('license_number cannot be empty')
        return v.upper()
    
    def is_expired(self) -> bool:
        """Check if license is currently expired"""
        return datetime.now(timezone.utc) > self.expiration_date
    
    def needs_renewal(self, days_ahead: int = 30) -> bool:
        """Check if license needs renewal within specified days"""
        from datetime import timedelta
        return datetime.now(timezone.utc) + timedelta(days=days_ahead) >= self.expiration_date
    
    def is_valid_for_assignment(self) -> bool:
        """Check if license is valid for contractor assignment"""
        return (
            self.verification_status == VerificationStatus.VERIFIED and
            not self.is_expired()
        )
    
    def days_until_expiration(self) -> int:
        """Get days until license expires (negative if expired)"""
        delta = self.expiration_date - datetime.now(timezone.utc)
        return delta.days
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            ObjectId: str
        }
        schema_extra = {
            "example": {
                "contractor_id": "507f1f77bcf86cd799439011",
                "license_type": "electrical",
                "license_number": "EL12345",
                "issuing_authority": "California State License Board",
                "issue_date": "2023-01-15T00:00:00",
                "expiration_date": "2025-01-15T00:00:00",
                "verification_status": "verified",
                "verification_date": "2024-01-01T00:00:00",
                "verification_notes": "Verified through state database"
            }
        }

# MongoDB Collection Indexes for Performance
CONTRACTOR_LICENSE_INDEXES = [
    {"key": [("contractor_id", 1)], "name": "contractor_id_1"},
    {"key": [("expiration_date", 1)], "name": "expiration_date_1"},
    {"key": [("license_type", 1), ("issuing_authority", 1)], "name": "license_type_authority_1"},
    {
        "key": [("license_number", 1), ("issuing_authority", 1)], 
        "name": "license_number_authority_unique",
        "unique": True
    },
    {"key": [("verification_status", 1)], "name": "verification_status_1"},
    {"key": [("contractor_id", 1), ("verification_status", 1), ("expiration_date", 1)], 
     "name": "contractor_active_licenses"}
]

COLLECTION_NAME = "contractor_licenses"