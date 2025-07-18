from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
from enum import Enum
from fastapi.middleware.cors import CORSMiddleware
import socketio
import asyncio

# Import new architecture components
from middleware.error_handler import (
    ErrorHandlerMiddleware, 
    RequestLoggingMiddleware,
    DatabaseErrorMiddleware,
    ValidationErrorMiddleware
)
from api.v1.properties import router as properties_router
from api.v1.tenants import router as tenants_router
from api.v1.invoices import router as invoices_router
from api.v1.customers import router as customers_router
from api.v1.rental_agreements import router as rental_agreements_router
from api.v1.users import router as users_router
from api.v1.tasks import router as tasks_router
from api.v1.activities import router as activities_router
from api.v1.dashboard import router as dashboard_router
from api.v1.analytics import router as analytics_router
from api.v1.contracts import router as contracts_router
from repositories.property_repository import PropertyRepository
from migrations.runner import run_all_migrations

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

# Create the main app
app = FastAPI(title="ERP Property Management System", version="1.0.0")

# Socket.io setup - Create combined ASGI app
sio = socketio.AsyncServer(
    async_mode='asgi', 
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True
)
# Create combined Socket.io + FastAPI app
combined_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Set Socket.io instance for tasks module
from api.v1.tasks import set_socketio_instance
set_socketio_instance(sio)

# Socket.io event handlers
@sio.on('connect')
async def connect(sid, environ):
    logging.info(f'Client connected: {sid}')

@sio.on('disconnect')
async def disconnect(sid):
    logging.info(f'Client disconnected: {sid}')

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Add middleware (order matters - first added is outermost)
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(DatabaseErrorMiddleware)
app.add_middleware(ValidationErrorMiddleware)

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


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    USER = "user"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    full_name: str
    hashed_password: str
    role: UserRole = UserRole.USER
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
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
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    address: str = Field(..., min_length=5, max_length=500)
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = Field(None, max_length=20)
    bank_account: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=2000)

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

# User management routes moved to api/v1/users.py

# Analytics endpoint moved to api/v1/analytics.py

# Customer routes now handled by api/v1/customers.py


# Tenant routes now handled by api/v1/tenants.py

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
    
    # Check for overlapping rental agreements for the same property
    existing_agreements = await db.rental_agreements.find({
        "property_id": rental_data.property_id,
        "is_active": True,
        "is_archived": False
    }).to_list(length=None)
    
    for agreement in existing_agreements:
        # Check for date overlap
        existing_start = agreement.get("start_date")
        existing_end = agreement.get("end_date")
        new_start = rental_data.start_date
        new_end = rental_data.end_date
        
        # If no end date, assume ongoing
        if existing_end is None:
            existing_end = datetime(2099, 12, 31)  # Far future date
        if new_end is None:
            new_end = datetime(2099, 12, 31)  # Far future date
        
        # Check for overlap: new_start <= existing_end AND new_end >= existing_start
        if new_start <= existing_end and new_end >= existing_start:
            raise HTTPException(
                status_code=400, 
                detail=f"Rental agreement dates overlap with existing agreement for this property (Agreement ID: {agreement.get('id')})"
            )
    
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

# Invoice routes now handled by api/v1/invoices.py


# Task Order routes moved to api/v1/tasks.py
# Activity routes moved to api/v1/activities.py  
# Dashboard stats moved to api/v1/dashboard.py

# Archive routes

# Archive routes for tenants and invoices now handled by their respective service modules

# Include routers in the main app
app.include_router(api_router)  # Auth routes only
app.include_router(properties_router, prefix="/api/v1")
app.include_router(tenants_router, prefix="/api/v1")
app.include_router(invoices_router, prefix="/api/v1")
app.include_router(customers_router, prefix="/api/v1")
app.include_router(rental_agreements_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(tasks_router, prefix="/api/v1")
app.include_router(activities_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(contracts_router, prefix="/api/v1")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database migrations, indexes and other startup tasks."""
    try:
        # Run database migrations first
        await run_all_migrations(db)
        
        # Initialize property repository indexes (migrations handle this now, but keeping for safety)
        property_repo = PropertyRepository(db)
        await property_repo.setup_indexes()
        
        logger.info("Application started successfully")
        
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
        raise

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown."""
    try:
        # Close database connection
        client.close()
        
        logger.info("Application shutdown complete")
        
    except Exception as e:
        logger.error(f"Shutdown error: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "ERP Property Management System"}

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "ERP Property Management System API", "version": "1.0.0"}

# Replace the main app with the combined app
app = combined_app