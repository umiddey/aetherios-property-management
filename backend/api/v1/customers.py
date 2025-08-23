from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging

from services.accounts.customer_service import CustomerService
from models.customer import Customer, CustomerCreate, CustomerUpdate, CustomerResponse
from utils.auth import get_current_user
from utils.dependencies import get_database

logger = logging.getLogger(__name__)

router = APIRouter()

# Customer routes
@router.post("/customers/", response_model=CustomerResponse)
async def create_customer(
    customer_data: CustomerCreate, 
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new customer."""
    try:
        customer_service = CustomerService(db)
        customer = await customer_service.create_customer(customer_data, current_user.id)
        return CustomerResponse(**customer)
    except Exception as e:
        logger.error(f"Error creating customer: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create customer")

@router.get("/customers/", response_model=List[CustomerResponse])
async def get_customers(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all customers with pagination."""
    try:
        customer_service = CustomerService(db)
        customers = await customer_service.get_all_customers(offset=offset, limit=limit)
        return [CustomerResponse(**customer) for customer in customers]
    except Exception as e:
        logger.error(f"Error fetching customers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch customers")

@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific customer by ID."""
    try:
        customer_service = CustomerService(db)
        customer = await customer_service.get_customer_by_id(customer_id)
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return CustomerResponse(**customer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching customer {customer_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch customer")

@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    customer_data: CustomerUpdate,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update a customer."""
    try:
        customer_service = CustomerService(db)
        customer = await customer_service.update_customer(customer_id, customer_data)
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return CustomerResponse(**customer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating customer {customer_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update customer")

@router.delete("/customers/{customer_id}")
async def delete_customer(
    customer_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a customer."""
    try:
        customer_service = CustomerService(db)
        success = await customer_service.delete_customer(customer_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {"message": "Customer deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting customer {customer_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete customer")

@router.get("/customers/search/{search_term}", response_model=List[CustomerResponse])
async def search_customers(
    search_term: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Search customers by name, company, or email."""
    try:
        customer_service = CustomerService(db)
        customers = await customer_service.search_customers(search_term)
        return [CustomerResponse(**customer) for customer in customers]
    except Exception as e:
        logger.error(f"Error searching customers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search customers")

@router.get("/customers/email/{email}", response_model=CustomerResponse)
async def get_customer_by_email(
    email: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a customer by email address."""
    try:
        customer_service = CustomerService(db)
        customer = await customer_service.get_customer_by_email(email)
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return CustomerResponse(**customer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching customer by email {email}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch customer")

@router.get("/customers/stats/summary")
async def get_customer_stats(
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get customer statistics."""
    try:
        customer_service = CustomerService(db)
        stats = await customer_service.get_customer_stats()
        return stats
    except Exception as e:
        logger.error(f"Error fetching customer stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch customer statistics")