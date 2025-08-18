from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from models.user import User, UserRole
from datetime import datetime, timezone, timedelta
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
from api.v1.users import router as users_router
from api.v1.tasks import router as tasks_router
from api.v1.activities import router as activities_router
from api.v1.dashboard import router as dashboard_router
from api.v1.analytics import router as analytics_router
from api.v1.contracts import router as contracts_router
from api.v1.service_requests import router as service_requests_router
from api.v1.portal import router as portal_router
from api.v1.contractor import router as contractor_router
from api.v1.compliance import router as compliance_router
from api.v1.furnished_items import router as furnished_items_router
from api.v1.technical_objects import router as technical_objects_router
from api.v2.accounts import router as accounts_v2_router
from repositories.property_repository import PropertyRepository

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# JWT Configuration (must be provided)
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET must be set and at least 32 characters long")
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
cors_origins = os.environ.get('CORS_ORIGINS',
                              'http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"]
)

# Include routers in the main app
app.include_router(properties_router, prefix="/api/v1")
app.include_router(tenants_router, prefix="/api/v1")
app.include_router(invoices_router, prefix="/api/v1")
app.include_router(customers_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(tasks_router, prefix="/api/v1")
app.include_router(activities_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(contracts_router, prefix="/api/v1")
app.include_router(service_requests_router, prefix="/api/v1")
app.include_router(contractor_router, prefix="/api/v1")
app.include_router(compliance_router, prefix="/api/v1/compliance")
app.include_router(furnished_items_router, prefix="/api/v1")
app.include_router(technical_objects_router, prefix="/api/v1")

# Test endpoint to verify no auth issues
@app.get("/api/v1/test-public")
async def test_public_endpoint():
    """Test public endpoint - should work without auth"""
    return {"message": "Public endpoint works!"}

# Public service request endpoints removed for security

# service_requests_public_router removed for security
app.include_router(portal_router, prefix="/api/v1")

# V2 API Routes (Unified Account System)
app.include_router(accounts_v2_router)
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
        # Initialize property repository indexes (migrations handle this now, but keeping for safety)
        property_repo = PropertyRepository(db)
        await property_repo.setup_indexes()
        
        # Ensure critical indexes for unified accounts/portal flows
        try:
            # Accounts collection indexes
            await db.accounts.create_index([("id", 1)], unique=True, background=True)
            await db.accounts.create_index([("account_type", 1), ("is_archived", 1)], background=True)
        except Exception as e:
            logging.info(f"Accounts index setup skipped or failed: {e}")

        try:
            # Tenant profiles collection indexes (portal)
            await db.tenant_profiles.create_index([("portal_email", 1)], background=True)
            await db.tenant_profiles.create_index([("account_id", 1)], background=True)
        except Exception as e:
            logging.info(f"Tenant profiles index setup skipped or failed: {e}")
        
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