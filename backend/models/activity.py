from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid


class Activity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_order_id: str
    description: str
    hours_spent: float = Field(..., ge=0)
    activity_date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str


class ActivityCreate(BaseModel):
    task_order_id: str
    description: str = Field(..., min_length=1, max_length=2000)
    hours_spent: float = Field(..., ge=0)
    activity_date: datetime


class ActivityUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    hours_spent: Optional[float] = Field(None, ge=0)
    activity_date: Optional[datetime] = None


class ActivityResponse(BaseModel):
    id: str
    task_order_id: str
    description: str
    hours_spent: float
    activity_date: datetime
    created_at: datetime
    created_by: str