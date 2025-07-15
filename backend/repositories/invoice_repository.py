from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from repositories.base_repository import BaseRepository
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class InvoiceRepository(BaseRepository):
    """Repository for managing invoice data operations."""
    
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
            logger.info("Invoice repository indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create invoice indexes: {str(e)}")
    
    async def find_by_invoice_number(self, invoice_number: str) -> Optional[Dict[str, Any]]:
        """Find invoice by invoice number."""
        return await self.collection.find_one({"invoice_number": invoice_number})
    
    async def get_invoices_by_tenant(self, tenant_id: str, archived: bool = False) -> List[Dict[str, Any]]:
        """Get all invoices for a specific tenant."""
        query = {"tenant_id": tenant_id, "is_archived": archived}
        cursor = self.collection.find(query).sort("invoice_date", -1)
        return await cursor.to_list(length=None)
    
    async def get_invoices_by_property(self, property_id: str, archived: bool = False) -> List[Dict[str, Any]]:
        """Get all invoices for a specific property."""
        query = {"property_id": property_id, "is_archived": archived}
        cursor = self.collection.find(query).sort("invoice_date", -1)
        return await cursor.to_list(length=None)
    
    async def get_invoices_by_status(self, status: str, archived: bool = False) -> List[Dict[str, Any]]:
        """Get invoices by status."""
        query = {"status": status, "is_archived": archived}
        cursor = self.collection.find(query).sort("due_date", 1)
        return await cursor.to_list(length=None)
    
    async def get_overdue_invoices(self) -> List[Dict[str, Any]]:
        """Get all overdue invoices."""
        current_date = datetime.utcnow()
        query = {
            "due_date": {"$lt": current_date},
            "status": {"$in": ["sent", "draft"]},
            "is_archived": False
        }
        cursor = self.collection.find(query).sort("due_date", 1)
        return await cursor.to_list(length=None)
    
    async def get_invoices_by_date_range(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get invoices within a date range."""
        query = {
            "invoice_date": {
                "$gte": start_date,
                "$lte": end_date
            },
            "is_archived": False
        }
        cursor = self.collection.find(query).sort("invoice_date", -1)
        return await cursor.to_list(length=None)
    
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