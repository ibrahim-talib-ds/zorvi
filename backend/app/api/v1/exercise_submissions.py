"""Learner exercise submission endpoints."""
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.course import Course, CourseStatus
from app.models.course_module import CourseModule
from app.models.enrollment import Enrollment
from app.models.exercise_submission import ExerciseSubmission, ExerciseSubmissionStatus
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.exercise_submission import ExerciseSubmissionRead, ExerciseSubmissionWrite

router = APIRouter(prefix="/courses", tags=["exercise-submissions"])


@router.get("/{slug}/lessons/{lesson_id}/exercise-submission", response_model=ExerciseSubmissionRead | None)
async def get_my_submission(slug: str, lesson_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]):
    course_result = await db.execute(select(Course).where(Course.slug == slug, Course.status == CourseStatus.published, Course.deleted_at.is_(None)))
    course = course_result.scalar_one_or_none()
    if course is None:
        raise HTTPException(404, "course not found")
    lesson_result = await db.execute(select(Lesson).join(CourseModule).where(Lesson.id == lesson_id, CourseModule.course_id == course.id))
    lesson = lesson_result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(404, "lesson not found")
    enrollment = await db.scalar(select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id))
    if enrollment is None:
        raise HTTPException(403, "course enrollment required")
    return await db.scalar(select(ExerciseSubmission).where(ExerciseSubmission.lesson_id == lesson.id, ExerciseSubmission.student_id == user.id))


@router.put("/{slug}/lessons/{lesson_id}/exercise-submission", response_model=ExerciseSubmissionRead)
async def save_my_submission(slug: str, lesson_id: uuid.UUID, payload: ExerciseSubmissionWrite, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]):
    course_result = await db.execute(select(Course).where(Course.slug == slug, Course.status == CourseStatus.published, Course.deleted_at.is_(None)))
    course = course_result.scalar_one_or_none()
    if course is None:
        raise HTTPException(404, "course not found")
    lesson_result = await db.execute(select(Lesson).join(CourseModule).where(Lesson.id == lesson_id, CourseModule.course_id == course.id))
    lesson = lesson_result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(404, "lesson not found")
    enrollment = await db.scalar(select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id))
    if enrollment is None:
        raise HTTPException(403, "You must be enrolled to submit exercise work.")
    if not lesson.exercise:
        raise HTTPException(400, "This lesson does not have an exercise.")
    submission = await db.scalar(select(ExerciseSubmission).where(ExerciseSubmission.lesson_id == lesson.id, ExerciseSubmission.student_id == user.id))
    now = datetime.now(timezone.utc)
    if submission is None:
        submission = ExerciseSubmission(lesson_id=lesson.id, student_id=user.id, answer=payload.answer)
        db.add(submission)
    else:
        if submission.status == ExerciseSubmissionStatus.reviewed:
            submission.grade = None
            submission.feedback = None
            submission.reviewed_by = None
            submission.reviewed_at = None
        submission.answer = payload.answer
    if payload.action == "submit":
        if submission.reviewed_at is not None:
            submission.grade = None
            submission.feedback = None
            submission.reviewed_by = None
            submission.reviewed_at = None
        submission.status = ExerciseSubmissionStatus.submitted
        submission.submitted_at = now
    else:
        submission.status = ExerciseSubmissionStatus.draft
        submission.submitted_at = None
    await db.commit()
    await db.refresh(submission)
    return submission
