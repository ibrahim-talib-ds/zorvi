import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class MessageCreate(BaseModel):
    receiver_id: uuid.UUID
    product_id: uuid.UUID | None = None
    subject: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=10)

class MessageRead(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    receiver_id: uuid.UUID
    subject: str
    body: str
    is_read: bool
    created_at: datetime
    sender_name: str | None = None
    sender_email: str | None = None
    product_title: str | None = None
    model_config = {"from_attributes": True}
