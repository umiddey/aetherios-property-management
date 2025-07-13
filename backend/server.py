from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
from enum import Enum
from fastapi.middleware.cors import CORSMiddleware
import socketio  # New import for direct python-socketio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app without a prefix
app = FastAPI()

# Socket.io setup with python-socketio (replaces fastapi_socketio)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
app.mount("/socket.io", socketio.ASGIApp(sio))

# Socket.io event handlers (basic for connect/disconnect)
@sio.on('connect')
async def connect(sid, environ):
    print('Client connected:', sid)

@sio.on('disconnect')
async def disconnect(sid):
    print('Client disconnected:', sid)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"]
)

# Enums
class Priority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class PropertyType(str, Enum):
    APARTMENT = "apartment"
    HOUSE = "house"
    OFFICE = "office"
    COMMERCIAL = "commercial"
    COMPLEX = "complex"

class PropertyStatus(str, Enum):
    ACTIVE = "active"
    CANCEL = "cancel"
    EMPTY = "empty"

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"

class PaymentMethod(str, Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CARD = "card"
    CHECK = "check"

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    USER = "user"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    full_name: str
    hashed_password: str
    role: UserRole = UserRole.USER
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: UserRole = UserRole.USER

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: UserRole
    created_at: datetime
    is_active: bool

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    company: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class CustomerCreate(BaseModel):
    name: str
    company: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None

# New Property Management Models
class Property(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    property_type: PropertyType
    street: str
    house_nr: str
    postcode: str
    city: str
    floor: Optional[str] = None  # Etage
    surface_area: float  # Flache in square meters
    number_of_rooms: int  # Anzahl Räume
    num_toilets: Optional[int] = None
    description: Optional[str] = None
    rent_per_sqm: Optional[float] = None
    cold_rent: Optional[float] = None
    status: PropertyStatus = PropertyStatus.EMPTY
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    parent_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_archived: bool = False

class PropertyCreate(BaseModel):
    name: str
    property_type: PropertyType
    street: str
    house_nr: str
    postcode: str
    city: str
    floor: Optional[str] = None
    surface_area: float
    number_of_rooms: int
    num_toilets: Optional[int] = None
    description: Optional[str] = None
    rent_per_sqm: Optional[float] = None
    cold_rent: Optional[float] = None
    status: PropertyStatus = PropertyStatus.EMPTY
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    parent_id: Optional[str] = None

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    property_type: Optional[PropertyType] = None
    street: Optional[str] = None
    house_nr: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    floor: Optional[str] = None
    surface_area: Optional[float] = None
    number_of_rooms: Optional[int] = None
    num_toilets: Optional[int] = None
    description: Optional[str] = None
    rent_per_sqm: Optional[float] = None
    cold_rent: Optional[float] = None
    status: Optional[PropertyStatus] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    parent_id: Optional[str] = None
    is_archived: Optional[bool] = None

# Tenant Management Models
class Tenant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    address: str
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None  # male/female
    bank_account: Optional[str] = None  # Bank Konto
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_archived: bool = False

class TenantCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    address: str
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    bank_account: Optional[str] = None
    notes: Optional[str] = None

class TenantUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    bank_account: Optional[str] = None
    notes: Optional[str] = None
    is_archived: Optional[bool] = None

# Rental Agreement Models
class RentalAgreement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str
    tenant_id: str
    start_date: datetime
    end_date: Optional[datetime] = None
    monthly_rent: float
    deposit: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_active: bool = True
    is_archived: bool = False

class RentalAgreementCreate(BaseModel):
    property_id: str
    tenant_id: str
    start_date: datetime
    end_date: Optional[datetime] = None
    monthly_rent: float
    deposit: Optional[float] = None
    notes: Optional[str] = None

# Invoice Models (Rechnungen)
class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    tenant_id: str
    property_id: str
    amount: float
    description: str
    invoice_date: datetime
    due_date: datetime
    status: InvoiceStatus = InvoiceStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_archived: bool = False

class InvoiceCreate(BaseModel):
    tenant_id: str
    property_id: str
    amount: float
    description: str
    invoice_date: datetime
    due_date: datetime

class InvoiceUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    status: Optional[InvoiceStatus] = None

# Payment Models (Kasse)
class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_id: str
    amount: float
    payment_date: datetime
    payment_method: PaymentMethod
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class PaymentCreate(BaseModel):
    invoice_id: str
    amount: float
    payment_date: datetime
    payment_method: PaymentMethod
    notes: Optional[str] = None

class TaskOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject: str
    description: str
    customer_id: str
    priority: Priority
    status: TaskStatus = TaskStatus.PENDING
    budget: Optional[float] = None
    due_date: Optional[datetime] = None
    property_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    assigned_to: Optional[str] = None

class TaskOrderCreate(BaseModel):
    subject: str
    description: str
    customer_id: str
    priority: Priority
    budget: Optional[float] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    property_id: Optional[str] = None

class TaskOrderUpdate(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    customer_id: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[TaskStatus] = None
    budget: Optional[float] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    property_id: Optional[str] = None

class Activity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_order_id: str
    description: str
    hours_spent: float
    activity_date: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class ActivityCreate(BaseModel):
    task_order_id: str
    description: str
    hours_spent: float
    activity_date: datetime

class AnalyticsLog(BaseModel):
  action: str
  details: dict = {}

# Utility functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def get_super_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient privileges")
    return current_user

# Auth routes
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    users_count = await db.users.count_documents({})
    if users_count > 0 and user_data.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot create another super admin via public registration")

    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    hashed_password = hash_password(user_data.password)
    role = UserRole.SUPER_ADMIN if users_count == 0 else user_data.role
    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=role
    )
    
    await db.users.insert_one(user.dict())
    return UserResponse(**user.dict())

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    try:
        # Try to find user with exact username first
        user = await db.users.find_one({"username": user_data.username})
        
        # If not found, try case-insensitive search
        if not user:
            user = await db.users.find_one({"username": {"$regex": f"^{user_data.username}$", "$options": "i"}})
        
        if not user:
            logger.info(f"Login attempt failed: User '{user_data.username}' not found")
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        
        if not verify_password(user_data.password, user["hashed_password"]):
            logger.info(f"Login attempt failed: Invalid password for user '{user_data.username}'")
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        
        if not user["is_active"]:
            logger.info(f"Login attempt failed: User '{user_data.username}' is inactive")
            raise HTTPException(status_code=400, detail="Inactive user")
        
        access_token = create_access_token(data={"sub": user["id"]})
        logger.info(f"User '{user_data.username}' logged in successfully")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(**user)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error for user '{user_data.username}': {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during login")

# User management routes for super admin
@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, super_admin: User = Depends(get_super_admin)):
    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    hashed_password = hash_password(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role
    )
    
    await db.users.insert_one(user.dict())
    return UserResponse(**user.dict())

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(super_admin: User = Depends(get_super_admin)):
    users = await db.users.find().to_list(1000)
    return [UserResponse(**user) for user in users]

@api_router.get("/users/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(**current_user.dict())

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, update_data: UserUpdate, super_admin: User = Depends(get_super_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if "password" in update_dict:
        update_dict["hashed_password"] = hash_password(update_dict.pop("password"))
    
    if update_dict:
        await db.users.update_one({"id": user_id}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"id": user_id})
    return UserResponse(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, super_admin: User = Depends(get_super_admin)):
    if user_id == super_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

# Analytics endpoint
@api_router.post("/analytics/log")
async def log_analytics(log_data: AnalyticsLog, current_user: User = Depends(get_current_user)):
  # Log to DB or file
  logging.info(f"Analytics: {log_data.action} - {log_data.details} by user {current_user.id}")
  return {"message": "Logged"}

# Customer routes
@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate, current_user: User = Depends(get_current_user)):
    customer = Customer(**customer_data.dict(), created_by=current_user.id)
    await db.customers.insert_one(customer.dict())
    return customer

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: User = Depends(get_current_user)):
    customers = await db.customers.find().to_list(1000)
    return [Customer(**customer) for customer in customers]

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, current_user: User = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return Customer(**customer)

# Property routes
@api_router.post("/properties", response_model=Property)
async def create_property(property_data: PropertyCreate, current_user: User = Depends(get_current_user)):
    if property_data.parent_id:
        parent = await db.properties.find_one({"id": property_data.parent_id})
        if not parent:
            raise HTTPException(status_code=404, detail="Parent property not found")
    property_obj = Property(**property_data.dict(), created_by=current_user.id)
    await db.properties.insert_one(property_obj.dict())
    return property_obj

@api_router.get("/properties", response_model=List[Property])
async def get_properties(
    property_type: Optional[PropertyType] = None,
    min_rooms: Optional[int] = None,
    max_rooms: Optional[int] = None,
    min_surface: Optional[float] = None,
    max_surface: Optional[float] = None,
    archived: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if property_type:
        query["property_type"] = property_type
    if min_rooms is not None:
        query["number_of_rooms"] = {"$gte": min_rooms}
    if max_rooms is not None:
        if "number_of_rooms" in query:
            query["number_of_rooms"]["$lte"] = max_rooms
        else:
            query["number_of_rooms"] = {"$lte": max_rooms}
    if min_surface is not None:
        query["surface_area"] = {"$gte": min_surface}
    if max_surface is not None:
        if "surface_area" in query:
            query["surface_area"]["$lte"] = max_surface
        else:
            query["surface_area"] = {"$lte": max_surface}
    if archived is not None:
        query["is_archived"] = archived
    
    properties = await db.properties.find(query).sort("created_at", -1).to_list(1000)
    return [Property(**property) for property in properties]

@api_router.get("/properties/{property_id}", response_model=Property)
async def get_property(property_id: str, current_user: User = Depends(get_current_user)):
    property = await db.properties.find_one({"id": property_id})
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    return Property(**property)

@api_router.put("/properties/{property_id}", response_model=Property)
async def update_property(
    property_id: str,
    property_data: PropertyUpdate,
    current_user: User = Depends(get_current_user)
):
    property = await db.properties.find_one({"id": property_id})
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    update_data = {k: v for k, v in property_data.dict().items() if v is not None}
    
    await db.properties.update_one({"id": property_id}, {"$set": update_data})
    updated_property = await db.properties.find_one({"id": property_id})
    return Property(**updated_property)

# Tenant routes
@api_router.post("/tenants", response_model=Tenant)
async def create_tenant(tenant_data: TenantCreate, current_user: User = Depends(get_current_user)):
    tenant = Tenant(**tenant_data.dict(), created_by=current_user.id)
    await db.tenants.insert_one(tenant.dict())
    return tenant

@api_router.get("/tenants", response_model=List[Tenant])
async def get_tenants(
    archived: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if archived is not None:
        query["is_archived"] = archived
    
    tenants = await db.tenants.find(query).sort("created_at", -1).to_list(1000)
    return [Tenant(**tenant) for tenant in tenants]

@api_router.get("/tenants/{tenant_id}", response_model=Tenant)
async def get_tenant(tenant_id: str, current_user: User = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return Tenant(**tenant)

@api_router.put("/tenants/{tenant_id}", response_model=Tenant)
async def update_tenant(
    tenant_id: str,
    tenant_data: TenantUpdate,
    current_user: User = Depends(get_current_user)
):
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    update_data = {k: v for k, v in tenant_data.dict().items() if v is not None}
    
    await db.tenants.update_one({"id": tenant_id}, {"$set": update_data})
    updated_tenant = await db.tenants.find_one({"id": tenant_id})
    return Tenant(**updated_tenant)

# Rental Agreement routes
@api_router.post("/rental-agreements", response_model=RentalAgreement)
async def create_rental_agreement(rental_data: RentalAgreementCreate, current_user: User = Depends(get_current_user)):
    # Verify property and tenant exist
    property = await db.properties.find_one({"id": rental_data.property_id})
    tenant = await db.tenants.find_one({"id": rental_data.tenant_id})
    
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    rental_agreement = RentalAgreement(**rental_data.dict(), created_by=current_user.id)
    await db.rental_agreements.insert_one(rental_agreement.dict())
    return rental_agreement

@api_router.get("/rental-agreements", response_model=List[RentalAgreement])
async def get_rental_agreements(
    property_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    active: Optional[bool] = None,
    archived: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if property_id:
        query["property_id"] = property_id
    if tenant_id:
        query["tenant_id"] = tenant_id
    if active is not None:
        query["is_active"] = active
    if archived is not None:
        query["is_archived"] = archived
    
    agreements = await db.rental_agreements.find(query).sort("created_at", -1).to_list(1000)
    return [RentalAgreement(**agreement) for agreement in agreements]

# Invoice routes (Rechnungen)
@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, current_user: User = Depends(get_current_user)):
    # Verify tenant and property exist
    tenant = await db.tenants.find_one({"id": invoice_data.tenant_id})
    property = await db.properties.find_one({"id": invoice_data.property_id})
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Generate invoice number
    invoice_count = await db.invoices.count_documents({})
    invoice_number = f"INV-{invoice_count + 1:06d}"
    
    invoice = Invoice(
        **invoice_data.dict(),
        invoice_number=invoice_number,
        created_by=current_user.id
    )
    await db.invoices.insert_one(invoice.dict())
    return invoice

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(
    tenant_id: Optional[str] = None,
    property_id: Optional[str] = None,
    status: Optional[InvoiceStatus] = None,
    archived: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if tenant_id:
        query["tenant_id"] = tenant_id
    if property_id:
        query["property_id"] = property_id
    if status:
        query["status"] = status
    if archived is not None:
        query["is_archived"] = archived
    
    invoices = await db.invoices.find(query).sort("created_at", -1).to_list(1000)
    return [Invoice(**invoice) for invoice in invoices]

@api_router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(
    invoice_id: str,
    invoice_data: InvoiceUpdate,
    current_user: User = Depends(get_current_user)
):
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = {k: v for k, v in invoice_data.dict().items() if v is not None}
    
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    updated_invoice = await db.invoices.find_one({"id": invoice_id})
    return Invoice(**updated_invoice)

# Payment routes (Kasse)
@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user: User = Depends(get_current_user)):
    # Verify invoice exists
    invoice = await db.invoices.find_one({"id": payment_data.invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    payment = Payment(**payment_data.dict(), created_by=current_user.id)
    await db.payments.insert_one(payment.dict())
    
    # Update invoice status if fully paid
    total_payments = await db.payments.aggregate([
        {"$match": {"invoice_id": payment_data.invoice_id}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    if total_payments and total_payments[0]["total"] >= invoice["amount"]:
        await db.invoices.update_one(
            {"id": payment_data.invoice_id},
            {"$set": {"status": InvoiceStatus.PAID}}
        )
    
    return payment

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(
    invoice_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if invoice_id:
        query["invoice_id"] = invoice_id
    
    payments = await db.payments.find(query).sort("created_at", -1).to_list(1000)
    return [Payment(**payment) for payment in payments]

# Task Order routes (existing)
@api_router.post("/task-orders", response_model=TaskOrder)
async def create_task_order(task_data: TaskOrderCreate, current_user: User = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": task_data.customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if task_data.property_id:
        property = await db.properties.find_one({"id": task_data.property_id})
        if not property:
            raise HTTPException(status_code=404, detail="Property not found")
    
    task_order = TaskOrder(**task_data.dict(), created_by=current_user.id)
    await db.task_orders.insert_one(task_order.dict())
    await sio.emit('new_task', task_order.dict())  # Changed from app.sio to sio
    return task_order

@api_router.get("/task-orders", response_model=List[TaskOrder])
async def get_task_orders(
    status: Optional[TaskStatus] = None,
    priority: Optional[Priority] = None,
    customer_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if customer_id:
        query["customer_id"] = customer_id
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    task_orders = await db.task_orders.find(query).sort("created_at", -1).to_list(1000)
    return [TaskOrder(**task_order) for task_order in task_orders]

@api_router.get("/task-orders/{task_order_id}", response_model=TaskOrder)
async def get_task_order(task_order_id: str, current_user: User = Depends(get_current_user)):
    task_order = await db.task_orders.find_one({"id": task_order_id})
    if not task_order:
        raise HTTPException(status_code=404, detail="Task order not found")
    return TaskOrder(**task_order)

@api_router.put("/task-orders/{task_order_id}", response_model=TaskOrder)
async def update_task_order(
    task_order_id: str,
    task_data: TaskOrderUpdate,
    current_user: User = Depends(get_current_user)
):
    task_order = await db.task_orders.find_one({"id": task_order_id})
    if not task_order:
        raise HTTPException(status_code=404, detail="Task order not found")
    
    update_data = {k: v for k, v in task_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.task_orders.update_one({"id": task_order_id}, {"$set": update_data})
    updated_task = await db.task_orders.find_one({"id": task_order_id})
    return TaskOrder(**updated_task)

@api_router.delete("/task-orders/{task_order_id}")
async def delete_task_order(task_order_id: str, current_user: User = Depends(get_current_user)):
    result = await db.task_orders.delete_one({"id": task_order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task order not found")
    return {"message": "Task order deleted successfully"}

# Activity routes
@api_router.post("/activities", response_model=Activity)
async def create_activity(activity_data: ActivityCreate, current_user: User = Depends(get_current_user)):
    task_order = await db.task_orders.find_one({"id": activity_data.task_order_id})
    if not task_order:
        raise HTTPException(status_code=404, detail="Task order not found")
    
    activity = Activity(**activity_data.dict(), created_by=current_user.id)
    await db.activities.insert_one(activity.dict())
    return activity

@api_router.get("/activities/{task_order_id}", response_model=List[Activity])
async def get_activities(task_order_id: str, current_user: User = Depends(get_current_user)):
    activities = await db.activities.find({"task_order_id": task_order_id}).sort("activity_date", -1).to_list(1000)
    return [Activity(**activity) for activity in activities]

# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Task Order Stats
    total_tasks = await db.task_orders.count_documents({})
    pending_tasks = await db.task_orders.count_documents({"status": TaskStatus.PENDING})
    in_progress_tasks = await db.task_orders.count_documents({"status": TaskStatus.IN_PROGRESS})
    completed_tasks = await db.task_orders.count_documents({"status": TaskStatus.COMPLETED})
    
    # Property Management Stats
    total_properties = await db.properties.count_documents({"is_archived": False})
    total_tenants = await db.tenants.count_documents({"is_archived": False})
    active_agreements = await db.rental_agreements.count_documents({"is_active": True, "is_archived": False})
    
    # Financial Stats
    total_invoices = await db.invoices.count_documents({"is_archived": False})
    unpaid_invoices = await db.invoices.count_documents({"status": {"$in": [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.OVERDUE]}, "is_archived": False})
    
    total_customers = await db.customers.count_documents({})
    
    return {
        "total_tasks": total_tasks,
        "pending_tasks": pending_tasks,
        "in_progress_tasks": in_progress_tasks,
        "completed_tasks": completed_tasks,
        "total_customers": total_customers,
        "total_properties": total_properties,
        "total_tenants": total_tenants,
        "active_agreements": active_agreements,
        "total_invoices": total_invoices,
        "unpaid_invoices": unpaid_invoices
    }

# Archive routes
@api_router.put("/archive/properties/{property_id}")
async def archive_property(property_id: str, current_user: User = Depends(get_current_user)):
    result = await db.properties.update_one(
        {"id": property_id},
        {"$set": {"is_archived": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"message": "Property archived successfully"}

@api_router.put("/archive/tenants/{tenant_id}")
async def archive_tenant(tenant_id: str, current_user: User = Depends(get_current_user)):
    result = await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {"is_archived": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {"message": "Tenant archived successfully"}

@api_router.put("/archive/invoices/{invoice_id}")
async def archive_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    result = await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {"is_archived": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice archived successfully"}

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()