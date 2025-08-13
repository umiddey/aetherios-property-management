from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from services.technical_object_validation import BaseTechnicalObjectValidator
from services.property_validation import PropertyValidationResult, Jurisdiction


class GermanTechnicalObjectValidator(BaseTechnicalObjectValidator):
    """
    German technical object validation - BetrKV and other German regulations
    """
    
    @property
    def jurisdiction(self) -> Jurisdiction:
        return Jurisdiction.GERMANY
    
    def validate_heating_system(
        self,
        heating_type: str,
        distribution_key: str,
        property_type: Optional[str] = None,
        serves_units: Optional[list] = None
    ) -> PropertyValidationResult:
        """
        Validate heating system configuration according to BetrKV
        MOVED FROM Property Validation - this is equipment validation
        """
        if not heating_type:
            return PropertyValidationResult(
                False,
                "Heating type is required for technical objects"
            )
            
        valid_heating_types = ["zentralheizung", "etagenheizung", "einzelheizung"]
        if heating_type not in valid_heating_types:
            return PropertyValidationResult(
                False, 
                f"Invalid heating type. Must be one of: {valid_heating_types}"
            )
            
        # BetrKV compliance validation
        if heating_type == "zentralheizung" and not distribution_key:
            return PropertyValidationResult(
                False, 
                "Central heating systems require cost distribution key specification (BetrKV compliance)"
            )
            
        if distribution_key:
            valid_keys = ["surface_area", "apartment_count", "consumption"]
            if distribution_key not in valid_keys:
                return PropertyValidationResult(
                    False, 
                    f"Invalid distribution key. Must be one of: {valid_keys}"
                )
                
            # BetrKV requires consumption-based allocation for heating costs (50-70%)
            if heating_type in ["zentralheizung", "etagenheizung"] and distribution_key != "consumption":
                return PropertyValidationResult(
                    True, 
                    "Warning: BetrKV requires at least 50% consumption-based allocation for heating costs",
                    warning=True
                )
            
            # Equal distribution not allowed for heating costs under BetrKV
            if distribution_key == "apartment_count":
                return PropertyValidationResult(
                    False,
                    "Equal distribution (apartment count) not allowed for heating costs under BetrKV"
                )
        
        # Validate serves_units for central heating
        if heating_type == "zentralheizung" and serves_units:
            if len(serves_units) < 2:
                return PropertyValidationResult(
                    True,
                    "Warning: Central heating system serves only one unit - consider individual heating",
                    warning=True
                )
        
        return PropertyValidationResult(True, "Heating system configuration is BetrKV compliant")
    
    def validate_maintenance_schedule(
        self,
        object_type: str,
        maintenance_schedule: str,
        last_maintenance: Optional[datetime] = None
    ) -> PropertyValidationResult:
        """
        Validate maintenance schedule according to German regulations
        """
        # German maintenance requirements by object type
        required_schedules = {
            "heating_system": "yearly",  # Annual heating system inspection required
            "elevator": "monthly",       # Monthly elevator safety checks
            "fire_safety": "yearly",     # Annual fire safety inspection
            "electrical_system": "yearly", # Annual electrical safety check
            "ventilation": "quarterly"   # Quarterly ventilation cleaning
        }
        
        if object_type in required_schedules:
            required = required_schedules[object_type]
            if maintenance_schedule != required:
                return PropertyValidationResult(
                    True,
                    f"Warning: German law typically requires {required} maintenance for {object_type}",
                    warning=True
                )
        
        # Check if maintenance is overdue
        if last_maintenance and maintenance_schedule == "yearly":
            one_year_ago = datetime.now(timezone.utc) - timedelta(days=365)
            if last_maintenance < one_year_ago:
                return PropertyValidationResult(
                    True,
                    f"Warning: Annual maintenance overdue since {last_maintenance.strftime('%Y-%m-%d')}",
                    warning=True
                )
        
        return PropertyValidationResult(True, "Maintenance schedule is appropriate")
    
    def validate_technical_specifications(
        self,
        object_type: str,
        specifications: Dict[str, Any]
    ) -> PropertyValidationResult:
        """
        Validate technical specifications for German compliance
        """
        if object_type == "heating_system":
            return self._validate_heating_specifications(specifications)
        elif object_type == "elevator":
            return self._validate_elevator_specifications(specifications)
        else:
            return PropertyValidationResult(True, "No specific German requirements for this object type")
    
    def _validate_heating_specifications(self, specs: Dict[str, Any]) -> PropertyValidationResult:
        """Validate heating system specifications for German standards"""
        
        # Check efficiency class if provided
        efficiency_class = specs.get("efficiency_class")
        if efficiency_class:
            valid_classes = ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"]
            if efficiency_class not in valid_classes:
                return PropertyValidationResult(
                    False,
                    f"Invalid efficiency class. Must be one of: {valid_classes}"
                )
            
            # Warn about low efficiency
            if efficiency_class in ["E", "F", "G"]:
                return PropertyValidationResult(
                    True,
                    f"Warning: Low efficiency class {efficiency_class} - consider upgrading for cost savings",
                    warning=True
                )
        
        # Check power output is reasonable
        power_output = specs.get("power_output_kw")
        heating_area = specs.get("heating_area_sqm")
        if power_output and heating_area:
            # Rule of thumb: 0.06-0.1 kW per m² for German buildings
            ratio = power_output / heating_area
            if ratio < 0.04 or ratio > 0.15:
                return PropertyValidationResult(
                    True,
                    f"Warning: Power output ratio {ratio:.2f} kW/m² seems unusual for German buildings",
                    warning=True
                )
        
        return PropertyValidationResult(True, "Heating system specifications are valid")
    
    def _validate_elevator_specifications(self, specs: Dict[str, Any]) -> PropertyValidationResult:
        """Validate elevator specifications for German safety standards"""
        
        # German elevators require regular TÜV inspection
        last_inspection = specs.get("last_tuv_inspection")
        if last_inspection:
            try:
                inspection_date = datetime.fromisoformat(last_inspection.replace('Z', '+00:00'))
                two_years_ago = datetime.now(timezone.utc) - timedelta(days=730)
                if inspection_date < two_years_ago:
                    return PropertyValidationResult(
                        False,
                        "TÜV inspection overdue - German law requires elevator inspection every 2 years"
                    )
            except (ValueError, AttributeError):
                return PropertyValidationResult(
                    True,
                    "Warning: Invalid TÜV inspection date format",
                    warning=True
                )
        
        return PropertyValidationResult(True, "Elevator specifications meet German standards")