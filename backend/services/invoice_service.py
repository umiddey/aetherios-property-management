from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from datetime import datetime
import logging
import uuid

from services.base_service import BaseService
from models.invoice import Invoice, InvoiceCreate, InvoiceUpdate, InvoiceFilters, InvoiceStatus

logger = logging.getLogger(__name__)


class InvoiceService(BaseService):
    """Service for managing invoice operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "invoices")
        self.setup_indexes()
    
    def setup_indexes(self):
        """Setup indexes for invoice collection."""
        try:
            # Invoice number index for uniqueness
            self.db.invoices.create_index("invoice_number", unique=True, background=True)
            # Foreign key indexes
            self.db.invoices.create_index("tenant_id", background=True)
            self.db.invoices.create_index("property_id", background=True)
            # Status and date indexes
            self.db.invoices.create_index([("status", 1), ("is_archived", 1)], background=True)
            self.db.invoices.create_index("due_date", background=True)
            self.db.invoices.create_index("invoice_date", background=True)
            self.db.invoices.create_index("created_at", background=True)
            self.db.invoices.create_index("created_by", background=True)
            # Compound index for overdue invoices
            self.db.invoices.create_index([("status", 1), ("due_date", 1)], background=True)
            logger.info("Invoice service indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create invoice indexes: {str(e)}")
    
    async def validate_create_data(self, data: InvoiceCreate) -> None:
        """Validate invoice creation data."""
        # Check if tenant exists
        tenant = await self.db.tenants.find_one({"id": data.tenant_id, "is_archived": False})
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Check if property exists
        property_doc = await self.db.properties.find_one({"id": data.property_id, "is_archived": False})
        if not property_doc:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Validate amount
        if data.amount <= 0:
            raise HTTPException(status_code=400, detail="Invoice amount must be greater than 0")
        
        # Validate dates
        if data.due_date <= data.invoice_date:
            raise HTTPException(status_code=400, detail="Due date must be after invoice date")
        
        # Validate description
        if not data.description.strip():
            raise HTTPException(status_code=400, detail="Invoice description cannot be empty")
    
    async def validate_update_data(self, invoice_id: str, update_data: Dict[str, Any]) -> None:
        """Validate invoice update data."""
        # Get existing invoice
        existing_invoice = await self.get_by_id(invoice_id)
        if not existing_invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # If updating tenant_id, check if tenant exists
        if "tenant_id" in update_data:
            tenant = await self.db.tenants.find_one({"id": update_data["tenant_id"], "is_archived": False})
            if not tenant:
                raise HTTPException(status_code=404, detail="Tenant not found")
        
        # If updating property_id, check if property exists
        if "property_id" in update_data:
            property_doc = await self.db.properties.find_one({"id": update_data["property_id"], "is_archived": False})
            if not property_doc:
                raise HTTPException(status_code=404, detail="Property not found")
        
        # Validate amount
        if "amount" in update_data and update_data["amount"] <= 0:
            raise HTTPException(status_code=400, detail="Invoice amount must be greater than 0")
        
        # Validate dates
        invoice_date = update_data.get("invoice_date", existing_invoice.get("invoice_date"))
        due_date = update_data.get("due_date", existing_invoice.get("due_date"))
        
        if invoice_date and due_date and due_date <= invoice_date:
            raise HTTPException(status_code=400, detail="Due date must be after invoice date")
        
        # Validate description
        if "description" in update_data and not update_data["description"].strip():
            raise HTTPException(status_code=400, detail="Invoice description cannot be empty")
    
    async def create_invoice(self, invoice_data: InvoiceCreate, created_by: str) -> Dict[str, Any]:
        """Create a new invoice."""
        await self.validate_create_data(invoice_data)
        
        # Generate invoice number
        invoice_number = await self.generate_invoice_number()
        
        # Create a modified invoice data with the invoice number and id
        invoice_dict = invoice_data.model_dump()
        invoice_dict["invoice_number"] = invoice_number
        invoice_dict["id"] = str(uuid.uuid4())  # Generate unique ID
        invoice_dict["created_by"] = created_by
        invoice_dict["created_at"] = datetime.utcnow()
        invoice_dict["is_archived"] = False
        
        # Insert into database
        await self.collection.insert_one(invoice_dict)
        
        # Remove MongoDB's _id before returning
        if "_id" in invoice_dict:
            del invoice_dict["_id"]
            
        logger.info(f"Created invoice: {invoice_number}")
        return invoice_dict
    
    async def get_invoice_by_id(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        """Get invoice by ID."""
        invoice = await self.get_by_id(invoice_id)
        if invoice:
            # Ensure required fields exist with defaults
            invoice.setdefault("invoice_number", "")
            invoice.setdefault("tenant_id", "")
            invoice.setdefault("property_id", "")
            invoice.setdefault("amount", 0.0)
            invoice.setdefault("description", "")
            invoice.setdefault("status", InvoiceStatus.DRAFT)
        return invoice
    
    async def get_invoice_by_number(self, invoice_number: str) -> Optional[Dict[str, Any]]:
        """Get invoice by invoice number."""
        invoice = await self.collection.find_one({"invoice_number": invoice_number})
        if invoice and "_id" in invoice:
            del invoice["_id"]
        return invoice
    
    async def get_invoices_with_filters(self, filters: InvoiceFilters, **kwargs) -> List[Dict[str, Any]]:
        """Get invoices with advanced filtering."""
        query = {}
        
        # Build query from filters
        if filters.tenant_id:
            query["tenant_id"] = filters.tenant_id
        
        if filters.property_id:
            query["property_id"] = filters.property_id
        
        if filters.status:
            query["status"] = filters.status
        
        if filters.archived is not None:
            query["is_archived"] = filters.archived
        else:
            query["is_archived"] = False  # Default to non-archived
        
        if filters.date_from or filters.date_to:
            date_query = {}
            if filters.date_from:
                date_query["$gte"] = filters.date_from
            if filters.date_to:
                date_query["$lte"] = filters.date_to
            query["invoice_date"] = date_query
        
        if filters.overdue_only:
            # Get overdue invoices
            return await self.get_overdue_invoices()
        
        # Get all invoices with query
        # Map offset to skip for base service compatibility
        if 'offset' in kwargs:
            kwargs['skip'] = kwargs.pop('offset')
        invoices = await self.get_all(query, **kwargs)
        
        # Ensure all invoices have required fields
        for invoice in invoices:
            invoice.setdefault("invoice_number", "")
            invoice.setdefault("tenant_id", "")
            invoice.setdefault("property_id", "")
            invoice.setdefault("amount", 0.0)
            invoice.setdefault("description", "")
            invoice.setdefault("status", InvoiceStatus.DRAFT)
        
        return invoices
    
    async def generate_invoice_number(self) -> str:
        """Generate a unique invoice number."""
        current_year = datetime.utcnow().year
        
        # Find the highest invoice number for current year
        pattern = f"INV-{current_year}-%"
        last_invoice = await self.collection.find_one(
            {"invoice_number": {"$regex": f"^INV-{current_year}-"}},
            sort=[("invoice_number", -1)]
        )
        
        if last_invoice:
            # Extract the number and increment
            last_number = int(last_invoice["invoice_number"].split("-")[-1])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"INV-{current_year}-{new_number:04d}"
    
    async def update_invoice(self, invoice_id: str, update_data: InvoiceUpdate) -> Optional[Dict[str, Any]]:
        """Update an invoice."""
        update_dict = update_data.model_dump(exclude_unset=True)
        await self.validate_update_data(invoice_id, update_dict)
        
        result = await self.update(invoice_id, update_dict)
        if result:
            logger.info(f"Updated invoice: {invoice_id}")
        return result
    
    async def delete_invoice(self, invoice_id: str) -> bool:
        """Soft delete an invoice (mark as archived)."""
        result = await self.update(invoice_id, {"is_archived": True})
        if result:
            logger.info(f"Archived invoice: {invoice_id}")
            return True
        return False
    
    async def mark_invoice_as_paid(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        """Mark an invoice as paid."""
        result = await self.update(invoice_id, {"status": InvoiceStatus.PAID})
        if result:
            logger.info(f"Marked invoice as paid: {invoice_id}")
        return result
    
    async def mark_invoice_as_sent(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        """Mark an invoice as sent."""
        result = await self.update(invoice_id, {"status": InvoiceStatus.SENT})
        if result:
            logger.info(f"Marked invoice as sent: {invoice_id}")
        return result
    
    async def get_invoices_by_tenant(self, tenant_id: str, archived: bool = False) -> List[Dict[str, Any]]:
        """Get all invoices for a specific tenant."""
        query = {"tenant_id": tenant_id, "is_archived": archived}
        cursor = self.collection.find(query).sort("invoice_date", -1)
        invoices = await cursor.to_list(length=None)
        
        # Remove MongoDB's _id from all invoices
        for invoice in invoices:
            if "_id" in invoice:
                del invoice["_id"]
        
        return invoices
    
    async def get_invoices_by_property(self, property_id: str, archived: bool = False) -> List[Dict[str, Any]]:
        """Get all invoices for a specific property."""
        query = {"property_id": property_id, "is_archived": archived}
        cursor = self.collection.find(query).sort("invoice_date", -1)
        invoices = await cursor.to_list(length=None)
        
        # Remove MongoDB's _id from all invoices
        for invoice in invoices:
            if "_id" in invoice:
                del invoice["_id"]
        
        return invoices
    
    async def get_overdue_invoices(self) -> List[Dict[str, Any]]:
        """Get all overdue invoices."""
        current_date = datetime.utcnow()
        query = {
            "due_date": {"$lt": current_date},
            "status": {"$in": ["sent", "draft"]},
            "is_archived": False
        }
        cursor = self.collection.find(query).sort("due_date", 1)
        invoices = await cursor.to_list(length=None)
        
        # Remove MongoDB's _id from all invoices
        for invoice in invoices:
            if "_id" in invoice:
                del invoice["_id"]
        
        return invoices
    
    async def get_invoice_stats(self) -> Dict[str, Any]:
        """Get invoice statistics."""
        try:
            stats = await self.collection.aggregate([
                {
                    "$match": {"is_archived": False}
                },
                {
                    "$group": {
                        "_id": None,
                        "total_invoices": {"$sum": 1},
                        "draft_invoices": {
                            "$sum": {"$cond": [{"$eq": ["$status", "draft"]}, 1, 0]}
                        },
                        "sent_invoices": {
                            "$sum": {"$cond": [{"$eq": ["$status", "sent"]}, 1, 0]}
                        },
                        "paid_invoices": {
                            "$sum": {"$cond": [{"$eq": ["$status", "paid"]}, 1, 0]}
                        },
                        "overdue_invoices": {
                            "$sum": {"$cond": [{"$eq": ["$status", "overdue"]}, 1, 0]}
                        },
                        "total_amount": {"$sum": "$amount"},
                        "paid_amount": {
                            "$sum": {"$cond": [{"$eq": ["$status", "paid"]}, "$amount", 0]}
                        },
                        "outstanding_amount": {
                            "$sum": {"$cond": [{"$ne": ["$status", "paid"]}, "$amount", 0]}
                        }
                    }
                }
            ]).to_list(1)
            
            if stats:
                return stats[0]
            else:
                return {
                    "total_invoices": 0,
                    "draft_invoices": 0,
                    "sent_invoices": 0,
                    "paid_invoices": 0,
                    "overdue_invoices": 0,
                    "total_amount": 0,
                    "paid_amount": 0,
                    "outstanding_amount": 0
                }
        except Exception as e:
            logger.error(f"Error getting invoice stats: {str(e)}")
            raise
    
    async def update_overdue_invoices(self) -> int:
        """Update overdue invoice status and return count of updated invoices."""
        try:
            current_date = datetime.utcnow()
            
            # Find invoices that are overdue but not marked as such
            overdue_query = {
                "due_date": {"$lt": current_date},
                "status": {"$in": [InvoiceStatus.SENT, InvoiceStatus.DRAFT]},
                "is_archived": False
            }
            
            # Update to overdue status
            result = await self.invoice_repository.collection.update_many(
                overdue_query,
                {"$set": {"status": InvoiceStatus.OVERDUE}}
            )
            
            if result.modified_count > 0:
                logger.info(f"Updated {result.modified_count} invoices to overdue status")
            
            return result.modified_count
            
        except Exception as e:
            logger.error(f"Error updating overdue invoices: {str(e)}")
            raise