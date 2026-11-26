"""Persisted guided AI build jobs and their operational timeline."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class BuildTask(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "build_tasks"
    __table_args__ = (
        Index("ix_build_tasks_status_created", "status", "created_at"),
        Index("ix_build_tasks_user_created", "user_id", "created_at"),
        Index("ix_build_tasks_project_id", "project_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_projects.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    plan: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued", server_default=text("'queued'"))
    auto_run: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("TRUE"))
    current_step_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    completed_steps: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    events: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    resume_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_step_title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
