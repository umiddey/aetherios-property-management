#!/usr/bin/env python3
"""
Test script for AI Call Handler
Tests the complete workflow of AI-automated customer service calls
"""

import asyncio
import sys
import os
sys.path.append('/Users/deyumi01/Applications/erp-ai-main/erp-ai/backend')

from motor.motor_asyncio import AsyncIOMotorClient
from ai_call_handler import AICallHandler
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

async def test_ai_call_workflow():
    """Test the complete AI call workflow"""
    print("🤖 Testing AI Call Handler Workflow")
    print("=" * 50)
    
    # Setup database connection
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'test_database')]
    
    # Initialize AI Call Handler
    ai_handler = AICallHandler(db, os.environ.get('OPENAI_API_KEY', ''))
    
    # Test call ID
    call_id = "test-call-123"
    
    print(f"📞 Starting test call: {call_id}")
    print()
    
    # Test scenarios
    test_scenarios = [
        {
            'name': 'Initial greeting with customer number',
            'input': 'Hello, this is customer 12345. I need help with my bathroom pipe.',
            'expected_step': 'service_questions'
        },
        {
            'name': 'Service description without customer number',
            'input': 'Hi, my kitchen sink is leaking badly',
            'expected_step': 'customer_verification'
        },
        {
            'name': 'Customer verification',
            'input': 'My customer number is 12345',
            'expected_step': 'service_questions'
        },
        {
            'name': 'Service details',
            'input': 'I need plumbing repair for my bathroom pipe. Its an emergency and located in the main bathroom.',
            'expected_step': 'service_questions'
        },
        {
            'name': 'Confirmation',
            'input': 'Yes, that looks correct',
            'expected_step': 'completed'
        }
    ]
    
    # Create a test customer first
    test_customer = {
        'id': '12345',
        'name': 'John Doe',
        'email': 'john.doe@example.com',
        'phone': '555-1234',
        'company': 'Test Company',
        'address': '123 Test Street',
        'created_at': '2024-01-01T00:00:00Z',
        'created_by': 'test_system'
    }
    
    # Insert test customer
    await db.customers.delete_many({'id': '12345'})  # Clean up first
    await db.customers.insert_one(test_customer)
    print(f"✅ Created test customer: {test_customer['name']}")
    print()
    
    # Test each scenario
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"🧪 Test {i}: {scenario['name']}")
        print(f"   Input: '{scenario['input']}'")
        
        try:
            response = await ai_handler.handle_customer_call(call_id, scenario['input'])
            
            print(f"   AI Response: {response['message'][:100]}...")
            print(f"   Action: {response['action']}")
            print(f"   Next Step: {response['next_step']}")
            
            if response.get('customer_info'):
                print(f"   Customer: {response['customer_info']['name']}")
            
            if response.get('service_details'):
                print(f"   Service Details: {json.dumps(response['service_details'], indent=2)}")
            
            if response.get('task_order'):
                print(f"   ✅ Task Order Created: {response['task_order']['id']}")
            
            print(f"   ✅ Test passed!")
            
        except Exception as e:
            print(f"   ❌ Test failed: {str(e)}")
        
        print()
    
    # Check if task order was created
    task_orders = await db.task_orders.find({'customer_id': '12345'}).to_list(length=10)
    if task_orders:
        print(f"📋 Task Orders Created: {len(task_orders)}")
        for task in task_orders:
            print(f"   - {task['subject']} (Priority: {task['priority']}, Status: {task['status']})")
    
    # Clean up
    await db.customers.delete_many({'id': '12345'})
    await db.task_orders.delete_many({'customer_id': '12345'})
    await db.activities.delete_many({'created_by': 'ai_system'})
    
    ai_handler.end_call(call_id)
    
    print("🧹 Cleaned up test data")
    print("✅ Test completed successfully!")

async def test_customer_verification():
    """Test customer verification scenarios"""
    print("\n🔍 Testing Customer Verification")
    print("=" * 30)
    
    # Setup database connection
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'test_database')]
    
    ai_handler = AICallHandler(db, os.environ.get('OPENAI_API_KEY', ''))
    
    # Test customer verification
    test_cases = [
        {
            'input': 'My customer number is 999999',
            'expected': 'customer_not_found'
        },
        {
            'input': 'I dont have a customer number',
            'expected': 'ask_customer_number'
        },
        {
            'input': 'Customer ID: ABC123',
            'expected': 'customer_not_found'
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        call_id = f"verify-test-{i}"
        print(f"Test {i}: {case['input']}")
        
        try:
            response = await ai_handler.handle_customer_call(call_id, case['input'])
            print(f"  Action: {response['action']}")
            print(f"  Next Step: {response['next_step']}")
            print(f"  ✅ Verification test passed")
        except Exception as e:
            print(f"  ❌ Verification test failed: {str(e)}")
        
        ai_handler.end_call(call_id)
        print()

if __name__ == "__main__":
    print("🚀 Starting AI Call Handler Tests")
    print("=" * 50)
    
    try:
        asyncio.run(test_ai_call_workflow())
        asyncio.run(test_customer_verification())
        print("\n🎉 All tests completed!")
    except Exception as e:
        print(f"\n❌ Test suite failed: {str(e)}")
        sys.exit(1)