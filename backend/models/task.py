from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


class Priority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"


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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    assigned_to: Optional[str] = None
    is_archived: bool = False
    is_active: bool = True


class TaskOrderCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    customer_id: str
    priority: Priority
    budget: Optional[float] = Field(None, ge=0)
    due_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    property_id: Optional[str] = None


class TaskOrderUpdate(BaseModel):
    subject: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    customer_id: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[TaskStatus] = None
    budget: Optional[float] = Field(None, ge=0)
    due_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    property_id: Optional[str] = None


class TaskOrderResponse(BaseModel):
    id: str
    subject: str
    description: str
    customer_id: str
    priority: Priority
    status: TaskStatus
    budget: Optional[float] = None
    due_date: Optional[datetime] = None
    property_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: str
    assigned_to: Optional[str] = None
    is_archived: bool = False
    is_active: bool = True