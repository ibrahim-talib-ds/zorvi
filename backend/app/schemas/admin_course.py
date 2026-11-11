"""ZORVI — Admin course schemas (create/update payloads)."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.course import CourseDifficulty, CourseStatus
from app.models.lesson import VideoProvider


class CourseCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    slug: str | None = Field(default=None, max_length=220)
    short_description: str = Field(min_length=10, max_length=500)
    long_description: str = ""
    thumbnail_url: str | None = None
    category_id: uuid.UUID | None = None
    difficulty: CourseDifficulty = CourseDifficulty.beginner
    technologies: list[str] = []
    prerequisites: list[str] = []
    learning_path: str | None = None
    estimated_hours: int = Field(default=0, ge=0)
    is_featured: bool = False


class CourseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    short_description: str | None = Field(default=None, min_length=10, max_length=500)
    long_description: str | None = None
    thumbnail_url: str | None = None
    category_id: uuid.UUID | None = None
    difficulty: CourseDifficulty | None = None
    technologies: list[str] | None = None
    prerequisites: list[str] | None = None
    learning_path: str | None = None
    estimated_hours: int | None = Field(default=None, ge=0)
    is_featured: bool | None = None
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
    exercise: str | None = None
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
    exercise: str | None = None
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
    exercise: str | None
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
    instructor_id: uuid.UUID
    category_id: uuid.UUID | None
    difficulty: str
    status: str
    technologies: list[str]
    prerequisites: list[str]
    learning_path: str | None
    estimated_hours: int
    is_featured: bool
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    modules: list[AdminModuleRead] = []
