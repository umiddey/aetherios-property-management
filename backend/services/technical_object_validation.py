from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Tuple, Optional, Dict, Any
from enum import Enum
from services.property_validation import PropertyValidationResult, Jurisdiction


class TechnicalObjectValidationService:
    """Validation service for technical objects (heating, elevator, etc.)"""
    
    def __init__(self):
        self._validators: Dict[Jurisdiction, BaseTechnicalObjectValidator] = {}
        self._register_validators()
    
    def _register_validators(self):
        """Register all available jurisdiction validators"""
        from services.legal.german_technical_objects import GermanTechnicalObjectValidator
        
        self._validators[Jurisdiction.GERMANY] = GermanTechnicalObjectValidator()
        
        # Future validators:
        # from services.legal.austrian_technical_objects import AustrianTechnicalObjectValidator
        # self._validators[Jurisdiction.AUSTRIA] = AustrianTechnicalObjectValidator()
    
    def get_validator(self, jurisdiction: Jurisdiction) -> 'BaseTechnicalObjectValidator':
        """Get validator for specific jurisdiction"""
        if jurisdiction not in self._validators:
            raise ValueError(f"No technical object validator available for jurisdiction: {jurisdiction}")
        return self._validators[jurisdiction]
    
    def validate_heating_system(
        self,
        jurisdiction: Jurisdiction,
        heating_type: str,
        distribution_key: str,
        property_type: str = None,
        serves_units: list = None
    ) -> PropertyValidationResult:
        """Validate heating system for specified jurisdiction"""
        validator = self.get_validator(jurisdiction)
        return validator.validate_heating_system(heating_type, distribution_key, property_type, serves_units)
    
    def validate_maintenance_schedule(
        self,
        jurisdiction: Jurisdiction,
        object_type: str,
        maintenance_schedule: str,
        last_maintenance: Optional[datetime] = None
    ) -> PropertyValidationResult:
        """Validate maintenance schedule compliance"""
        validator = self.get_validator(jurisdiction)
        return validator.validate_maintenance_schedule(object_type, maintenance_schedule, last_maintenance)
    
    def validate_technical_object_specs(
        self,
        jurisdiction: Jurisdiction,
        object_type: str,
        specifications: Dict[str, Any]
    ) -> PropertyValidationResult:
        """Validate technical specifications for specific object type"""
        validator = self.get_validator(jurisdiction)
        return validator.validate_technical_specifications(object_type, specifications)


class BaseTechnicalObjectValidator(ABC):
    """Base class for jurisdiction-specific technical object validation"""
    
    @property
    @abstractmethod
    def jurisdiction(self) -> Jurisdiction:
        """Return the jurisdiction this validator handles"""
        pass
    
    @abstractmethod
    def validate_heating_system(
        self,
        heating_type: str,
        distribution_key: str,
        property_type: Optional[str] = None,
        serves_units: Optional[list] = None
    ) -> PropertyValidationResult:
        """Validate heating system configuration"""
        pass
    
    @abstractmethod
    def validate_maintenance_schedule(
        self,
        object_type: str,
        maintenance_schedule: str,
        last_maintenance: Optional[datetime] = None
    ) -> PropertyValidationResult:
        """Validate maintenance schedule requirements"""
        pass
    
    @abstractmethod
    def validate_technical_specifications(
        self,
        object_type: str,
        specifications: Dict[str, Any]
    ) -> PropertyValidationResult:
        """Validate technical specifications for object type"""
        pass