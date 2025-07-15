from abc import ABC, abstractmethod
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class Migration(ABC):
    """Base class for database migrations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    @property
    @abstractmethod
    def version(self) -> str:
        """Return the migration version (e.g., '001')."""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """Return a description of what this migration does."""
        pass
    
    @abstractmethod
    async def up(self) -> None:
        """Apply the migration."""
        pass
    
    @abstractmethod
    async def down(self) -> None:
        """Rollback the migration."""
        pass
    
    async def is_applied(self) -> bool:
        """Check if this migration has already been applied."""
        migration_record = await self.db.migrations.find_one({"version": self.version})
        return migration_record is not None
    
    async def mark_applied(self) -> None:
        """Mark this migration as applied."""
        await self.db.migrations.insert_one({
            "version": self.version,
            "description": self.description,
            "applied_at": datetime.utcnow(),
            "applied": True
        })
        logger.info(f"Migration {self.version} marked as applied")
    
    async def mark_reverted(self) -> None:
        """Mark this migration as reverted."""
        await self.db.migrations.delete_one({"version": self.version})
        logger.info(f"Migration {self.version} marked as reverted")


class MigrationRunner:
    """Runs database migrations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.migrations = []
    
    def add_migration(self, migration: Migration) -> None:
        """Add a migration to the runner."""
        self.migrations.append(migration)
    
    async def run_migrations(self) -> None:
        """Run all pending migrations."""
        # Sort migrations by version
        self.migrations.sort(key=lambda m: m.version)
        
        for migration in self.migrations:
            if not await migration.is_applied():
                logger.info(f"Running migration {migration.version}: {migration.description}")
                try:
                    await migration.up()
                    await migration.mark_applied()
                    logger.info(f"Migration {migration.version} completed successfully")
                except Exception as e:
                    logger.error(f"Migration {migration.version} failed: {str(e)}")
                    raise
            else:
                logger.debug(f"Migration {migration.version} already applied, skipping")
    
    async def rollback_migration(self, version: str) -> None:
        """Rollback a specific migration."""
        migration = next((m for m in self.migrations if m.version == version), None)
        if not migration:
            raise ValueError(f"Migration {version} not found")
        
        if await migration.is_applied():
            logger.info(f"Rolling back migration {version}: {migration.description}")
            try:
                await migration.down()
                await migration.mark_reverted()
                logger.info(f"Migration {version} rolled back successfully")
            except Exception as e:
                logger.error(f"Migration {version} rollback failed: {str(e)}")
                raise
        else:
            logger.warning(f"Migration {version} is not applied, cannot rollback")
    
    async def get_applied_migrations(self) -> list:
        """Get list of applied migrations."""
        cursor = self.db.migrations.find().sort("version", 1)
        return await cursor.to_list(length=None)