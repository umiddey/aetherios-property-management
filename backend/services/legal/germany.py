from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional, Dict, Any
from services.property_validation import BasePropertyValidator, PropertyValidationResult, Jurisdiction


class GermanPropertyValidator(BasePropertyValidator):
    """
    German property management legal compliance validator
    Based on BGB, BetrKV, and GEG regulations
    """
    
    @property
    def jurisdiction(self) -> Jurisdiction:
        return Jurisdiction.GERMANY
    
    @property
    def standard_vat_rate(self) -> float:
        return 0.19  # 19% German standard VAT rate
    
    @property
    def reduced_vat_rate(self) -> float:
        return 0.07  # 7% German reduced VAT rate
    
    def validate_energy_certificate(
        self,
        certificate_type: Optional[str],
        expiry_date: Optional[datetime],
        energy_class: Optional[str],
        energy_value: Optional[float]
    ) -> PropertyValidationResult:
        """
        Validate energy certificate according to GEG (Gebäudeenergiegesetz)
        """
        if not certificate_type:
            return PropertyValidationResult(
                False, 
                "Energy certificate type is mandatory for rental properties (GEG compliance)"
            )
            
        valid_types = ["verbrauchsausweis", "bedarfsausweis"]
        if certificate_type not in valid_types:
            return PropertyValidationResult(
                False, 
                f"Invalid certificate type. Must be one of: {valid_types}"
            )
            
        if not expiry_date:
            return PropertyValidationResult(
                False, 
                "Energy certificate expiry date is mandatory"
            )
            
        if expiry_date <= datetime.now(timezone.utc):
            return PropertyValidationResult(
                False, 
                "Energy certificate has expired. Valid certificate required for rental marketing"
            )
            
        if not energy_class:
            return PropertyValidationResult(
                False, 
                "Energy efficiency class is mandatory"
            )
            
        valid_classes = ["A+", "A", "B", "C", "D", "E", "F", "G", "H"]
        if energy_class not in valid_classes:
            return PropertyValidationResult(
                False, 
                f"Invalid energy class. Must be one of: {valid_classes}"
            )
            
        if energy_value is not None and energy_value < 0:
            return PropertyValidationResult(
                False, 
                "Energy value cannot be negative"
            )
            
        # Check if certificate expires within 6 months (warning)
        six_months_from_now = datetime.now(timezone.utc) + timedelta(days=180)
        if expiry_date < six_months_from_now:
            return PropertyValidationResult(
                True, 
                f"Warning: Energy certificate expires on {expiry_date.strftime('%Y-%m-%d')} - renewal recommended",
                warning=True
            )
            
        return PropertyValidationResult(True, "Energy certificate is valid")
    
    # NOTE: Heating system validation moved to Technical Objects Validation Service
    # Properties only validate building characteristics (energy certificate)
    # Technical Objects validate equipment compliance (heating, elevator, etc.)
    
    def calculate_notice_period(self, rental_type: str, tenancy_months: int) -> Tuple[int, int]:
        """
        Calculate legal notice periods according to BGB §§573-580
        
        Returns:
            (landlord_notice_months, tenant_notice_months)
        """
        if rental_type == "unbefristet":
            # Tenant notice: always 3 months (BGB §573c)
            tenant_notice = 3
            
            # Landlord notice: depends on tenancy duration (BGB §573c)
            if tenancy_months < 60:  # Less than 5 years
                landlord_notice = 3
            elif tenancy_months < 96:  # 5-8 years
                landlord_notice = 6
            else:  # More than 8 years
                landlord_notice = 9
                
        elif rental_type == "befristet":
            # Fixed-term contracts end automatically (BGB §575)
            landlord_notice = 0
            tenant_notice = 0
            
        elif rental_type == "moebiliert":
            # Furnished temporary rentals (BGB §549)
            landlord_notice = 0.5  # 2 weeks represented as 0.5 months
            tenant_notice = 0.5
            
        else:
            # Default to standard notice periods
            landlord_notice = 3
            tenant_notice = 3
            
        return (landlord_notice, tenant_notice)
    
    def validate_marketing_compliance(self, property_data: Dict[str, Any]) -> PropertyValidationResult:
        """
        Validate minimum requirements for property marketing in Germany
        """
        energieausweis_type = property_data.get("energieausweis_type")
        energieausweis_class = property_data.get("energieausweis_class")
        energieausweis_value = property_data.get("energieausweis_value")
        
        if not energieausweis_type:
            return PropertyValidationResult(
                False, 
                "Energy certificate is mandatory for property marketing (GEG - fine up to €15,000)"
            )
            
        if not energieausweis_class:
            return PropertyValidationResult(
                False, 
                "Energy efficiency class must be displayed in property advertisements"
            )
            
        if energieausweis_value is None:
            return PropertyValidationResult(
                False, 
                "Primary energy value must be specified in property advertisements"
            )
            
        return PropertyValidationResult(True, "Property meets marketing compliance requirements")
    
    def validate_cost_distribution(
        self,
        cost_type: str,
        distribution_method: str,
        percentage_allocation: Dict[str, float]
    ) -> PropertyValidationResult:
        """
        Validate utilities distribution according to BetrKV
        """
        # Check if percentages sum to 1.0 (100%)
        if percentage_allocation:
            total_percentage = sum(percentage_allocation.values())
            if not (0.99 <= total_percentage <= 1.01):  # Allow small rounding errors
                return PropertyValidationResult(
                    False, 
                    f"Percentage allocation must sum to 100% (currently {total_percentage*100:.1f}%)"
                )
        
        # BetrKV specific validation
        heating_costs = ["heating", "hot_water"]
        if cost_type in heating_costs:
            if distribution_method == "apartment_count":
                return PropertyValidationResult(
                    False, 
                    "Heating costs cannot be distributed equally - consumption-based allocation required (BetrKV §7-9)"
                )
            
            if distribution_method != "consumption":
                return PropertyValidationResult(
                    True, 
                    "Warning: BetrKV requires 50-70% consumption-based allocation for heating costs",
                    warning=True
                )
        
        # Validate appropriate distribution methods for cost types
        cost_method_rules = {
            "cleaning": ["surface_area", "apartment_count"],
            "lighting": ["surface_area", "apartment_count"],
            "elevator": ["surface_area", "apartment_count"],
            "maintenance": ["surface_area", "apartment_count"],
            "garbage": ["apartment_count", "person_count"],
            "water": ["person_count", "consumption"],
            "sewage": ["person_count", "consumption"],
            "insurance": ["surface_area", "apartment_count"]
        }
        
        if cost_type in cost_method_rules:
            valid_methods = cost_method_rules[cost_type]
            if distribution_method not in valid_methods:
                return PropertyValidationResult(
                    True, 
                    f"Warning: {distribution_method} allocation unusual for {cost_type}. Typical methods: {valid_methods}",
                    warning=True
                )
        
        return PropertyValidationResult(True, "Distribution method is valid")
    
    def get_vat_rate(self, service_type: str = "property_management") -> float:
        """
        Get applicable German VAT rate for property management services
        """
        # Most property management services are subject to 19% VAT
        reduced_vat_services = [
            "social_housing",
            "long_term_rental",  # Under certain conditions
            "construction_work"  # Under certain conditions
        ]
        
        if service_type in reduced_vat_services:
            return self.reduced_vat_rate
        
        return self.standard_vat_rate