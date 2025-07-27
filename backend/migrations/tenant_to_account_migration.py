"""
Migration script to convert existing tenant data to the new unified account system
Preserves all existing data while creating the new account structure
"""

import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any
from pymongo import MongoClient
from bson import ObjectId

from backend.models.account import AccountType, AccountStatus, TenantProfile
from backend.services.account_service import AccountService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TenantToAccountMigration:
    """Migration class to handle tenant to account conversion"""
    
    def __init__(self, db: MongoClient):
        self.db = db
        self.account_service = AccountService(db)
        
        # Collection references
        self.tenants_collection = db["tenants"]
        self.accounts_collection = db["accounts"]
        self.tenant_profiles_collection = db["tenant_profiles"]
        
        # Migration tracking
        self.migration_log = []
        self.errors = []
    
    async def run_migration(self, dry_run: bool = True) -> Dict[str, Any]:
        """
        Run the complete migration process
        
        Args:
            dry_run: If True, only analyze data without making changes
        
        Returns:
            Migration results and statistics
        """
        logger.info(f"Starting tenant to account migration (dry_run={dry_run})")
        
        try:
            # Step 1: Analyze existing tenant data
            analysis = await self._analyze_tenant_data()
            logger.info(f"Found {analysis['total_tenants']} tenants to migrate")
            
            if dry_run:
                return {
                    "status": "dry_run_complete",
                    "analysis": analysis,
                    "migration_log": [],
                    "errors": []
                }
            
            # Step 2: Create backup
            await self._create_backup()
            
            # Step 3: Migrate tenants to accounts
            migration_results = await self._migrate_tenants_to_accounts()
            
            # Step 4: Verify migration
            verification = await self._verify_migration()
            
            logger.info("Migration completed successfully")
            
            return {
                "status": "completed",
                "analysis": analysis,
                "migration_results": migration_results,
                "verification": verification,
                "migration_log": self.migration_log,
                "errors": self.errors
            }
            
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "migration_log": self.migration_log,
                "errors": self.errors
            }
    
    async def _analyze_tenant_data(self) -> Dict[str, Any]:
        """Analyze existing tenant data for migration planning"""
        tenants = list(self.tenants_collection.find({"is_archived": False}))
        
        analysis = {
            "total_tenants": len(tenants),
            "tenants_with_email": 0,
            "tenants_with_phone": 0,
            "tenants_with_bank_account": 0,
            "tenants_with_notes": 0,
            "data_quality_issues": []
        }
        
        for tenant in tenants:
            # Check data completeness
            if tenant.get("email"):
                analysis["tenants_with_email"] += 1
            else:
                analysis["data_quality_issues"].append(f"Tenant {tenant.get('_id')} missing email")
            
            if tenant.get("phone"):
                analysis["tenants_with_phone"] += 1
                
            if tenant.get("bank_account"):
                analysis["tenants_with_bank_account"] += 1
                
            if tenant.get("notes"):
                analysis["tenants_with_notes"] += 1
        
        return analysis
    
    async def _create_backup(self):
        """Create backup of existing tenant data"""
        backup_collection_name = f"tenants_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Copy all tenant documents to backup collection
        tenants = list(self.tenants_collection.find())
        if tenants:
            backup_collection = self.db[backup_collection_name]
            backup_collection.insert_many(tenants)
            
            self.migration_log.append(f"Created backup: {backup_collection_name} ({len(tenants)} documents)")
            logger.info(f"Backup created: {backup_collection_name}")
    
    async def _migrate_tenants_to_accounts(self) -> Dict[str, Any]:
        """Migrate all tenants to the new account system"""
        tenants = list(self.tenants_collection.find({"is_archived": False}))
        
        migration_results = {
            "total_processed": 0,
            "successful_migrations": 0,
            "failed_migrations": 0,
            "account_ids_created": []
        }
        
        for tenant in tenants:
            try:
                migration_results["total_processed"] += 1
                
                # Create account from tenant data
                account_data = await self._convert_tenant_to_account(tenant)
                
                # Insert account
                account_result = await self.accounts_collection.insert_one(account_data)
                account_id = str(account_result.inserted_id)
                
                # Create tenant profile
                profile_data = await self._create_tenant_profile(tenant, account_id)
                await self.tenant_profiles_collection.insert_one(profile_data)
                
                migration_results["successful_migrations"] += 1
                migration_results["account_ids_created"].append(account_id)
                
                self.migration_log.append(
                    f"Migrated tenant {tenant.get('_id')} → account {account_id}"
                )
                
            except Exception as e:
                migration_results["failed_migrations"] += 1
                error_msg = f"Failed to migrate tenant {tenant.get('_id')}: {str(e)}"
                self.errors.append(error_msg)
                logger.error(error_msg)
        
        return migration_results
    
    async def _convert_tenant_to_account(self, tenant: Dict[str, Any]) -> Dict[str, Any]:
        """Convert tenant document to account document"""
        # Generate portal code for tenant access
        portal_code = self.account_service._generate_portal_code()
        
        account_data = {
            "account_type": AccountType.TENANT,
            "status": AccountStatus.ACTIVE,
            "first_name": tenant.get("first_name", ""),
            "last_name": tenant.get("last_name", ""),
            "email": tenant.get("email", ""),
            "phone": tenant.get("phone"),
            "address": tenant.get("address"),
            "created_at": tenant.get("created_at", datetime.utcnow()),
            "created_by": tenant.get("created_by", "migration"),
            "updated_at": None,
            "updated_by": None,
            "is_archived": tenant.get("is_archived", False),
            "portal_code": portal_code,
            "portal_active": True,
            "portal_last_login": None,
            "notification_preferences": {
                "service_requests": ["email"],
                "emergency_alerts": ["email", "sms"] if tenant.get("phone") else ["email"],
                "general_updates": ["email"]
            },
            "metadata": {
                "migrated_from_tenant_id": str(tenant.get("_id")),
                "migration_date": datetime.utcnow()
            }
        }
        
        return account_data
    
    async def _create_tenant_profile(self, tenant: Dict[str, Any], account_id: str) -> Dict[str, Any]:
        """Create tenant profile from existing tenant data"""
        profile_data = {
            "account_id": account_id,
            "date_of_birth": tenant.get("date_of_birth"),
            "gender": tenant.get("gender"),
            "bank_account": tenant.get("bank_account"),
            "emergency_contact_name": None,  # New field
            "emergency_contact_phone": None,  # New field
            "lease_start_date": None,  # To be populated from rental agreements
            "lease_end_date": None,  # To be populated from rental agreements
            "monthly_rent": None,  # To be populated from rental agreements
            "security_deposit": None,  # To be populated from rental agreements
            "current_property_ids": [],  # To be populated from rental agreements
            "notes": tenant.get("notes"),
            "rental_status": "active",  # Default status
            "last_payment_date": None,  # To be populated from invoices
            "outstanding_balance": 0.0  # To be calculated from invoices
        }
        
        return profile_data
    
    async def _verify_migration(self) -> Dict[str, Any]:
        """Verify migration results"""
        # Count original tenants
        original_tenant_count = self.tenants_collection.count_documents({"is_archived": False})
        
        # Count new accounts
        new_account_count = self.accounts_collection.count_documents({
            "account_type": AccountType.TENANT,
            "metadata.migrated_from_tenant_id": {"$exists": True}
        })
        
        # Count profiles
        profile_count = self.tenant_profiles_collection.count_documents({})
        
        verification = {
            "original_tenant_count": original_tenant_count,
            "new_account_count": new_account_count,
            "profile_count": profile_count,
            "migration_complete": new_account_count == original_tenant_count,
            "profiles_complete": profile_count == new_account_count
        }
        
        return verification
    
    async def rollback_migration(self, backup_collection_name: str) -> Dict[str, Any]:
        """Rollback migration by restoring from backup"""
        try:
            # Remove migrated accounts
            delete_result = self.accounts_collection.delete_many({
                "account_type": AccountType.TENANT,
                "metadata.migrated_from_tenant_id": {"$exists": True}
            })
            
            # Remove tenant profiles
            profile_delete_result = self.tenant_profiles_collection.delete_many({})
            
            logger.info(f"Rollback completed: {delete_result.deleted_count} accounts, {profile_delete_result.deleted_count} profiles removed")
            
            return {
                "status": "rollback_complete",
                "accounts_removed": delete_result.deleted_count,
                "profiles_removed": profile_delete_result.deleted_count
            }
            
        except Exception as e:
            logger.error(f"Rollback failed: {str(e)}")
            return {"status": "rollback_failed", "error": str(e)}


