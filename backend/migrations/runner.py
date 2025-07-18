from .migration_base import MigrationRunner
from .m001_clean_dummy_data_and_indexes import CleanDummyDataAndIndexes
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


async def run_all_migrations(db: AsyncIOMotorDatabase) -> None:
    """Run all pending migrations."""
    try:
        logger.info("Starting database migrations...")
        
        runner = MigrationRunner(db)
        
        # Add all migrations in order
        runner.add_migration(CleanDummyDataAndIndexes(db))
        
        # Run migrations
        await runner.run_migrations()
        
        logger.info("All migrations completed successfully")
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        raise


async def get_migration_status(db: AsyncIOMotorDatabase) -> dict:
    """Get the status of all migrations."""
    try:
        runner = MigrationRunner(db)
        applied_migrations = await runner.get_applied_migrations()
        
        return {
            "total_applied": len(applied_migrations),
            "migrations": applied_migrations
        }
    except Exception as e:
        logger.error(f"Error getting migration status: {str(e)}")
        return {"error": str(e)}