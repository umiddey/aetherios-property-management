from typing import Dict, List, Optional
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
import uuid

from ..models.contract import Contract, ContractBillingType, ContractType
from ..models.invoice import Invoice, InvoiceCreate, InvoiceType, InvoiceStatus
from .base_service import BaseService
from .contract_service import ContractService
from .invoice_service import InvoiceService


class ContractInvoiceService:
    """
    Service for generating invoices from contracts based on billing type and frequency.
    
    Core Business Logic:
    - SERVICE contracts → Credit (contractor receives) / Debit (tenant pays) invoices
    - RENTAL contracts → Debit invoices (tenant pays rent)
    - EMPLOYMENT contracts → Credit invoices (employee receives salary)
    """
    
    def __init__(self, contract_service: ContractService, invoice_service: InvoiceService):
        self.contract_service = contract_service
        self.invoice_service = invoice_service
    
    async def generate_invoice_from_contract(
        self, 
        contract_id: str, 
        created_by: str,
        override_amount: Optional[float] = None,
        override_description: Optional[str] = None
    ) -> Invoice:
        """
        Generate a single invoice from a contract.
        
        Args:
            contract_id: ID of the contract to generate invoice from
            created_by: User ID creating the invoice
            override_amount: Optional custom amount (defaults to contract value)
            override_description: Optional custom description
            
        Returns:
            Generated Invoice object
            
        Raises:
            ValueError: If contract doesn't support invoice generation
        """
        # Get contract details
        contract = await self.contract_service.get_by_id(contract_id)
        if not contract:
            raise ValueError(f"Contract {contract_id} not found")
        
        if contract.status != "active":
            raise ValueError(f"Cannot generate invoice from {contract.status} contract")
        
        # Determine invoice type based on contract type and billing type
        invoice_type = self._determine_invoice_type(contract)
        
        # Generate invoice data
        amount = override_amount or contract.value or 0.0
        description = override_description or self._generate_invoice_description(contract)
        invoice_number = await self._generate_invoice_number(contract)
        
        # Create invoice
        invoice_data = InvoiceCreate(
            contract_id=contract_id,
            invoice_type=invoice_type,
            amount=amount,
            description=description,
            invoice_date=datetime.utcnow(),
            due_date=datetime.utcnow() + timedelta(days=30),  # Default 30 days
            tenant_id=contract.related_tenant_id,  # Legacy compatibility
            property_id=contract.related_property_id
        )
        
        invoice = await self.invoice_service.create(invoice_data, created_by)
        
        # Update contract's next billing date if recurring
        if contract.billing_type in [ContractBillingType.RECURRING]:
            await self._update_next_billing_date(contract)
        
        return invoice
    
    async def generate_recurring_invoices(self, created_by: str) -> List[Invoice]:
        """
        Generate all due recurring invoices from active contracts.
        
        This should be called by a scheduled job (cron/celery) to automatically
        generate monthly rent, salary, and other recurring invoices.
        
        Returns:
            List of generated invoices
        """
        generated_invoices = []
        
        # Find contracts with recurring billing that are due
        contracts = await self.contract_service.get_contracts_due_for_billing()
        
        for contract in contracts:
            try:
                invoice = await self.generate_invoice_from_contract(
                    contract.id, 
                    created_by
                )
                generated_invoices.append(invoice)
            except Exception as e:
                # Log error but continue with other contracts
                print(f"Error generating invoice for contract {contract.id}: {e}")
        
        return generated_invoices
    
    async def setup_contract_billing(
        self,
        contract_id: str,
        billing_type: ContractBillingType,
        billing_frequency: str = "monthly",
        start_date: Optional[date] = None
    ) -> Contract:
        """
        Configure a contract for automatic invoice generation.
        
        Args:
            contract_id: Contract to configure
            billing_type: CREDIT, DEBIT, RECURRING, or ONE_TIME
            billing_frequency: "monthly", "quarterly", "yearly", "one_time"
            start_date: When to start billing (defaults to contract start_date)
            
        Returns:
            Updated contract
        """
        contract = await self.contract_service.get_by_id(contract_id)
        if not contract:
            raise ValueError(f"Contract {contract_id} not found")
        
        # Calculate next billing date
        base_date = start_date or contract.start_date or date.today()
        next_billing_date = self._calculate_next_billing_date(base_date, billing_frequency)
        
        # Update contract
        update_data = {
            "billing_type": billing_type,
            "billing_frequency": billing_frequency,
            "next_billing_date": next_billing_date
        }
        
        return await self.contract_service.update(contract_id, update_data, contract.created_by)
    
    def _determine_invoice_type(self, contract: Contract) -> InvoiceType:
        """Determine whether invoice should be CREDIT or DEBIT based on contract type."""
        
        if contract.billing_type == ContractBillingType.CREDIT:
            return InvoiceType.CREDIT
        elif contract.billing_type == ContractBillingType.DEBIT:
            return InvoiceType.DEBIT
        
        # Default logic based on contract type if billing_type not set
        if contract.contract_type == ContractType.RENTAL:
            return InvoiceType.DEBIT  # Tenant pays rent
        elif contract.contract_type == ContractType.EMPLOYMENT:
            return InvoiceType.CREDIT  # Employee receives salary
        elif contract.contract_type == ContractType.SERVICE:
            # For service contracts, need to check the parties
            # Default to DEBIT (customer pays for service)
            return InvoiceType.DEBIT
        else:
            return InvoiceType.DEBIT  # Default
    
    def _generate_invoice_description(self, contract: Contract) -> str:
        """Generate descriptive invoice text based on contract type."""
        
        if contract.contract_type == ContractType.RENTAL:
            month_year = datetime.now().strftime("%B %Y")
            return f"Rent payment for {month_year} - {contract.title}"
        elif contract.contract_type == ContractType.EMPLOYMENT:
            month_year = datetime.now().strftime("%B %Y")
            return f"Salary for {month_year} - {contract.title}"
        elif contract.contract_type == ContractType.SERVICE:
            return f"Service payment - {contract.title}"
        else:
            return f"Payment for {contract.title}"
    
    async def _generate_invoice_number(self, contract: Contract) -> str:
        """Generate unique invoice number."""
        # Simple format: INV-YYYY-MM-XXXXX
        now = datetime.now()
        prefix = f"INV-{now.year:04d}-{now.month:02d}"
        
        # Get count of invoices this month to generate sequence
        # This is simplified - in production you'd want atomic counters
        sequence = str(uuid.uuid4())[:8].upper()
        
        return f"{prefix}-{sequence}"
    
    def _calculate_next_billing_date(self, base_date: date, frequency: str) -> date:
        """Calculate next billing date based on frequency."""
        
        if frequency == "monthly":
            return base_date + relativedelta(months=1)
        elif frequency == "quarterly":
            return base_date + relativedelta(months=3)
        elif frequency == "yearly":
            return base_date + relativedelta(years=1)
        elif frequency == "weekly":
            return base_date + timedelta(weeks=1)
        elif frequency == "daily":
            return base_date + timedelta(days=1)
        else:  # one_time
            return base_date
    
    async def _update_next_billing_date(self, contract: Contract):
        """Update contract's next billing date after generating invoice."""
        if not contract.billing_frequency:
            return
        
        current_date = contract.next_billing_date or date.today()
        next_date = self._calculate_next_billing_date(current_date, contract.billing_frequency)
        
        await self.contract_service.update(
            contract.id,
            {"next_billing_date": next_date},
            contract.created_by
        )