"""Contracts for ibrant's guided AI project builder."""
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.user_project import ProjectFile


class BuildStackPreferences(BaseModel):
    frontend: Literal["auto", "react", "nextjs", "flutter", "html_css_js", "vue"] = "auto"
    backend: Literal["auto", "none", "python_fastapi", "node_express", "django", "laravel", "spring_boot"] = "auto"
    database: Literal["auto", "none", "postgresql", "mysql", "sqlite", "mongodb"] = "auto"


class BuildPlanRequest(BaseModel):
    prompt: str = Field(min_length=8, max_length=12_000)
    app_type: Literal["auto", "web", "mobile", "full_stack", "api", "data_science"] = "auto"
    preferences: BuildStackPreferences = Field(default_factory=BuildStackPreferences)
    answers: dict[str, str] = Field(default_factory=dict, max_length=8)
    previous_plan: dict | None = None


class BuildStepRequest(BaseModel):
    project_id: UUID
    prompt: str = Field(min_length=8, max_length=12_000)
    plan: dict
    step_index: int = Field(ge=0, le=20)
    additional_context: str = Field(default="", max_length=4000)


class BuildTaskCreate(BaseModel):
    project_id: UUID
    prompt: str = Field(min_length=8, max_length=12_000)
    plan: dict
    auto_run: bool = True


class BuildStack(BaseModel):
    frontend: str
    backend: str
    database: str
    languages: list[str] = Field(default_factory=list)
    rationale: str


class BuildPlanStep(BaseModel):
    id: str = Field(min_length=1, max_length=48)
    title: str = Field(min_length=1, max_length=120)
    objective: str = Field(min_length=1, max_length=1000)
    acceptance_criteria: list[str] = Field(default_factory=list, max_length=8)


class BuildPlan(BaseModel):
    project_name: str = Field(min_length=1, max_length=100)
    summary: str = Field(min_length=1, max_length=1200)
    app_type: str
    stack: BuildStack
    architecture: list[str] = Field(default_factory=list, max_length=12)
    questions: list[str] = Field(default_factory=list, max_length=3)
    steps: list[BuildPlanStep] = Field(min_length=2, max_length=12)
    limitations: list[str] = Field(default_factory=list, max_length=8)


class BuildStepResult(BaseModel):
    summary: str = Field(min_length=1, max_length=1200)
    files: list[ProjectFile] = Field(min_length=1, max_length=8)
    validation_notes: list[str] = Field(default_factory=list, max_length=8)
    user_question: str | None = Field(default=None, max_length=500)
    is_final_step: bool = False
