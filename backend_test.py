import requests
import json
import uuid
from datetime import datetime, timedelta
import time
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Get the backend URL from the frontend .env file
BACKEND_URL = os.environ.get('VITE_BACKEND_URL', 'localhost:3000')
API_URL = f"{BACKEND_URL}/api"

# Test data
test_user = {
    "username": f"testuser_{uuid.uuid4().hex[:8]}",
    "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
    "full_name": "Test User",
    "password": "SecurePassword123!"
}

test_property = {
    "name": "Sunset Apartments 101",
    "property_type": "apartment",
    "address": "101 Sunset Blvd, Los Angeles, CA 90210",
    "floor": "3",
    "surface_area": 85.5,
    "number_of_rooms": 3,
    "description": "Modern apartment with balcony and city view",
    "monthly_rent": 1500.0
}

test_tenant = {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "555-987-6543",
    "address": "456 Oak St, Anytown, USA",
    "date_of_birth": (datetime.utcnow() - timedelta(days=365*30)).isoformat(),
    "gender": "male",
    "bank_account": "DE89370400440532013000",
    "notes": "Reliable tenant with good payment history"
}

test_rental_agreement = {
    "start_date": datetime.utcnow().isoformat(),
    "end_date": (datetime.utcnow() + timedelta(days=365)).isoformat(),
    "monthly_rent": 1500.0,
    "deposit": 3000.0,
    "notes": "Annual lease with option to renew"
}

test_invoice = {
    "amount": 1500.0,
    "description": "Monthly rent for January 2025",
    "invoice_date": datetime.utcnow().isoformat(),
    "due_date": (datetime.utcnow() + timedelta(days=14)).isoformat()
}

test_payment = {
    "amount": 1500.0,
    "payment_date": datetime.utcnow().isoformat(),
    "payment_method": "bank_transfer",
    "notes": "Monthly rent payment"
}

# Global variables to store IDs and tokens
auth_token = None
user_id = None
property_id = None
tenant_id = None
rental_agreement_id = None
invoice_id = None

