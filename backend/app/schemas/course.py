"""ZORVI — Course schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LessonPreview(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    description: str
    duration_minutes: int
    sort_order: int
    is_free_preview: bool


class LessonRead(BaseModel):
    """Full lesson content — only for enrolled students or free previews."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    module_id: uuid.UUID
    title: str
    description: str
    video_provider: str
    video_url: str | None
    video_file_key: str | None
    content_markdown: str
    code_example: str | None
    exercise: str | None
    duration_minutes: int
    sort_order: int
    is_free_preview: bool
    is_completed: bool = False


class ModuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    description: str
    sort_order: int
    lessons: list[LessonPreview] = []


class CourseListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    slug: str
    short_description: str
    cover_image_url: str | None = None
    thumbnail_url: str | None
    difficulty: str
    status: str
    technologies: list[str] = []
    learning_path: str | None
    estimated_hours: int
    is_featured: bool
    published_at: datetime | None
    created_at: datetime


class CourseRead(CourseListItem):
    long_description: str
    prerequisites: list[str] = []
    category_id: uuid.UUID | None
    instructor_id: uuid.UUID
    modules: list[ModuleRead] = []


class EnrollResponse(BaseModel):
    enrollment_id: uuid.UUID
    course_id: uuid.UUID
    course_slug: str
    enrolled_at: datetime
    already_enrolled: bool = False


class CompleteLessonResponse(BaseModel):
    lesson_id: uuid.UUID
    completed_at: datetime
    total_lessons: int
    completed_lessons: int
    percent_complete: float
    course_complete: bool
    certificate_code: str | None = None


class ProgressResponse(BaseModel):
    course_id: uuid.UUID
    course_slug: str
    total_lessons: int
    completed_lessons: int
    percent_complete: float
    is_complete: bool
    certificate_available: bool
    certificate_code: str | None = None


class MyCourseItem(BaseModel):
    course_id: uuid.UUID
    course_title: str
    course_slug: str
    course_cover_image_url: str | None = None
    thumbnail_url: str | None
    enrolled_at: datetime
    total_lessons: int
    completed_lessons: int
    percent_complete: float
    is_complete: bool
