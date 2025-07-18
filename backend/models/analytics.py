from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime
import uuid


class AnalyticsLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str = Field(..., min_length=1, max_length=100)
    details: Dict[str, Any] = Field(default_factory=dict)
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class AnalyticsLogCreate(BaseModel):
    action: str = Field(..., min_length=1, max_length=100)
    details: Dict[str, Any] = Field(default_factory=dict)


class AnalyticsLogResponse(BaseModel):
    id: str
    action: str
    details: Dict[str, Any]
    user_id: str
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None