"""Exercise submission API schemas."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExerciseSubmissionWrite(BaseModel):
    answer: str = Field(max_length=100000)
    action: Literal["save", "submit"] = "save"


class ExerciseSubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    lesson_id: uuid.UUID
    student_id: uuid.UUID
    answer: str
    status: str
    submitted_at: datetime | None
    grade: int | None
    feedback: str | None
    reviewed_by: uuid.UUID | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ExerciseReviewWrite(BaseModel):
    grade: int | None = Field(default=None, ge=0, le=100)
    feedback: str = Field(default="", max_length=10000)
    action: Literal["review", "return"] = "review"


class ExerciseSubmissionAdminRead(ExerciseSubmissionRead):
    student_name: str | None = None
    student_email: str
    lesson_title: str
    exercise_title: str = "Practice exercise"
    exercise_type: str = "written"
    exercise_instructions: str = ""
    expected_answer: str | None = None
