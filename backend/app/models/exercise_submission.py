"""Persistent learner exercise submissions and instructor reviews."""
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ExerciseSubmissionStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    reviewed = "reviewed"


class ExerciseSubmission(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "exercise_submissions"
    __table_args__ = (
        UniqueConstraint("lesson_id", "student_id", name="uq_exercise_submission_lesson_student"),
        Index("ix_exercise_submissions_lesson_status", "lesson_id", "status"),
        Index("ix_exercise_submissions_student", "student_id"),
    )

    lesson_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[ExerciseSubmissionStatus] = mapped_column(Enum(ExerciseSubmissionStatus, name="exercise_submission_status"), nullable=False, default=ExerciseSubmissionStatus.draft, server_default="draft")
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    grade: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
