"""Validation and response schemas for account-owned build projects."""
from datetime import datetime
from pathlib import PurePosixPath
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProjectFile(BaseModel):
    path: str = Field(min_length=1, max_length=180)
    content: str = Field(max_length=512_000)

    @field_validator("path")
    @classmethod
    def validate_path(cls, value: str) -> str:
        if "\\" in value or "\x00" in value or value.startswith("/"):
            raise ValueError("File paths must be relative and use forward slashes.")
        parts = value.split("/")
        if any(part in {"", ".", ".."} for part in parts):
            raise ValueError("File paths cannot contain empty, '.' or '..' segments.")
        lower_parts = [part.lower() for part in parts]
        if any(part == ".env" or part.startswith(".env.") and part != ".env.example" for part in lower_parts):
            raise ValueError("Do not store environment files or secrets in a project workspace.")
        if any(part.lower().endswith((".pem", ".key")) or part.lower() in {"id_rsa", "id_ed25519"} for part in parts):
            raise ValueError("Private keys cannot be stored in a project workspace.")
        return str(PurePosixPath(value))


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    template: Literal["web", "landing-page", "python", "blank"] = "web"
    files: list[ProjectFile] = Field(default_factory=list, max_length=50)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    template: Literal["web", "landing-page", "python", "blank"] | None = None
    files: list[ProjectFile] | None = Field(default=None, max_length=50)


class ProjectSummary(BaseModel):
    id: UUID
    name: str
    description: str | None
    template: str
    file_count: int
    created_at: datetime
    updated_at: datetime
    last_opened_at: datetime | None


class ProjectRead(ProjectSummary):
    model_config = ConfigDict(from_attributes=True)
    files: list[ProjectFile]
