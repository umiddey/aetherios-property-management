from .migration_base import Migration
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


class CleanDummyDataAndIndexes(Migration):
    """
    Migration 001: Clean dummy data and add performance indexes.
    
    This migration:
    1. Deletes all dummy data except users (to maintain login)
    2. Sets up performance indexes for clean production data
    3. Prepares system for user-defined property IDs (whoobjectnumber format)
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db)
    
    @property
    def version(self) -> str:
        return "001"
    
    @property
    def description(self) -> str:
        return "Clean dummy data and add performance indexes"
    
    async def up(self) -> None:
        """Apply the migration."""
        logger.info("Starting migration 001: Cleaning dummy data and adding indexes")
        
        # 1. Clean dummy data (keep users for login)
        await self._clean_dummy_data()
        
        # 2. Add performance indexes
        await self._create_indexes()
        
        logger.info("Migration 001 completed successfully")
    
    async def down(self) -> None:
        """Rollback the migration."""
        logger.info("Rolling back migration 001: Removing indexes")
        
        # Only remove indexes (data deletion is irreversible)
        await self._drop_indexes()
        
        logger.info("Migration 001 rollback completed")
    
    async def _clean_dummy_data(self) -> None:
        """Delete all dummy data except users."""
        collections_to_clean = [
            "properties", "tenants", "invoices", "customers", 
            "task_orders", "rental_agreements", "payments", "activities"
        ]
        
        for collection_name in collections_to_clean:
            collection = self.db[collection_name]
            result = await collection.delete_many({})
            logger.info(f"Deleted {result.deleted_count} dummy documents from {collection_name}")
        
        logger.info("Dummy data cleanup completed (users preserved)")
    
    async def _create_index_safe(self, collection, keys, **options):
        """Create index safely, handling conflicts."""
        try:
            await collection.create_index(keys, **options)
        except Exception as e:
            if "IndexKeySpecsConflict" in str(e) or "already exists" in str(e):
                logger.info(f"Index {keys} already exists in {collection.name}, skipping")
            else:
                logger.warning(f"Could not create index {keys} in {collection.name}: {str(e)}")
    
    async def _create_indexes(self) -> None:
        """Create performance indexes for all collections."""
        
        # Properties indexes (optimized for user-defined IDs)
        properties = self.db.properties
        await self._create_index_safe(properties, [("id", 1)], unique=True, background=True)
        await self._create_index_safe(properties, [("property_type", 1), ("is_archived", 1)], background=True)
        await self._create_index_safe(properties, [("status", 1), ("is_archived", 1)], background=True)
        await self._create_index_safe(properties, [("city", 1), ("is_archived", 1)], background=True)
        await self._create_index_safe(properties, [("parent_id", 1)], background=True)
        await self._create_index_safe(properties, [("created_at", -1)], background=True)
        await self._create_index_safe(properties, [("number_of_rooms", 1)], background=True)
        await self._create_index_safe(properties, [("surface_area", 1)], background=True)
        await self._create_index_safe(properties, [("created_by", 1)], background=True)
        # Index for search by property name/address
        await self._create_index_safe(properties, [("name", "text"), ("street", "text"), ("city", "text")], background=True)
        
        # Tenants indexes
        tenants = self.db.tenants
        await self._create_index_safe(tenants, [("id", 1)], unique=True, background=True)
        await self._create_index_safe(tenants, [("email", 1)], unique=True, background=True)
        await self._create_index_safe(tenants, [("is_archived", 1)], background=True)
        await self._create_index_safe(tenants, [("created_at", -1)], background=True)
        await self._create_index_safe(tenants, [("created_by", 1)], background=True)
        await self._create_index_safe(tenants, [("first_name", 1), ("last_name", 1)], background=True)
        # Text search for tenant names
        await self._create_index_safe(tenants, [("first_name", "text"), ("last_name", "text"), ("email", "text")], background=True)
        
        # Invoices indexes
        invoices = self.db.invoices
        await self._create_index_safe(invoices, [("id", 1)], unique=True, background=True)
        await self._create_index_safe(invoices, [("tenant_id", 1)], background=True)
        await self._create_index_safe(invoices, [("property_id", 1)], background=True)
        await self._create_index_safe(invoices, [("status", 1), ("is_archived", 1)], background=True)
        await self._create_index_safe(invoices, [("due_date", 1)], background=True)
        await self._create_index_safe(invoices, [("invoice_date", -1)], background=True)
        await self._create_index_safe(invoices, [("created_at", -1)], background=True)
        await self._create_index_safe(invoices, [("created_by", 1)], background=True)
        await self._create_index_safe(invoices, [("invoice_number", 1)], unique=True, background=True)
        # Compound index for overdue invoices
        await self._create_index_safe(invoices, [("status", 1), ("due_date", 1)], background=True)
        
        # Users indexes (already exist but ensure they're optimal)
        users = self.db.users
        await self._create_index_safe(users, [("id", 1)], unique=True, background=True)
        await self._create_index_safe(users, [("username", 1)], unique=True, background=True)
        await self._create_index_safe(users, [("email", 1)], unique=True, background=True)
        await self._create_index_safe(users, [("role", 1)], background=True)
        await self._create_index_safe(users, [("is_active", 1)], background=True)
        await self._create_index_safe(users, [("created_at", -1)], background=True)
        
        # Customers indexes
        customers = self.db.customers
        await self._create_index_safe(customers, [("id", 1)], unique=True, background=True)
        await self._create_index_safe(customers, [("email", 1)], background=True)
        await self._create_index_safe(customers, [("company", 1)], background=True)
        await self._create_index_safe(customers, [("created_at", -1)], background=True)
        await self._create_index_safe(customers, [("created_by", 1)], background=True)
        # Text search for customers
        await self._create_index_safe(customers, [("name", "text"), ("company", "text"), ("email", "text")], background=True)
        
        # Task Orders indexes
        task_orders = self.db.task_orders
        await self._create_index_safe(task_orders, [("id", 1)], unique=True, background=True)
        await self._create_index_safe(task_orders, [("customer_id", 1)], background=True)
        await self._create_index_safe(task_orders, [("property_id", 1)], background=True)
        await self._create_index_safe(task_orders, [("status", 1)], background=True)
        await self._create_index_safe(task_orders, [("priority", 1)], background=True)
        await self._create_index_safe(task_orders, [("assigned_to", 1)], background=True)
        await self._create_index_safe(task_orders, [("due_date", 1)], background=True)
        await self._create_index_safe(task_orders, [("created_at", -1)], background=True)
        await self._create_index_safe(task_orders, [("updated_at", -1)], background=True)
        await self._create_index_safe(task_orders, [("created_by", 1)], background=True)
        # Compound indexes for common queries
        await self._create_index_safe(task_orders, [("status", 1), ("priority", 1)], background=True)
        await self._create_index_safe(task_orders, [("assigned_to", 1), ("status", 1)], background=True)
        
        # Rental Agreements indexes
        rental_agreements = self.db.rental_agreements
        await self._create_index_safe(rental_agreements, [("id", 1)], unique=True, background=True)
        await self._create_index_safe(rental_agreements, [("property_id", 1)], background=True)
        await self._create_index_safe(rental_agreements, [("tenant_id", 1)], background=True)
        await self._create_index_safe(rental_agreements, [("is_active", 1), ("is_archived", 1)], background=True)
        await self._create_index_safe(rental_agreements, [("start_date", 1)], background=True)
        await self._create_index_safe(rental_agreements, [("end_date", 1)], background=True)
        await self._create_index_safe(rental_agreements, [("created_at", -1)], background=True)
        await self._create_index_safe(rental_agreements, [("created_by", 1)], background=True)
        # Compound index for active agreements
        await self._create_index_safe(rental_agreements, [("property_id", 1), ("is_active", 1)], background=True)
        
        # Payments indexes
        payments = self.db.payments
        await self._create_index_safe(payments, [("id", 1)], unique=True, background=True)
        await self._create_index_safe(payments, [("invoice_id", 1)], background=True)
        await self._create_index_safe(payments, [("payment_date", -1)], background=True)
        await self._create_index_safe(payments, [("payment_method", 1)], background=True)
        await self._create_index_safe(payments, [("created_at", -1)], background=True)
        await self._create_index_safe(payments, [("created_by", 1)], background=True)
        
        # Activities indexes
        activities = self.db.activities
        await self._create_index_safe(activities, [("id", 1)], unique=True, background=True)
        await self._create_index_safe(activities, [("task_order_id", 1)], background=True)
        await self._create_index_safe(activities, [("activity_date", -1)], background=True)
        await self._create_index_safe(activities, [("created_at", -1)], background=True)
        await self._create_index_safe(activities, [("created_by", 1)], background=True)
        
        logger.info("All performance indexes created successfully")

        # Accounts/Profiles indexes moved to server startup for this environment (dummy data)
    
    async def _drop_indexes(self) -> None:
        """Drop the indexes created by this migration."""
        collections = [
            "properties", "tenants", "invoices", "users", "customers", 
            "task_orders", "rental_agreements", "payments", "activities"
        ]
        
        for collection_name in collections:
            collection = self.db[collection_name]
            try:
                # Get all indexes except _id_
                indexes = await collection.list_indexes().to_list(length=None)
                for index in indexes:
                    index_name = index["name"]
                    if index_name != "_id_":  # Never drop the default _id_ index
                        await collection.drop_index(index_name)
                        logger.info(f"Dropped index {index_name} from {collection_name}")
            except Exception as e:
                logger.warning(f"Could not drop indexes from {collection_name}: {str(e)}")
        
        logger.info("Indexes dropped successfully")