def test_user_registration():
    """Test user registration endpoint"""
    global user_id
    
    url = f"{API_URL}/auth/register"
    response = requests.post(url, json=test_user)
    
    print(f"\nRegister Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        user_id = data["id"]
        print(f"User registered successfully with ID: {user_id}")
        return True
    else:
        print(f"Registration failed with status {response.status_code}: {response.text}")
        return False

def test_user_login():
    """Test user login endpoint"""
    global auth_token
    
    url = f"{API_URL}/auth/login"
    login_data = {
        "username": test_user["username"],
        "password": test_user["password"]
    }
    
    response = requests.post(url, json=login_data)
    
    print(f"\nLogin Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        auth_token = data["access_token"]
        print(f"User logged in successfully, token received")
        return True
    else:
        print(f"Login failed with status {response.status_code}: {response.text}")
        return False

def test_property_management():
    """Test property management API"""
    global property_id
    
    # Create property
    url = f"{API_URL}/properties"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = requests.post(url, json=test_property, headers=headers)
    
    print(f"\nCreate Property Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Property creation failed with status {response.status_code}: {response.text}")
        return False
    
    data = response.json()
    property_id = data["id"]
    print(f"Property created successfully with ID: {property_id}")
    
    # Get all properties
    response = requests.get(url, headers=headers)
    
    print(f"\nGet Properties Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Get properties failed with status {response.status_code}: {response.text}")
        return False
    
    # Get property by ID
    url = f"{API_URL}/properties/{property_id}"
    response = requests.get(url, headers=headers)
    
    print(f"\nGet Property by ID Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Get property by ID failed with status {response.status_code}: {response.text}")
        return False
    
    # Filter properties
    url = f"{API_URL}/properties?property_type=apartment"
    response = requests.get(url, headers=headers)
    
    print(f"\nFilter Properties by Type Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Filter properties failed with status {response.status_code}: {response.text}")
        return False
    
    # Update property
    url = f"{API_URL}/properties/{property_id}"
    update_data = {
        "name": "Updated Sunset Apartments 101",
        "monthly_rent": 1600.0,
        "description": "Renovated modern apartment with balcony and city view"
    }
    
    response = requests.put(url, json=update_data, headers=headers)
    
    print(f"\nUpdate Property Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Update property failed with status {response.status_code}: {response.text}")
        return False
    
    print("✅ Property Management API tests passed successfully!")
    return True

def test_tenant_management():
    """Test tenant management API"""
    global tenant_id
    
    # Create tenant
    url = f"{API_URL}/tenants"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = requests.post(url, json=test_tenant, headers=headers)
    
    print(f"\nCreate Tenant Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Tenant creation failed with status {response.status_code}: {response.text}")
        return False
    
    data = response.json()
    tenant_id = data["id"]
    print(f"Tenant created successfully with ID: {tenant_id}")
    
    # Get all tenants
    response = requests.get(url, headers=headers)
    
    print(f"\nGet Tenants Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Get tenants failed with status {response.status_code}: {response.text}")
        return False
    
    # Get tenant by ID
    url = f"{API_URL}/tenants/{tenant_id}"
    response = requests.get(url, headers=headers)
    
    print(f"\nGet Tenant by ID Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Get tenant by ID failed with status {response.status_code}: {response.text}")
        return False
    
    # Filter tenants by archived status
    url = f"{API_URL}/tenants?archived=false"
    response = requests.get(url, headers=headers)
    
    print(f"\nFilter Tenants by Archived Status Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Filter tenants failed with status {response.status_code}: {response.text}")
        return False
    
    # Update tenant
    url = f"{API_URL}/tenants/{tenant_id}"
    update_data = {
        "phone": "555-111-2222",
        "notes": "Updated tenant notes with excellent payment history"
    }
    
    response = requests.put(url, json=update_data, headers=headers)
    
    print(f"\nUpdate Tenant Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Update tenant failed with status {response.status_code}: {response.text}")
        return False
    
    print("✅ Tenant Management API tests passed successfully!")
    return True

def test_rental_agreement():
    """Test rental agreement API"""
    global rental_agreement_id
    
    # Create rental agreement
    url = f"{API_URL}/rental-agreements"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Add property_id and tenant_id to the rental agreement data
    rental_data = test_rental_agreement.copy()
    rental_data["property_id"] = property_id
    rental_data["tenant_id"] = tenant_id
    
    response = requests.post(url, json=rental_data, headers=headers)
    
    print(f"\nCreate Rental Agreement Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Rental agreement creation failed with status {response.status_code}: {response.text}")
        return False
    
    data = response.json()
    rental_agreement_id = data["id"]
    print(f"Rental agreement created successfully with ID: {rental_agreement_id}")
    
    # Get all rental agreements
    response = requests.get(url, headers=headers)
    
    print(f"\nGet Rental Agreements Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Get rental agreements failed with status {response.status_code}: {response.text}")
        return False
    
    # Filter rental agreements by property_id
    url = f"{API_URL}/rental-agreements?property_id={property_id}"
    response = requests.get(url, headers=headers)
    
    print(f"\nFilter Rental Agreements by Property ID Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Filter rental agreements failed with status {response.status_code}: {response.text}")
        return False
    
    # Filter rental agreements by tenant_id
    url = f"{API_URL}/rental-agreements?tenant_id={tenant_id}"
    response = requests.get(url, headers=headers)
    
    print(f"\nFilter Rental Agreements by Tenant ID Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Filter rental agreements failed with status {response.status_code}: {response.text}")
        return False
    
    print("✅ Rental Agreement API tests passed successfully!")
    return True

def test_invoice_management():
    """Test invoice management API"""
    global invoice_id
    
    # Create invoice
    url = f"{API_URL}/invoices"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Add tenant_id and property_id to the invoice data
    invoice_data = test_invoice.copy()
    invoice_data["tenant_id"] = tenant_id
    invoice_data["property_id"] = property_id
    
    response = requests.post(url, json=invoice_data, headers=headers)
    
    print(f"\nCreate Invoice Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Invoice creation failed with status {response.status_code}: {response.text}")
        return False
    
    data = response.json()
    invoice_id = data["id"]
    print(f"Invoice created successfully with ID: {invoice_id} and number: {data['invoice_number']}")
    
    # Get all invoices
    response = requests.get(url, headers=headers)
    
    print(f"\nGet Invoices Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Get invoices failed with status {response.status_code}: {response.text}")
        return False
    
    # Filter invoices by tenant_id
    url = f"{API_URL}/invoices?tenant_id={tenant_id}"
    response = requests.get(url, headers=headers)
    
    print(f"\nFilter Invoices by Tenant ID Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Filter invoices failed with status {response.status_code}: {response.text}")
        return False
    
    # Update invoice
    url = f"{API_URL}/invoices/{invoice_id}"
    update_data = {
        "status": "sent",
        "description": "Updated: Monthly rent for January 2025"
    }
    
    response = requests.put(url, json=update_data, headers=headers)
    
    print(f"\nUpdate Invoice Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Update invoice failed with status {response.status_code}: {response.text}")
        return False
    
    print("✅ Invoice Management API tests passed successfully!")
    return True

def test_payment_management():
    """Test payment management API"""
    # Create payment
    url = f"{API_URL}/payments"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Add invoice_id to the payment data
    payment_data = test_payment.copy()
    payment_data["invoice_id"] = invoice_id
    
    response = requests.post(url, json=payment_data, headers=headers)
    
    print(f"\nCreate Payment Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Payment creation failed with status {response.status_code}: {response.text}")
        return False
    
    # Get all payments
    response = requests.get(url, headers=headers)
    
    print(f"\nGet Payments Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Get payments failed with status {response.status_code}: {response.text}")
        return False
    
    # Filter payments by invoice_id
    url = f"{API_URL}/payments?invoice_id={invoice_id}"
    response = requests.get(url, headers=headers)
    
    print(f"\nFilter Payments by Invoice ID Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Filter payments failed with status {response.status_code}: {response.text}")
        return False
    
    # Check if invoice status was updated to paid
    url = f"{API_URL}/invoices/{invoice_id}"
    response = requests.get(url, headers=headers)
    
    print(f"\nGet Invoice After Payment Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Get invoice failed with status {response.status_code}: {response.text}")
        return False
    
    data = response.json()
    if data["status"] != "paid":
        print(f"Invoice status was not updated to 'paid' after payment")
        return False
    
    print("✅ Payment Management API tests passed successfully!")
    return True

def test_archive_system():
    """Test archive system API"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Archive property
    url = f"{API_URL}/archive/properties/{property_id}"
    response = requests.put(url, headers=headers)
    
    print(f"\nArchive Property Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Archive property failed with status {response.status_code}: {response.text}")
        return False
    
    # Verify the property is archived
    url = f"{API_URL}/properties/{property_id}"
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"Get property failed with status {response.status_code}: {response.text}")
        return False
    
    data = response.json()
    if not data["is_archived"]:
        print(f"Property was not archived")
        return False
    
    # Archive tenant
    url = f"{API_URL}/archive/tenants/{tenant_id}"
    response = requests.put(url, headers=headers)
    
    print(f"\nArchive Tenant Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Archive tenant failed with status {response.status_code}: {response.text}")
        return False
    
    # Verify the tenant is archived
    url = f"{API_URL}/tenants/{tenant_id}"
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"Get tenant failed with status {response.status_code}: {response.text}")
        return False
    
    data = response.json()
    if not data["is_archived"]:
        print(f"Tenant was not archived")
        return False
    
    # Archive invoice
    url = f"{API_URL}/archive/invoices/{invoice_id}"
    response = requests.put(url, headers=headers)
    
    print(f"\nArchive Invoice Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Archive invoice failed with status {response.status_code}: {response.text}")
        return False
    
    # Verify the invoice is archived
    url = f"{API_URL}/invoices/{invoice_id}"
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"Get invoice failed with status {response.status_code}: {response.text}")
        return False
    
    data = response.json()
    if not data["is_archived"]:
        print(f"Invoice was not archived")
        return False
    
    print("✅ Archive System API tests passed successfully!")
    return True

def test_dashboard_stats():
    """Test dashboard statistics API"""
    url = f"{API_URL}/dashboard/stats"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = requests.get(url, headers=headers)
    
    print(f"\nDashboard Stats Response: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code != 200:
        print(f"Dashboard stats failed with status {response.status_code}: {response.text}")
        return False
    
    data = response.json()
    
    # Check for property management stats
    if "total_properties" not in data:
        print("Total properties count not in response")
        return False
    if "total_tenants" not in data:
        print("Total tenants count not in response")
        return False
    if "active_agreements" not in data:
        print("Active agreements count not in response")
        return False
    if "total_invoices" not in data:
        print("Total invoices count not in response")
        return False
    if "unpaid_invoices" not in data:
        print("Unpaid invoices count not in response")
        return False
    
    print("✅ Dashboard Statistics API tests passed successfully!")
    return True

def run_all_tests():
    """Run all tests in sequence"""
    print("Starting backend API tests...")
    
    # Authentication
    if not test_user_registration():
        print("❌ User registration failed. Stopping tests.")
        return
    
    if not test_user_login():
        print("❌ User login failed. Stopping tests.")
        return
    
    # Property Management
    if not test_property_management():
        print("❌ Property Management API tests failed.")
        return
    
    # Tenant Management
    if not test_tenant_management():
        print("❌ Tenant Management API tests failed.")
        return
    
    # Rental Agreement
    if not test_rental_agreement():
        print("❌ Rental Agreement API tests failed.")
        return
    
    # Invoice Management
    if not test_invoice_management():
        print("❌ Invoice Management API tests failed.")
        return
    
    # Payment Management
    if not test_payment_management():
        print("❌ Payment Management API tests failed.")
        return
    
    # Archive System
    if not test_archive_system():
        print("❌ Archive System API tests failed.")
        return
    
    # Dashboard Statistics
    if not test_dashboard_stats():
        print("❌ Dashboard Statistics API tests failed.")
        return
    
    print("\n✅ All backend API tests completed successfully!")

if __name__ == "__main__":
    run_all_tests()