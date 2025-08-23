from abc import ABC, abstractmethod
from datetime import datetime
from typing import Tuple, Optional, Dict, Any
from enum import Enum


class Jurisdiction(str, Enum):
    GERMANY = "DE"
    AUSTRIA = "AT"
    NETHERLANDS = "NL"
    SWITZERLAND = "CH"
    FRANCE = "FR"


class PropertyValidationResult:
    """Standardized validation result across all jurisdictions"""
    def __init__(self, is_valid: bool, message: str, warning: bool = False):
        self.is_valid = is_valid
        self.message = message
        self.warning = warning
        
    def __bool__(self):
        return self.is_valid


class BasePropertyValidator(ABC):
    """Base class for jurisdiction-specific property validation"""
    
    @property
    @abstractmethod
    def jurisdiction(self) -> Jurisdiction:
        """Return the jurisdiction this validator handles"""
        pass
    
    @property
    @abstractmethod
    def standard_vat_rate(self) -> float:
        """Standard VAT rate for this jurisdiction"""
        pass
    
    @abstractmethod
    def validate_energy_certificate(
        self, 
        certificate_type: Optional[str],
        expiry_date: Optional[datetime],
        energy_class: Optional[str],
        energy_value: Optional[float]
    ) -> PropertyValidationResult:
        """Validate energy certificate requirements"""
        pass
    
    # NOTE: Heating system validation moved to Technical Objects Validation Service
    # Properties only validate building characteristics, not equipment
    
    @abstractmethod
    def calculate_notice_period(
        self,
        rental_type: str,
        tenancy_months: int
    ) -> Tuple[int, int]:
        """Calculate legal notice periods"""
        pass
    
    @abstractmethod
    def validate_marketing_compliance(
        self,
        property_data: Dict[str, Any]
    ) -> PropertyValidationResult:
        """Validate property marketing legal requirements"""
        pass
    
    @abstractmethod
    def validate_cost_distribution(
        self,
        cost_type: str,
        distribution_method: str,
        percentage_allocation: Dict[str, float]
    ) -> PropertyValidationResult:
        """Validate utilities cost distribution rules"""
        pass


class PropertyValidationService:
    """Main service that delegates to jurisdiction-specific validators"""
    
    def __init__(self):
        self._validators: Dict[Jurisdiction, BasePropertyValidator] = {}
        self._register_validators()
    
    def _register_validators(self):
        """Register all available jurisdiction validators"""
        # Import here to avoid circular imports
        from services.legal.germany import GermanPropertyValidator
        
        self._validators[Jurisdiction.GERMANY] = GermanPropertyValidator()
        
        # Future validators will be registered here:
        # from services.legal.austria import AustrianPropertyValidator
        # self._validators[Jurisdiction.AUSTRIA] = AustrianPropertyValidator()
    
    def get_validator(self, jurisdiction: Jurisdiction) -> BasePropertyValidator:
        """Get validator for specific jurisdiction"""
        if jurisdiction not in self._validators:
            raise ValueError(f"No validator available for jurisdiction: {jurisdiction}")
        return self._validators[jurisdiction]
    
    def validate_energy_certificate(
        self,
        jurisdiction: Jurisdiction,
        certificate_type: Optional[str],
        expiry_date: Optional[datetime],
        energy_class: Optional[str],
        energy_value: Optional[float]
    ) -> PropertyValidationResult:
        """Validate energy certificate for specified jurisdiction"""
        validator = self.get_validator(jurisdiction)
        return validator.validate_energy_certificate(
            certificate_type, expiry_date, energy_class, energy_value
        )
    
    # NOTE: Heating system validation moved to Technical Objects Validation Service
    
    def calculate_notice_period(
        self,
        jurisdiction: Jurisdiction,
        rental_type: str,
        tenancy_months: int
    ) -> Tuple[int, int]:
        """Calculate notice periods for specified jurisdiction"""
        validator = self.get_validator(jurisdiction)
        return validator.calculate_notice_period(rental_type, tenancy_months)
    
    def validate_marketing_compliance(
        self,
        jurisdiction: Jurisdiction,
        property_data: Dict[str, Any]
    ) -> PropertyValidationResult:
        """Validate marketing compliance for specified jurisdiction"""
        validator = self.get_validator(jurisdiction)
        return validator.validate_marketing_compliance(property_data)
    
    def validate_cost_distribution(
        self,
        jurisdiction: Jurisdiction,
        cost_type: str,
        distribution_method: str,
        percentage_allocation: Dict[str, float]
    ) -> PropertyValidationResult:
        """Validate cost distribution for specified jurisdiction"""
        validator = self.get_validator(jurisdiction)
        return validator.validate_cost_distribution(
            cost_type, distribution_method, percentage_allocation
        )
    
    def get_available_jurisdictions(self) -> list[Jurisdiction]:
        """Get list of supported jurisdictions"""
        return list(self._validators.keys())
    
    def get_vat_rate(self, jurisdiction: Jurisdiction, service_type: str = "standard") -> float:
        """Get VAT rate for jurisdiction and service type"""
        validator = self.get_validator(jurisdiction)
        return validator.standard_vat_rate