"""
Migration: Property Hierarchy Restructure
Converts existing property types to new hierarchical structure:
- apartment/office/house/commercial -> property_type: "unit" + unit_type: specific type
- building/complex remain unchanged
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from migrations.migration_base import Migration
import logging

logger = logging.getLogger(__name__)


class PropertyHierarchyRestructureMigration(Migration):
    """Migration to restructure property hierarchy for German property management standards."""
    
    @property
    def version(self) -> str:
        return "002"
    
    @property
    def description(self) -> str:
        return "Restructure property hierarchy: convert unit types to unit_type field"
    
    async def up(self) -> None:
        """Convert existing property types to new hierarchy."""
        properties_collection = self.db.properties
        
        # Define the mapping from old property types to new structure
        unit_type_mapping = {
            "apartment": "apartment",
            "office": "office", 
            "house": "house",
            "commercial": "commercial"
        }
        
        # Track migration statistics
        updated_count = 0
        
        # Convert each unit type to the new structure
        for old_type, new_unit_type in unit_type_mapping.items():
            # Find all properties with the old property type
            cursor = properties_collection.find({"property_type": old_type})
            properties_to_update = await cursor.to_list(length=None)
            
            logger.info(f"Found {len(properties_to_update)} properties of type '{old_type}' to migrate")
            
            for property_doc in properties_to_update:
                # Update the property to use new hierarchy
                await properties_collection.update_one(
                    {"_id": property_doc["_id"]},
                    {
                        "$set": {
                            "property_type": "unit",
                            "unit_type": new_unit_type
                        }
                    }
                )
                updated_count += 1
        
        # Verify complex and building types remain unchanged
        complex_count = await properties_collection.count_documents({"property_type": "complex"})
        building_count = await properties_collection.count_documents({"property_type": "building"})
        unit_count = await properties_collection.count_documents({"property_type": "unit"})
        
        logger.info(f"Migration completed:")
        logger.info(f"- Updated {updated_count} properties to new hierarchy")
        logger.info(f"- Complex properties: {complex_count}")
        logger.info(f"- Building properties: {building_count}")  
        logger.info(f"- Unit properties: {unit_count}")
    
    async def down(self) -> None:
        """Rollback: Convert unit_type back to property_type."""
        properties_collection = self.db.properties
        
        # Find all properties with property_type = "unit"
        cursor = properties_collection.find({"property_type": "unit"})
        unit_properties = await cursor.to_list(length=None)
        
        logger.info(f"Rolling back {len(unit_properties)} unit properties")
        
        updated_count = 0
        
        for property_doc in unit_properties:
            unit_type = property_doc.get("unit_type")
            if unit_type:
                # Convert back to old structure
                await properties_collection.update_one(
                    {"_id": property_doc["_id"]},
                    {
                        "$set": {"property_type": unit_type},
                        "$unset": {"unit_type": ""}
                    }
                )
                updated_count += 1
            else:
                logger.warning(f"Property {property_doc.get('id', 'unknown')} has property_type='unit' but no unit_type")
        
        logger.info(f"Rollback completed: reverted {updated_count} properties")