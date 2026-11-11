"""ZORVI — Lesson model."""
import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.course_module import CourseModule


class VideoProvider(str, enum.Enum):
    youtube = "youtube"
    vimeo = "vimeo"
    local = "local"
    none = "none"


class Lesson(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "lessons"
    __table_args__ = (
        Index("ix_lessons_module_id", "module_id"),
        Index("ix_lessons_sort_order", "sort_order"),
    )

    module_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_modules.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )

    # Video — supports YouTube/Vimeo URL OR local storage key
    video_provider: Mapped[VideoProvider] = mapped_column(
        Enum(VideoProvider, name="video_provider", native_enum=True),
        nullable=False,
        default=VideoProvider.none,
        server_default=text("'none'"),
    )
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    video_file_key: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Written content
    content_markdown: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    code_example: Mapped[str | None] = mapped_column(Text, nullable=True)
    exercise: Mapped[str | None] = mapped_column(Text, nullable=True)

    duration_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    is_free_preview: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default=text("FALSE")
    )

    module: Mapped["CourseModule"] = relationship("CourseModule", back_populates="lessons")

    def __repr__(self) -> str:
        return f"<Lesson {self.title}>"
