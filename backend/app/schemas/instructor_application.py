import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class InstructorApplicationCreate(BaseModel):
    topic: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10)
    is_paid: bool = False

class InstructorApplicationRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    topic: str
    description: str
    is_paid: bool
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}