async def run_migration_cli():
    """CLI interface for running the migration"""
    import os
    from pymongo import MongoClient
    
    # Get database connection
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    DB_NAME = os.getenv("DB_NAME", "property_management")
    
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Initialize migration
    migration = TenantToAccountMigration(db)
    
    # Run dry run first
    print("Running migration analysis (dry run)...")
    dry_run_results = await migration.run_migration(dry_run=True)
    
    print(f"Analysis Results:")
    print(f"- Total tenants to migrate: {dry_run_results['analysis']['total_tenants']}")
    print(f"- Tenants with email: {dry_run_results['analysis']['tenants_with_email']}")
    print(f"- Data quality issues: {len(dry_run_results['analysis']['data_quality_issues'])}")
    
    if dry_run_results['analysis']['data_quality_issues']:
        print("Data quality issues found:")
        for issue in dry_run_results['analysis']['data_quality_issues'][:5]:
            print(f"  - {issue}")
    
    # Ask for confirmation
    response = input("\nProceed with actual migration? (y/N): ")
    if response.lower() == 'y':
        print("Running actual migration...")
        results = await migration.run_migration(dry_run=False)
        
        print(f"\nMigration Results:")
        print(f"- Status: {results['status']}")
        if results['status'] == 'completed':
            print(f"- Total processed: {results['migration_results']['total_processed']}")
            print(f"- Successful: {results['migration_results']['successful_migrations']}")
            print(f"- Failed: {results['migration_results']['failed_migrations']}")
            
            if results['errors']:
                print("Errors encountered:")
                for error in results['errors']:
                    print(f"  - {error}")
    else:
        print("Migration cancelled.")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(run_migration_cli())