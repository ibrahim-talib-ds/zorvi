import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class NotificationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1)
    href: str | None = None
    type: str = "info"
    user_id: uuid.UUID | None = None  # For single user
    user_ids: list[uuid.UUID] | None = None  # For multiple users
    is_broadcast: bool = True


class NotificationRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    title: str
    message: str
    href: str | None
    type: str
    is_broadcast: bool
    read_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}
