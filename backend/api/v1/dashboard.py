from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
import logging
import asyncio

from utils.auth import get_current_user
from utils.dependencies import get_database

logger = logging.getLogger(__name__)

router = APIRouter()

# Dashboard routes
@router.get("/dashboard/stats")
async def get_dashboard_stats(
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get dashboard statistics."""
    try:
        # Build date filter
        date_filter = {}
        if from_date and to_date:
            try:
                start_date = datetime.strptime(from_date, "%Y-%m-%d")
                end_date = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
                date_filter = {
                    "created_at": {
                        "$gte": start_date,
                        "$lte": end_date
                    }
                }
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Task Order Stats - single aggregation with date filter
        task_pipeline = []
        if date_filter:
            task_pipeline.append({"$match": date_filter})
        
        task_pipeline.append({
            "$group": {
                "_id": None,
                "total_tasks": {"$sum": 1},
                "pending_tasks": {
                    "$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}
                },
                "in_progress_tasks": {
                    "$sum": {"$cond": [{"$eq": ["$status", "in_progress"]}, 1, 0]}
                },
                "completed_tasks": {
                    "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                }
            }
        })
        
        task_stats = await db.task_orders.aggregate(task_pipeline).to_list(1)
        
        # Build filters for other collections
        property_filter = {"is_archived": False}
        tenant_filter = {"is_archived": False}
        customer_filter = {}
        agreement_filter = {"is_active": True, "is_archived": False}
        invoice_filter = {"is_archived": False}
        unpaid_invoice_filter = {
            "status": {"$in": ["draft", "sent", "overdue"]}, 
            "is_archived": False
        }
        
        # Add date filtering if provided
        if date_filter:
            property_filter.update(date_filter)
            tenant_filter.update(date_filter)
            customer_filter.update(date_filter)
            agreement_filter.update(date_filter)
            invoice_filter.update(date_filter)
            unpaid_invoice_filter.update(date_filter)
        
        # Get counts for all collections in parallel
        counts = await asyncio.gather(
            db.properties.count_documents(property_filter),
            db.tenants.count_documents(tenant_filter),
            db.customers.count_documents(customer_filter),
            db.rental_agreements.count_documents(agreement_filter),
            db.invoices.count_documents(invoice_filter),
            db.invoices.count_documents(unpaid_invoice_filter)
        )
        
        total_properties, total_tenants, total_customers, active_agreements, total_invoices, unpaid_invoices = counts
        
        # Extract task stats or use defaults
        task_data = task_stats[0] if task_stats else {
            "total_tasks": 0, 
            "pending_tasks": 0, 
            "in_progress_tasks": 0, 
            "completed_tasks": 0
        }
        
        return {
            "total_tasks": task_data["total_tasks"],
            "pending_tasks": task_data["pending_tasks"],
            "in_progress_tasks": task_data["in_progress_tasks"],
            "completed_tasks": task_data["completed_tasks"],
            "total_customers": total_customers,
            "total_properties": total_properties,
            "total_tenants": total_tenants,
            "active_agreements": active_agreements,
            "total_invoices": total_invoices,
            "unpaid_invoices": unpaid_invoices
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        # Return default values on error
        return {
            "total_tasks": 0,
            "pending_tasks": 0,
            "in_progress_tasks": 0,
            "completed_tasks": 0,
            "total_customers": 0,
            "total_properties": 0,
            "total_tenants": 0,
            "active_agreements": 0,
            "total_invoices": 0,
            "unpaid_invoices": 0
        }

@router.get("/dashboard/recent-activities")
async def get_recent_activities(
    limit: int = Query(10, ge=1, le=100),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get recent activities across all entities."""
    try:
        # Get recent activities from multiple collections
        recent_tasks = await db.task_orders.find({}).sort("created_at", -1).limit(limit).to_list(length=None)
        recent_invoices = await db.invoices.find({}).sort("created_at", -1).limit(limit).to_list(length=None)
        recent_tenants = await db.tenants.find({}).sort("created_at", -1).limit(limit).to_list(length=None)
        recent_properties = await db.properties.find({}).sort("created_at", -1).limit(limit).to_list(length=None)
        
        # Combine and sort all activities
        all_activities = []
        
        for task in recent_tasks:
            all_activities.append({
                "type": "task",
                "id": task["id"],
                "title": task["subject"],
                "description": f"Task created for customer",
                "created_at": task["created_at"],
                "created_by": task["created_by"]
            })
        
        for invoice in recent_invoices:
            all_activities.append({
                "type": "invoice",
                "id": invoice["id"],
                "title": f"Invoice {invoice['invoice_number']}",
                "description": f"Invoice for {invoice['amount']} EUR",
                "created_at": invoice["created_at"],
                "created_by": invoice["created_by"]
            })
        
        for tenant in recent_tenants:
            all_activities.append({
                "type": "tenant",
                "id": tenant["id"],
                "title": f"{tenant['first_name']} {tenant['last_name']}",
                "description": "New tenant added",
                "created_at": tenant["created_at"],
                "created_by": tenant["created_by"]
            })
        
        for property in recent_properties:
            all_activities.append({
                "type": "property",
                "id": property["id"],
                "title": property["name"],
                "description": f"Property added - {property['property_type']}",
                "created_at": property["created_at"],
                "created_by": property["created_by"]
            })
        
        # Sort by created_at and limit results
        all_activities.sort(key=lambda x: x["created_at"], reverse=True)
        
        return {"recent_activities": all_activities[:limit]}
    except Exception as e:
        logger.error(f"Error fetching recent activities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch recent activities")