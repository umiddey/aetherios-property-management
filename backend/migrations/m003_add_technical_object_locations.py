"""
Migration to add location field to existing technical objects

Created: 2025-08-23
Purpose: Fix empty 'Located at:' field in Technical Object Detail Page
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Use test_database as specified
DATABASE_URL = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
DATABASE_NAME = 'test_database'

# Default location mappings based on object type
LOCATION_DEFAULTS = {
    # Heating systems typically in basement/mechanical room
    'heating_gas': 'Basement - Mechanical Room',
    'heating_oil': 'Basement - Mechanical Room', 
    'heating_wood': 'Basement - Mechanical Room',
    'boiler_system': 'Basement - Mechanical Room',
    
    # Elevators in main building areas
    'elevator_passenger': 'Main Entrance',
    'elevator_freight': 'Service Entrance',
    'elevator_disabled': 'Main Entrance',
    
    # Fire safety throughout building
    'fire_extinguisher': 'Building Wide',
    'emergency_lighting': 'Building Wide',
    'fire_safety_systems': 'Building Wide',
    
    # Electrical systems
    'electrical_installation': 'Electrical Room',
    'electrical_portable': 'Various Locations',
    
    # Water systems
    'water_supply': 'Basement - Utility Room',
    'sewage_system': 'Basement - Utility Room',
    
    # Building envelope
    'ventilation': 'Roof - Mechanical',
    'air_conditioning': 'Roof - Mechanical',
    
    # Communication systems
    'intercom': 'Main Entrance',
    'security_system': 'Building Wide',
    'building_management': 'Office - Management',
    
    # Solar and external
    'solar_panels': 'Roof',
    
    # Default fallback
    'default': 'Not Specified'
}

async def migrate_technical_object_locations():
    """Add location field to existing technical objects"""
    
    client = AsyncIOMotorClient(DATABASE_URL)
    db = client[DATABASE_NAME]
    
    try:
        # Get all technical objects that don't have location field
        technical_objects = await db.technical_objects.find({
            '$or': [
                {'location': {'$exists': False}},
                {'location': None},
                {'location': ''}
            ]
        }).to_list(None)
        
        print(f"Found {len(technical_objects)} technical objects needing location updates")
        
        updated_count = 0
        
        for obj in technical_objects:
            object_type = obj.get('object_type', 'default')
            default_location = LOCATION_DEFAULTS.get(object_type, LOCATION_DEFAULTS['default'])
            
            # Update the object with location
            result = await db.technical_objects.update_one(
                {'_id': obj['_id']},
                {'$set': {'location': default_location}}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                print(f"Updated {obj.get('name', 'Unnamed')} ({object_type}) -> Location: {default_location}")
        
        print(f"Successfully updated {updated_count} technical objects with location data")
        return updated_count
        
    except Exception as e:
        print(f"Error during migration: {e}")
        raise
    finally:
        client.close()

async def rollback_technical_object_locations():
    """Remove location field from technical objects (rollback)"""
    
    client = AsyncIOMotorClient(DATABASE_URL)
    db = client[DATABASE_NAME]
    
    try:
        # Remove location field from all technical objects
        result = await db.technical_objects.update_many(
            {},
            {'$unset': {'location': ""}}
        )
        
        print(f"Rolled back location field from {result.modified_count} technical objects")
        return result.modified_count
        
    except Exception as e:
        print(f"Error during rollback: {e}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--rollback':
        print("Rolling back technical object location migration...")
        asyncio.run(rollback_technical_object_locations())
    else:
        print("Running technical object location migration...")
        asyncio.run(migrate_technical_object_locations())