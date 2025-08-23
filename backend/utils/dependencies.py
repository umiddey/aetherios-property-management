from motor.motor_asyncio import AsyncIOMotorDatabase
from services.core.property_service import PropertyService
from repositories.property_repository import PropertyRepository
from services.accounts.tenant_service import TenantService
from services.core.invoice_service import InvoiceService
from fastapi import Depends
from utils.database import get_database, db

# Service Dependencies
async def get_property_repository() -> PropertyRepository:
    """Get property repository instance."""
    return PropertyRepository(db)

async def get_property_service(
    property_repository: PropertyRepository = Depends(get_property_repository)
) -> PropertyService:
    """Get property service instance."""
    return PropertyService(db)

async def get_tenant_service() -> TenantService:
    """Get tenant service instance."""
    return TenantService(db)

async def get_invoice_service() -> InvoiceService:
    """Get invoice service instance."""
    return InvoiceService(db)