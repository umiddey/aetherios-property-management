from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from datetime import datetime
import logging
import uuid

from services.base_service import BaseService

logger = logging.getLogger(__name__)


class CustomerService(BaseService):
    """Service for managing customer operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "customers")
        self.setup_indexes()
    
    def setup_indexes(self):
        """Setup indexes for customer collection."""
        try:
            # Email index for uniqueness
            self.db.customers.create_index("email", unique=True, background=True)
            # Search indexes
            self.db.customers.create_index([("name", "text"), ("company", "text"), ("email", "text")], background=True)
            # Performance indexes
            self.db.customers.create_index("created_at", background=True)
            self.db.customers.create_index("created_by", background=True)
            logger.info("Customer service indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create customer indexes: {str(e)}")
    
    async def validate_create_data(self, data) -> None:
        """Validate customer creation data."""
        # Check if email already exists
        existing_customer = await self.collection.find_one({"email": data.email})
        if existing_customer:
            raise HTTPException(status_code=400, detail=f"Customer with email '{data.email}' already exists")
        
        # Validate email format (already handled by EmailStr in model)
        # Additional validations can be added here
        
        if hasattr(data, 'phone') and data.phone and len(data.phone) > 50:
            raise HTTPException(status_code=400, detail="Phone number is too long")
    
    async def validate_update_data(self, customer_id: str, update_data: Dict[str, Any]) -> None:
        """Validate customer update data."""
        if "email" in update_data:
            # Check if email already exists (excluding current customer)
            existing_customer = await self.collection.find_one({"email": update_data["email"]})
            if existing_customer and existing_customer.get("id") != customer_id:
                raise HTTPException(status_code=400, detail=f"Customer with email '{update_data['email']}' already exists")
        
        if "phone" in update_data and update_data["phone"] and len(update_data["phone"]) > 50:
            raise HTTPException(status_code=400, detail="Phone number is too long")
    
    async def create_customer(self, customer_data, created_by: str) -> Dict[str, Any]:
        """Create a new customer."""
        await self.validate_create_data(customer_data)
        result = await self.create(customer_data, created_by)
        logger.info(f"Created customer with email: {customer_data.email}")
        return result
    
    async def get_customer_by_id(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Get customer by ID."""
        customer = await self.get_by_id(customer_id)
        if customer:
            # Ensure required fields exist with defaults
            customer.setdefault("name", "")
            customer.setdefault("company", "")
            customer.setdefault("email", "")
            customer.setdefault("phone", "")
            customer.setdefault("address", "")
        return customer
    
    async def get_customer_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get customer by email address."""
        customer = await self.collection.find_one({"email": email})
        if customer and "_id" in customer:
            del customer["_id"]
        return customer
    
    async def get_all_customers(self, **kwargs) -> List[Dict[str, Any]]:
        """Get all customers."""
        # Map offset to skip for base service compatibility
        if 'offset' in kwargs:
            kwargs['skip'] = kwargs.pop('offset')
        customers = await self.get_all({}, **kwargs)
        
        # Ensure all customers have required fields
        for customer in customers:
            customer.setdefault("name", "")
            customer.setdefault("company", "")
            customer.setdefault("email", "")
            customer.setdefault("phone", "")
            customer.setdefault("address", "")
        
        return customers
    
    async def update_customer(self, customer_id: str, update_data) -> Optional[Dict[str, Any]]:
        """Update a customer."""
        if hasattr(update_data, 'model_dump'):
            update_dict = update_data.model_dump(exclude_unset=True)
        else:
            update_dict = update_data
            
        await self.validate_update_data(customer_id, update_dict)
        
        result = await self.update(customer_id, update_dict)
        if result:
            logger.info(f"Updated customer: {customer_id}")
        return result
    
    async def delete_customer(self, customer_id: str) -> bool:
        """Delete a customer."""
        result = await self.delete(customer_id)
        if result:
            logger.info(f"Deleted customer: {customer_id}")
            return True
        return False
    
    async def search_customers(self, search_term: str) -> List[Dict[str, Any]]:
        """Search customers by name, company, or email."""
        query = {
            "$or": [
                {"name": {"$regex": search_term, "$options": "i"}},
                {"company": {"$regex": search_term, "$options": "i"}},
                {"email": {"$regex": search_term, "$options": "i"}}
            ]
        }
        cursor = self.collection.find(query).sort("created_at", -1)
        customers = await cursor.to_list(length=None)
        
        # Remove MongoDB's _id and ensure all customers have required fields
        for customer in customers:
            if "_id" in customer:
                del customer["_id"]
            customer.setdefault("name", "")
            customer.setdefault("company", "")
            customer.setdefault("email", "")
            customer.setdefault("phone", "")
            customer.setdefault("address", "")
        
        return customers
    
    async def get_customer_stats(self) -> Dict[str, Any]:
        """Get customer statistics."""
        try:
            stats = await self.collection.aggregate([
                {
                    "$group": {
                        "_id": None,
                        "total_customers": {"$sum": 1},
                        "customers_with_phone": {
                            "$sum": {"$cond": [{"$ne": ["$phone", None]}, 1, 0]}
                        },
                        "customers_with_address": {
                            "$sum": {"$cond": [{"$ne": ["$address", None]}, 1, 0]}
                        }
                    }
                }
            ]).to_list(1)
            
            if stats:
                return stats[0]
            else:
                return {
                    "total_customers": 0,
                    "customers_with_phone": 0,
                    "customers_with_address": 0
                }
        except Exception as e:
            logger.error(f"Error getting customer stats: {str(e)}")
            raise