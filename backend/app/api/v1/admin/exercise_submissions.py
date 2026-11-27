"""Instructor/admin exercise review endpoints."""
import uuid
import json
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models.course import Course
from app.models.course_module import CourseModule
from app.models.exercise_submission import ExerciseSubmission, ExerciseSubmissionStatus
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.exercise_submission import ExerciseReviewWrite, ExerciseSubmissionAdminRead, ExerciseSubmissionRead

router = APIRouter(prefix="/admin", tags=["admin:exercise-submissions"])
reviewer_dependency = Depends(require_role("admin", "super_admin", "instructor"))

def _can_review(user: User, course: Course) -> None:
    roles = {role.name for role in user.roles}
    if "admin" not in roles and "super_admin" not in roles and not ("instructor" in roles and course.instructor_id == user.id):
        raise HTTPException(403, "Only the course instructor or an administrator can review submissions.")


def _exercise_context(value: str | None) -> dict:
    if not value:
        return {}
    prefix = "IBRANT_EXERCISE_V1:"
    if not value.startswith(prefix):
        return {"exercise_instructions": value}
    try:
        config = json.loads(value[len(prefix):])
        return {
            "exercise_title": config.get("title") or "Practice exercise",
            "exercise_type": config.get("type") or "written",
            "exercise_instructions": config.get("instructions") or "",
            "expected_answer": config.get("expected_answer"),
        }
    except (TypeError, ValueError):
        return {"exercise_instructions": value}


@router.get("/courses/{course_id}/exercise-submissions", response_model=list[ExerciseSubmissionAdminRead])
async def list_course_submissions(course_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, reviewer_dependency]):
    course = await db.get(Course, course_id)
    if course is None:
        raise HTTPException(404, "course not found")
    _can_review(user, course)
    result = await db.execute(
        select(ExerciseSubmission, User, Lesson)
        .join(User, User.id == ExerciseSubmission.student_id)
        .join(Lesson, Lesson.id == ExerciseSubmission.lesson_id)
        .join(CourseModule, CourseModule.id == Lesson.module_id)
        .where(CourseModule.course_id == course_id)
        .order_by(ExerciseSubmission.updated_at.desc())
    )
    rows = result.all()
    return [ExerciseSubmissionAdminRead(
        **ExerciseSubmissionRead.model_validate(submission).model_dump(),
        student_name=student.full_name,
        student_email=student.email,
        lesson_title=lesson.title,
        **_exercise_context(lesson.exercise),
    ) for submission, student, lesson in rows]


@router.patch("/exercise-submissions/{submission_id}", response_model=ExerciseSubmissionAdminRead)
async def review_submission(submission_id: uuid.UUID, payload: ExerciseReviewWrite, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, reviewer_dependency]):
    submission = await db.get(ExerciseSubmission, submission_id)
    if submission is None:
        raise HTTPException(404, "submission not found")
    course = await db.scalar(select(Course).join(CourseModule, CourseModule.course_id == Course.id).join(Lesson, Lesson.module_id == CourseModule.id).where(Lesson.id == submission.lesson_id))
    if course is None:
        raise HTTPException(404, "course not found")
    _can_review(user, course)
    submission.grade = payload.grade
    submission.feedback = payload.feedback
    submission.reviewed_by = user.id
    submission.reviewed_at = datetime.now(timezone.utc)
    submission.status = ExerciseSubmissionStatus.reviewed if payload.action == "review" else ExerciseSubmissionStatus.draft
    await db.commit()
    await db.refresh(submission)
    student = await db.get(User, submission.student_id)
    lesson = await db.get(Lesson, submission.lesson_id)
    return ExerciseSubmissionAdminRead(
        **ExerciseSubmissionRead.model_validate(submission).model_dump(),
        student_name=student.full_name if student else None,
        student_email=student.email if student else "",
        lesson_title=lesson.title if lesson else "",
        **_exercise_context(lesson.exercise if lesson else None),
    )
