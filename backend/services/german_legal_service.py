"""
German Legal Service - Furnished Item Responsibility Determination
Implements German rental law (BGB) for property management liability decisions
"""

from typing import Optional, Dict, Any
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class LegalResponsibility(str, Enum):
    """Legal responsibility determination for maintenance issues"""
    LANDLORD = "landlord"  # Landlord is responsible for repair/replacement costs
    TENANT = "tenant"      # Tenant is responsible for repair/replacement costs  
    SHARED = "shared"      # Shared responsibility - case-by-case determination needed


class GermanLegalService:
    """
    Service for determining legal responsibility in German rental law context.
    Based on BGB (Bürgerliches Gesetzbuch) and German rental regulations.
    """
    
    @staticmethod
    def determine_furnished_item_responsibility(
        item_ownership: str,
        item_category: str,
        is_essential: bool,
        issue_type: str,
        item_condition: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Determine legal responsibility for furnished item maintenance/repair.
        
        Args:
            item_ownership: "landlord" | "tenant" 
            item_category: Category of the item (furniture, appliance, etc.)
            is_essential: Whether item is essential for basic living
            issue_type: Type of service request (plumbing, electrical, etc.)
            item_condition: Current condition of the item
            
        Returns:
            Dict with responsibility decision and legal reasoning
        """
        
        # Base responsibility determination
        if item_ownership == "tenant":
            # Tenant-owned items: Tenant generally responsible
            responsibility = LegalResponsibility.TENANT
            reasoning = "Tenant-owned item: Tenant responsible for maintenance and repairs (BGB §535)"
            
        elif item_ownership == "landlord":
            # Landlord-provided items: More complex logic
            if is_essential:
                # Essential items: Landlord responsible for maintaining habitability
                responsibility = LegalResponsibility.LANDLORD
                reasoning = "Essential landlord-provided item: Landlord responsible for habitability (BGB §535 Abs. 1)"
                
            else:
                # Non-essential landlord items: Generally landlord responsible unless negligence
                responsibility = LegalResponsibility.LANDLORD
                reasoning = "Non-essential landlord-provided item: Landlord responsible unless tenant negligence (BGB §535)"
        
        else:
            # Unknown ownership: Shared responsibility pending clarification
            responsibility = LegalResponsibility.SHARED
            reasoning = "Unclear ownership: Manual review required to determine responsibility"
        
        # Special case refinements based on issue type
        if issue_type in ["electrical", "plumbing", "hvac"]:
            if item_ownership == "landlord" or is_essential:
                # Safety-critical systems: Always landlord responsibility
                responsibility = LegalResponsibility.LANDLORD
                reasoning = f"Safety-critical {issue_type} issue: Landlord responsible for building safety (BGB §535)"
        
        elif issue_type == "appliance":
            if item_ownership == "landlord" and item_category in ["kitchen", "bathroom"]:
                # Built-in appliances: Landlord responsibility
                responsibility = LegalResponsibility.LANDLORD
                reasoning = "Built-in landlord appliance: Landlord responsible for provided fixtures"
        
        # Condition-based adjustments
        if item_condition == "poor" and item_ownership == "tenant":
            # Poor condition tenant items might indicate negligence
            responsibility = LegalResponsibility.TENANT
            reasoning += " (Poor condition suggests tenant negligence)"
        
        return {
            "responsibility": responsibility.value,
            "reasoning": reasoning,
            "requires_manual_review": responsibility == LegalResponsibility.SHARED,
            "legal_basis": "German BGB §535 (Landlord obligations) and rental law precedents",
            "priority_adjustment": "urgent" if responsibility == LegalResponsibility.LANDLORD and is_essential else None
        }
    
    @staticmethod
    def get_cost_responsibility_percentage(responsibility: str, item_value: Optional[float] = None) -> Dict[str, int]:
        """
        Get cost split percentages for shared responsibilities.
        
        Args:
            responsibility: Legal responsibility determination
            item_value: Value of the item for cost calculations
            
        Returns:
            Dict with landlord_percentage and tenant_percentage
        """
        
        if responsibility == LegalResponsibility.LANDLORD.value:
            return {"landlord_percentage": 100, "tenant_percentage": 0}
        
        elif responsibility == LegalResponsibility.TENANT.value:
            return {"landlord_percentage": 0, "tenant_percentage": 100}
        
        elif responsibility == LegalResponsibility.SHARED.value:
            # Default 50/50 split for shared responsibility
            # In practice, this would require case-by-case legal review
            return {"landlord_percentage": 50, "tenant_percentage": 50}
        
        else:
            # Unknown: Default to landlord responsibility (conservative approach)
            return {"landlord_percentage": 100, "tenant_percentage": 0}
    
    @staticmethod
    def get_approval_requirements(responsibility: str, estimated_cost: Optional[float] = None) -> Dict[str, Any]:
        """
        Determine approval requirements based on responsibility and cost.
        
        Args:
            responsibility: Legal responsibility determination
            estimated_cost: Estimated repair/replacement cost
            
        Returns:
            Dict with approval workflow requirements
        """
        
        # Auto-approval thresholds (configurable)
        LANDLORD_AUTO_APPROVAL_THRESHOLD = 500.0  # EUR
        TENANT_AUTO_APPROVAL_THRESHOLD = 200.0     # EUR
        
        if responsibility == LegalResponsibility.LANDLORD.value:
            if estimated_cost and estimated_cost <= LANDLORD_AUTO_APPROVAL_THRESHOLD:
                return {
                    "requires_approval": False,
                    "auto_approve": True,
                    "reason": f"Landlord responsibility under €{LANDLORD_AUTO_APPROVAL_THRESHOLD} auto-approval threshold"
                }
            else:
                return {
                    "requires_approval": True,
                    "auto_approve": False,
                    "reason": "Landlord responsibility over auto-approval threshold requires property manager approval"
                }
        
        elif responsibility == LegalResponsibility.TENANT.value:
            return {
                "requires_approval": True,
                "auto_approve": False,
                "reason": "Tenant responsibility requires tenant approval and payment confirmation"
            }
        
        else:  # SHARED
            return {
                "requires_approval": True,
                "auto_approve": False,
                "reason": "Shared responsibility requires manual review and cost agreement"
            }
    
    @staticmethod
    def generate_legal_notice_text(responsibility_data: Dict[str, Any], item_name: str) -> str:
        """
        Generate legal notice text for service request communications.
        
        Args:
            responsibility_data: Result from determine_furnished_item_responsibility
            item_name: Name of the furnished item
            
        Returns:
            Formatted legal notice text
        """
        
        responsibility = responsibility_data["responsibility"]
        reasoning = responsibility_data["reasoning"]
        
        if responsibility == LegalResponsibility.LANDLORD.value:
            return f"""
RECHTLICHE MITTEILUNG (Legal Notice):

Gegenstand: {item_name}
Verantwortlichkeit: Vermieter

{reasoning}

Der Vermieter ist gemäß deutschem Mietrecht für diese Reparatur/Wartung verantwortlich. 
Die Kosten werden vom Vermieter getragen.

---

LEGAL NOTICE:

Subject: {item_name}
Responsibility: Landlord

The landlord is responsible for this repair/maintenance under German rental law.
Costs will be covered by the landlord.
            """.strip()
        
        elif responsibility == LegalResponsibility.TENANT.value:
            return f"""
RECHTLICHE MITTEILUNG (Legal Notice):

Gegenstand: {item_name}
Verantwortlichkeit: Mieter

{reasoning}

Der Mieter ist für diese Reparatur/Wartung verantwortlich.
Bitte bestätigen Sie die Kostentragung vor Durchführung der Arbeiten.

---

LEGAL NOTICE:

Subject: {item_name}
Responsibility: Tenant

The tenant is responsible for this repair/maintenance.
Please confirm cost responsibility before work proceeds.
            """.strip()
        
        else:  # SHARED
            return f"""
RECHTLICHE MITTEILUNG (Legal Notice):

Gegenstand: {item_name}
Verantwortlichkeit: Geteilte Verantwortung

{reasoning}

Eine manuelle Prüfung der Kostenteilung ist erforderlich.
Bitte kontaktieren Sie die Hausverwaltung für weitere Klärung.

---

LEGAL NOTICE:

Subject: {item_name}
Responsibility: Shared

Manual review of cost allocation required.
Please contact property management for further clarification.
            """.strip()