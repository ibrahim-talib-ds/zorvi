"""ZORVI — Admin course schemas (create/update payloads)."""
import uuid
from datetime import datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.course import CourseDifficulty, CourseStatus
from app.models.lesson import VideoProvider


class CourseResource(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    url: str = Field(min_length=8, max_length=1000)
    resource_type: Literal["link", "pdf", "file"] = "link"
    description: str = Field(default="", max_length=300)

    @field_validator("url")
    @classmethod
    def validate_http_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Resource URL must be an absolute http or https URL")
        return value


class CourseCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    slug: str | None = Field(default=None, max_length=220)
    short_description: str = Field(min_length=10, max_length=500)
    long_description: str = ""
    thumbnail_url: str | None = None
    cover_image_url: str | None = None
    category_id: uuid.UUID | None = None
    difficulty: CourseDifficulty = CourseDifficulty.beginner
    technologies: list[str] = []
    prerequisites: list[str] = []
    learning_path: str | None = None
    estimated_hours: int = Field(default=0, ge=0)
    duration_weeks: int = Field(default=0, ge=0, le=260)
    is_featured: bool = False
    resources: list[CourseResource] = Field(default_factory=list)


class CourseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    short_description: str | None = Field(default=None, min_length=10, max_length=500)
    long_description: str | None = None
    thumbnail_url: str | None = None
    cover_image_url: str | None = None
    category_id: uuid.UUID | None = None
    difficulty: CourseDifficulty | None = None
    technologies: list[str] | None = None
    prerequisites: list[str] | None = None
    learning_path: str | None = None
    estimated_hours: int | None = Field(default=None, ge=0)
    duration_weeks: int | None = Field(default=None, ge=0, le=260)
    is_featured: bool | None = None
    resources: list[CourseResource] | None = None
    status: CourseStatus | None = None


class ModuleCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str = ""
    sort_order: int = 0


class ModuleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    sort_order: int | None = None


class LessonCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str = ""
    video_provider: VideoProvider = VideoProvider.none
    video_url: str | None = None
    video_file_key: str | None = None
    content_markdown: str = ""
    code_example: str | None = None
    code_language: str = "sql"
    exercise: str | None = None
    practical_examples: list[dict] = Field(default_factory=list)
    practice_questions: list[dict] = Field(default_factory=list)
    duration_minutes: int = Field(default=0, ge=0)
    sort_order: int = 0
    is_free_preview: bool = False


class LessonUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    video_provider: VideoProvider | None = None
    video_url: str | None = None
    video_file_key: str | None = None
    content_markdown: str | None = None
    code_example: str | None = None
    code_language: str | None = None
    exercise: str | None = None
    practical_examples: list[dict] | None = None
    practice_questions: list[dict] | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    sort_order: int | None = None
    is_free_preview: bool | None = None


class AdminLessonRead(BaseModel):
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
    code_language: str = "sql"
    exercise: str | None
    practical_examples: list[dict] = []
    practice_questions: list[dict] = []
    duration_minutes: int
    sort_order: int
    is_free_preview: bool
    created_at: datetime


class AdminModuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    description: str
    sort_order: int
    lessons: list[AdminLessonRead] = []


class AdminCourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    slug: str
    short_description: str
    long_description: str
    thumbnail_url: str | None
    cover_image_url: str | None = None
    instructor_id: uuid.UUID
    category_id: uuid.UUID | None
    difficulty: str
    status: str
    technologies: list[str]
    prerequisites: list[str]
    learning_path: str | None
    estimated_hours: int
    duration_weeks: int = 0
    is_featured: bool
    resources: list[CourseResource] = Field(default_factory=list)
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    modules: list[AdminModuleRead] = []
