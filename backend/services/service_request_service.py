"""
Service Request Service - Business Logic Layer
Handles service request operations, validation, and integration with ERP system
"""

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from pymongo.database import Database
from fastapi import UploadFile

from models.service_request import (
    ServiceRequest,
    ServiceRequestCreate,
    ServiceRequestUpdate,
    ServiceRequestResponse,
    ServiceRequestSummary,
    ServiceRequestStats,
    FileUploadResponse,
    ServiceRequestStatus,
    ServiceRequestPriority
)


class ServiceRequestService:
    """Service for managing service requests with business logic and validation"""
    
    def __init__(self, db: Database):
        self.db = db
        self.collection = db.service_requests
        self.accounts_collection = db.accounts
        self.tenants_collection = db.tenants  # Backward compatibility
        self.properties_collection = db.properties
        self.tasks_collection = db.tasks
        self.users_collection = db.users
        
        # File upload configuration
        self.upload_dir = "uploads/service_requests"
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        
        # Ensure upload directory exists
        os.makedirs(self.upload_dir, exist_ok=True)
    
    
    async def create_service_request(self, request: ServiceRequestCreate, created_by: str) -> ServiceRequestResponse:
        """
        Create a new service request with validation and task integration
        """
        # Validate tenant and property association
        await self.validate_tenant_property_association(request.tenant_id, request.property_id)
        
        # Create service request document
        service_request = ServiceRequest(
            tenant_id=request.tenant_id,
            property_id=request.property_id,
            request_type=request.request_type,
            priority=request.priority,
            title=request.title,
            description=request.description,
            attachment_urls=request.attachment_urls
        )
        
        # Insert into database
        result = await self.collection.insert_one(service_request.dict())
        
        if not result.inserted_id:
            raise Exception("Failed to create service request")
        
        # Create corresponding ERP task for internal processing
        task_id = await self._create_erp_task_from_request(service_request, created_by)
        
        # Update service request with task ID
        if task_id:
            await self.collection.update_one(
                {"id": service_request.id},
                {
                    "$set": {
                        "assigned_task_id": task_id,
                        "status": ServiceRequestStatus.ASSIGNED,
                        "assigned_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            service_request.assigned_task_id = task_id
            service_request.status = ServiceRequestStatus.ASSIGNED
            service_request.assigned_at = datetime.utcnow()
        
        # Return enriched response
        return await self._enrich_service_request_response(service_request)
    
    
    async def get_service_requests_with_filters(
        self, 
        filters: Dict[str, Any], 
        skip: int = 0, 
        limit: int = 50, 
        user_role: str = "user",
        user_id: Optional[str] = None
    ) -> List[ServiceRequestSummary]:
        """
        Get service requests with filtering, pagination, and role-based access
        """
        try:
            # Build query
            query = {"is_archived": False}
            query.update(filters)
            
            # Role-based access control
            if user_role == "user" and user_id:
                # Regular users (property managers) can only see requests for properties they manage
                # Get all property IDs managed by this user
                managed_properties = await self.properties_collection.find(
                    {"manager_id": user_id, "is_archived": False}
                ).to_list(length=None)
                
                managed_property_ids = [prop["id"] for prop in managed_properties]
                print(f"🔍 DEBUG - User {user_id} manages properties: {managed_property_ids}")
                
                if managed_property_ids:
                    # Only show service requests for properties managed by this user
                    query["property_id"] = {"$in": managed_property_ids}
                else:
                    # If user manages no properties, return empty results
                    print(f"⚠️ DEBUG - User {user_id} manages no properties, returning empty")
                    return []
            
            print(f"🔍 DEBUG - Service Request Query: {query}")
            
            # Execute query with pagination
            cursor = self.collection.find(query).skip(skip).limit(limit).sort("submitted_at", -1)
            requests = await cursor.to_list(length=limit)  # Fix: use limit instead of None
            
            print(f"🔍 DEBUG - Found {len(requests)} service requests")
            
            # Convert to summary format with property info
            summaries = []
            for request in requests:
                try:
                    # Get property address
                    property_doc = await self.properties_collection.find_one({"id": request.get("property_id")})
                    property_address = property_doc.get("address") if property_doc else "Address not found"
                    
                    summary = ServiceRequestSummary(
                        id=request["id"],
                        title=request["title"],
                        request_type=request["request_type"],
                        priority=request["priority"],
                        status=request["status"],
                        submitted_at=request["submitted_at"],
                        property_address=property_address
                    )
                    summaries.append(summary)
                    print(f"✅ DEBUG - Processed service request: {request['id']}")
                except Exception as e:
                    print(f"❌ DEBUG - Error processing service request {request.get('id', 'unknown')}: {e}")
                    continue
            
            print(f"🎯 DEBUG - Returning {len(summaries)} summaries")
            return summaries
            
        except Exception as e:
            print(f"❌ DEBUG - Service request query failed: {e}")
            # Return empty list instead of raising exception
            return []
    
    
    async def get_service_request_by_id(self, request_id: str, user_role: str = "user") -> Optional[ServiceRequestResponse]:
        """Get service request by ID with enriched data"""
        request = await self.collection.find_one({"id": request_id, "is_archived": False})
        
        if not request:
            return None
        
        # Convert to Pydantic model
        service_request = ServiceRequest(**request)
        
        # Return enriched response
        return await self._enrich_service_request_response(service_request)
    
    
    async def update_service_request(
        self, 
        request_id: str, 
        update: ServiceRequestUpdate, 
        updated_by: str
    ) -> Optional[ServiceRequestResponse]:
        """
        Update service request with status tracking and workflow validation
        """
        # Get existing request
        existing = await self.collection.find_one({"id": request_id, "is_archived": False})
        if not existing:
            return None
        
        # Build update document
        update_doc = {
            "updated_at": datetime.utcnow()
        }
        
        # Handle status updates with timestamp tracking
        if update.status:
            update_doc["status"] = update.status
            
            # Set appropriate timestamps based on status
            if update.status == ServiceRequestStatus.ASSIGNED and not existing.get("assigned_at"):
                update_doc["assigned_at"] = datetime.utcnow()
            elif update.status == ServiceRequestStatus.COMPLETED and not existing.get("completed_at"):
                update_doc["completed_at"] = datetime.utcnow()
            elif update.status == ServiceRequestStatus.CLOSED and not existing.get("closed_at"):
                update_doc["closed_at"] = datetime.utcnow()
        
        # Handle other updates
        if update.assigned_user_id is not None:
            update_doc["assigned_user_id"] = update.assigned_user_id
        if update.internal_notes is not None:
            update_doc["internal_notes"] = update.internal_notes
        if update.estimated_completion is not None:
            update_doc["estimated_completion"] = update.estimated_completion
        
        # Update in database
        result = await self.collection.update_one(
            {"id": request_id},
            {"$set": update_doc}
        )
        
        if result.modified_count == 0:
            return None
        
        # Update corresponding ERP task if exists
        if existing.get("assigned_task_id") and update.status:
            await self._update_erp_task_from_request(existing["assigned_task_id"], update.status)
        
        # Get updated request
        updated_request = await self.collection.find_one({"id": request_id})
        service_request = ServiceRequest(**updated_request)
        
        return await self._enrich_service_request_response(service_request)
    
    
    async def archive_service_request(self, request_id: str, archived_by: str) -> bool:
        """Archive service request (soft delete)"""
        result = await self.collection.update_one(
            {"id": request_id, "is_archived": False},
            {
                "$set": {
                    "is_archived": True,
                    "archived_at": datetime.utcnow(),
                    "archived_by": archived_by,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0
    
    
    async def upload_attachment(self, request_id: str, file: UploadFile, uploaded_by: str) -> FileUploadResponse:
        """
        Upload file attachment for service request
        """
        # Verify service request exists
        request = await self.collection.find_one({"id": request_id, "is_archived": False})
        if not request:
            raise ValueError("Service request not found")
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in self.allowed_extensions:
            raise ValueError("File type not allowed")
        
        unique_filename = f"{request_id}_{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(self.upload_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Generate file URL (this would be adjusted based on your file serving setup)
        file_url = f"/uploads/service_requests/{unique_filename}"
        
        # Update service request with new attachment URL
        await self.collection.update_one(
            {"id": request_id},
            {
                "$push": {"attachment_urls": file_url},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return FileUploadResponse(
            file_url=file_url,
            file_name=file.filename,
            file_size=len(content),
            uploaded_at=datetime.utcnow()
        )
    
    
    async def get_service_request_statistics(self, days: int = 30, property_id: Optional[str] = None) -> ServiceRequestStats:
        """
        Get service request statistics for dashboard
        """
        # Build query for date range
        start_date = datetime.utcnow() - timedelta(days=days)
        query = {
            "is_archived": False,
            "submitted_at": {"$gte": start_date}
        }
        
        if property_id:
            query["property_id"] = property_id
        
        # Get all requests in range
        requests = await self.collection.find(query).to_list(length=None)
        
        # Calculate statistics
        total_requests = len(requests)
        status_counts = {}
        priority_counts = {}
        
        for request in requests:
            # Count by status
            status = request["status"]
            status_counts[status] = status_counts.get(status, 0) + 1
            
            # Count by priority
            priority = request["priority"]
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
        
        # Calculate average response and completion times
        response_times = []
        completion_times = []
        
        for request in requests:
            if request.get("assigned_at"):
                response_time = (request["assigned_at"] - request["submitted_at"]).total_seconds() / 3600
                response_times.append(response_time)
            
            if request.get("completed_at"):
                completion_time = (request["completed_at"] - request["submitted_at"]).total_seconds() / 3600
                completion_times.append(completion_time)
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else None
        avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else None
        
        return ServiceRequestStats(
            total_requests=total_requests,
            submitted_count=status_counts.get("submitted", 0),
            assigned_count=status_counts.get("assigned", 0),
            in_progress_count=status_counts.get("in_progress", 0),
            completed_count=status_counts.get("completed", 0),
            closed_count=status_counts.get("closed", 0),
            cancelled_count=status_counts.get("cancelled", 0),
            emergency_count=priority_counts.get("emergency", 0),
            urgent_count=priority_counts.get("urgent", 0),
            routine_count=priority_counts.get("routine", 0),
            avg_response_time_hours=avg_response_time,
            avg_completion_time_hours=avg_completion_time
        )
    
    
    # Portal-specific methods for tenant access
    async def get_tenant_service_requests(
        self, 
        tenant_id: str, 
        skip: int = 0, 
        limit: int = 20
    ) -> List[ServiceRequest]:
        """Get service requests for a specific tenant (portal access)"""
        query = {
            "tenant_id": tenant_id,
            "is_archived": False
        }
        
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("submitted_at", -1)
        requests = await cursor.to_list(length=None)
        
        return [ServiceRequest(**request) for request in requests]
    
    
    async def get_tenant_service_request_by_id(self, request_id: str, tenant_id: str) -> Optional[ServiceRequest]:
        """Get specific service request for tenant (portal access with ownership verification)"""
        request = await self.collection.find_one({
            "id": request_id,
            "tenant_id": tenant_id,
            "is_archived": False
        })
        
        return ServiceRequest(**request) if request else None
    
    
    async def get_tenant_property_id(self, tenant_id: str) -> Optional[str]:
        """Get tenant's active property ID from rental agreements"""
        print(f"🔍 get_tenant_property_id called with: {tenant_id}")
        
        # Check accounts collection first
        account = await self.accounts_collection.find_one({
            "id": tenant_id,
            "account_type": "tenant",
            "is_archived": False
        })
        print(f"🔍 Account found in accounts: {account is not None}")
        
        # If not found in accounts, check tenants collection (backward compatibility)
        if not account:
            account = await self.tenants_collection.find_one({
                "id": tenant_id,
                "is_archived": False
            })
            print(f"🔍 Account found in tenants: {account is not None}")
        
        if not account:
            print(f"❌ No account found for tenant_id: {tenant_id}")
            return None
        
        print(f"✅ Found account: {account.get('first_name', '')} {account.get('last_name', '')}")
        
        # Find active contract with this tenant (match account_service query - no other_party_type filter)
        current_datetime = datetime.now(timezone.utc)
        active_contract = await self.db.contracts.find_one({
            "other_party_id": tenant_id,
            "status": "active",
            "start_date": {"$lte": current_datetime},
            "$or": [
                {"end_date": {"$gte": current_datetime}},
                {"end_date": None}  # No end date means ongoing
            ],
            "is_archived": False
        })
        
        print(f"🔍 Active contract found: {active_contract is not None}")
        if active_contract:
            print(f"✅ Contract property_id: {active_contract.get('property_id')}")
            return active_contract["property_id"]
        else:
            print(f"❌ No active contract found for tenant: {tenant_id}")
            return None
    
    
    # Validation and utility methods
    async def validate_tenant_property_association(self, tenant_id: str, property_id: str) -> bool:
        """Validate that tenant is associated with the property"""
        # Check if tenant exists
        tenant = await self.accounts_collection.find_one({"id": tenant_id, "account_type": "tenant"})
        if not tenant:
            # Check backward compatibility
            tenant = await self.tenants_collection.find_one({"id": tenant_id})
        
        if not tenant:
            raise ValueError("Tenant not found")
        
        # Check if property exists
        property_doc = await self.properties_collection.find_one({"id": property_id})
        if not property_doc:
            raise ValueError("Property not found")
        
        # Check if there's an active contract (updated from rental_agreements to contracts)
        current_datetime = datetime.now(timezone.utc)
        active_contract = await self.db.contracts.find_one({
            "other_party_id": tenant_id,
            "property_id": property_id,
            "status": "active",
            "start_date": {"$lte": current_datetime},
            "$or": [
                {"end_date": {"$gte": current_datetime}},
                {"end_date": None}  # No end date means ongoing
            ],
            "is_archived": False
        })
        
        if not active_contract:
            raise ValueError("No active contract found between tenant and property")
        
        return True
    
    
    async def _enrich_service_request_response(self, service_request: ServiceRequest) -> ServiceRequestResponse:
        """Enrich service request with related data for response"""
        # Get tenant info
        tenant = await self.accounts_collection.find_one({"id": service_request.tenant_id})
        if not tenant:
            tenant = await self.tenants_collection.find_one({"id": service_request.tenant_id})
        
        tenant_name = f"{tenant['first_name']} {tenant['last_name']}" if tenant else None
        
        # Get property info
        property_doc = await self.properties_collection.find_one({"id": service_request.property_id})
        property_address = property_doc.get("address") if property_doc else None
        
        # Get assigned user info
        assigned_user_name = None
        if service_request.assigned_user_id:
            user = await self.users_collection.find_one({"id": service_request.assigned_user_id})
            assigned_user_name = f"{user['first_name']} {user['last_name']}" if user else None
        
        return ServiceRequestResponse(
            **service_request.dict(),
            tenant_name=tenant_name,
            property_address=property_address,
            assigned_user_name=assigned_user_name
        )
    
    
    async def _create_erp_task_from_request(self, service_request: ServiceRequest, created_by: str) -> Optional[str]:
        """
        Create ERP task from service request for internal processing
        This integrates with the existing task management system and assigns to property manager
        """
        try:
            # Get property to find the assigned manager
            property_doc = await self.properties_collection.find_one({"id": service_request.property_id})
            if not property_doc:
                print(f"Property {service_request.property_id} not found for service request {service_request.id}")
                return None
            
            # Get property manager ID (fallback to created_by if no manager assigned)
            assigned_to = property_doc.get("manager_id", created_by)
            
            # Map service request priority to task priority
            priority_mapping = {
                ServiceRequestPriority.EMERGENCY: "high",
                ServiceRequestPriority.URGENT: "medium", 
                ServiceRequestPriority.ROUTINE: "low"
            }
            
            # Create task document
            task_doc = {
                "id": str(uuid.uuid4()),
                "title": f"Service Request: {service_request.title}",
                "description": f"Service request from tenant: {service_request.description}\n\nType: {service_request.request_type}\nPriority: {service_request.priority}\nProperty: {property_doc.get('name', 'Unknown')}",
                "priority": priority_mapping.get(service_request.priority, "medium"),
                "status": "pending",
                "property_id": service_request.property_id,
                "customer_id": service_request.tenant_id,
                "assigned_to": assigned_to,  # Assign to property manager
                "service_request_id": service_request.id,  # Link back to service request
                "created_by": created_by,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_archived": False
            }
            
            # Insert task
            result = await self.tasks_collection.insert_one(task_doc)
            
            if result.inserted_id:
                return task_doc["id"]
            
        except Exception as e:
            # Log error but don't fail service request creation
            print(f"Failed to create ERP task for service request {service_request.id}: {e}")
        
        return None
    
    
    async def _update_erp_task_from_request(self, task_id: str, new_status: ServiceRequestStatus):
        """
        Update corresponding ERP task when service request status changes
        """
        try:
            # Map service request status to task status
            status_mapping = {
                ServiceRequestStatus.SUBMITTED: "pending",
                ServiceRequestStatus.ASSIGNED: "pending",
                ServiceRequestStatus.IN_PROGRESS: "in_progress", 
                ServiceRequestStatus.COMPLETED: "completed",
                ServiceRequestStatus.CLOSED: "completed",
                ServiceRequestStatus.CANCELLED: "archived"
            }
            
            task_status = status_mapping.get(new_status, "pending")
            
            await self.tasks_collection.update_one(
                {"id": task_id},
                {
                    "$set": {
                        "status": task_status,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
        except Exception as e:
            # Log error but don't fail service request update
            print(f"Failed to update ERP task {task_id}: {e}")