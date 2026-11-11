"""ZORVI — Course model."""
import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text, text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.course_module import CourseModule
    from app.models.enrollment import Enrollment
    from app.models.user import User


class CourseStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class CourseDifficulty(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    expert = "expert"


class Course(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "courses"
    __table_args__ = (
        Index(
            "uq_courses_slug_active",
            "slug",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("ix_courses_instructor_id", "instructor_id"),
        Index("ix_courses_category_id", "category_id"),
        Index("ix_courses_status", "status"),
        Index("ix_courses_created_at", "created_at"),
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), nullable=False)
    short_description: Mapped[str] = mapped_column(String(500), nullable=False)
    long_description: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    instructor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marketplace_categories.id", ondelete="SET NULL"),
        nullable=True,
    )

    difficulty: Mapped[CourseDifficulty] = mapped_column(
        Enum(CourseDifficulty, name="course_difficulty", native_enum=True),
        nullable=False,
        default=CourseDifficulty.beginner,
        server_default=text("'beginner'"),
    )
    status: Mapped[CourseStatus] = mapped_column(
        Enum(CourseStatus, name="course_status", native_enum=True),
        nullable=False,
        default=CourseStatus.draft,
        server_default=text("'draft'"),
    )

    # Reusable fields — an array of tech names, and prerequisites as course IDs
    technologies: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    prerequisites: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    learning_path: Mapped[str | None] = mapped_column(String(100), nullable=True)

    estimated_hours: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    is_featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("FALSE")
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    modules: Mapped[list["CourseModule"]] = relationship(
        "CourseModule",
        back_populates="course",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="CourseModule.sort_order",
    )

    def __repr__(self) -> str:
        return f"<Course {self.slug} status={self.status.value}>"
