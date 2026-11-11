"""ZORVI — download request/response schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DownloadInfo(BaseModel):
    """Public metadata about a download token (never the filesystem path)."""
    model_config = ConfigDict(from_attributes=True)
    token: str
    file_name: str
    file_size_bytes: int
    expires_at: datetime
    is_used: bool


class IssueDownloadRequest(BaseModel):
    """Optional TTL override (server clamps to a maximum)."""
    ttl_minutes: int | None = Field(default=None, ge=1, le=1440)


class IssuedDownload(BaseModel):
    order_item_id: uuid.UUID
    token: str
    expires_at: datetime
    file_name: str
