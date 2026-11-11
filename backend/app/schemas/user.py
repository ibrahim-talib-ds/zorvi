"""ZORVI — user response schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str


class UserRead(BaseModel):
    """Public user representation. Never includes password_hash."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str | None
    avatar_url: str | None
    is_active: bool
    is_verified: bool
    created_at: datetime
    roles: list[RoleRead] = []


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)


class UserStats(BaseModel):
    orders_count: int
    courses_enrolled: int
    lessons_completed: int
