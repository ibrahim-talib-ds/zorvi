"""ZORVI — Public course endpoints."""
import secrets
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func as sql_func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.certificate import Certificate
from app.models.course import Course, CourseDifficulty, CourseStatus
from app.models.course_module import CourseModule
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.lesson_progress import LessonProgress
from app.models.user import User
from app.schemas.course import (
    CompleteLessonResponse,
    CourseListItem,
    CourseRead,
    EnrollResponse,
    LessonRead,
    MyCourseItem,
    ProgressResponse,
)

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=list[CourseListItem])
async def list_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    category_id: uuid.UUID | None = None,
    difficulty: CourseDifficulty | None = None,
    featured: bool | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[CourseListItem]:
    """List all published courses (public)."""
    stmt = (
        select(Course)
        .where(
            Course.status == CourseStatus.published,
            Course.deleted_at.is_(None),
        )
    )
    if category_id is not None:
        stmt = stmt.where(Course.category_id == category_id)
    if difficulty is not None:
        stmt = stmt.where(Course.difficulty == difficulty)
    if featured is not None:
        stmt = stmt.where(Course.is_featured == featured)

    stmt = (
        stmt.order_by(
            Course.is_featured.desc(),
            Course.published_at.desc().nullslast(),
            Course.created_at.desc(),
        )
        .limit(limit)
        .offset(offset)
    )

    result = await db.execute(stmt)
    return [CourseListItem.model_validate(c) for c in result.scalars().all()]


# ---------- Technology filter endpoint ----------

@router.get("/technologies", response_model=list[dict])
async def list_technologies(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    """Return unique technologies across all published courses with counts."""
    result = await db.execute(
        select(Course).where(
            Course.status == CourseStatus.published,
            Course.deleted_at.is_(None),
        )
    )
    courses = result.scalars().all()

    tech_counts: dict[str, int] = {}
    for c in courses:
        for tech in (c.technologies or []):
            if isinstance(tech, str) and tech.strip():
                name = tech.strip()
                tech_counts[name] = tech_counts.get(name, 0) + 1

    # Sort by count desc, then alphabetically
    sorted_techs = sorted(
        tech_counts.items(),
        key=lambda x: (-x[1], x[0].lower()),
    )
    return [{"name": name, "count": count} for name, count in sorted_techs]


@router.get("/{slug}", response_model=CourseRead)
async def get_course(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CourseRead:
    """Get a single published course with modules and lesson previews."""
    result = await db.execute(
        select(Course).where(
            Course.slug == slug,
            Course.status == CourseStatus.published,
            Course.deleted_at.is_(None),
        )
    )
    course = result.scalar_one_or_none()
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="course not found"
        )
    return CourseRead.model_validate(course)


# ---------- Helper: certificate code generator ----------


def _generate_certificate_code() -> str:
    """Generate a short readable certificate code like ZORVI-ABC123."""
    return "ZORVI-" + secrets.token_urlsafe(6).replace("-", "").replace("_", "")[:8].upper()


# ---------- Enrollment ----------

@router.post("/{slug}/enroll", response_model=EnrollResponse)
async def enroll_in_course(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated["User", Depends(get_current_user)],
) -> EnrollResponse:
    """Enroll current user in a course."""
    course_result = await db.execute(
        select(Course).where(
            Course.slug == slug,
            Course.status == CourseStatus.published,
            Course.deleted_at.is_(None),
        )
    )
    course = course_result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="course not found")

    # Check existing enrollment
    existing_result = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == user.id,
            Enrollment.course_id == course.id,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        return EnrollResponse(
            enrollment_id=existing.id,
            course_id=course.id,
            course_slug=course.slug,
            enrolled_at=existing.enrolled_at,
            already_enrolled=True,
        )

    enrollment = Enrollment(user_id=user.id, course_id=course.id)
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)

    return EnrollResponse(
        enrollment_id=enrollment.id,
        course_id=course.id,
        course_slug=course.slug,
        enrolled_at=enrollment.enrolled_at,
        already_enrolled=False,
    )


# ---------- Lesson access ----------

async def _verify_enrollment(db: AsyncSession, user_id: uuid.UUID, course_id: uuid.UUID) -> Enrollment | None:
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course_id,
        )
    )
    return result.scalar_one_or_none()


@router.get("/{slug}/lessons/{lesson_id}", response_model=LessonRead)
async def get_lesson(
    slug: str,
    lesson_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated["User", Depends(get_current_user)],
) -> LessonRead:
    """Get full lesson content. Requires enrollment OR free preview."""
    course_result = await db.execute(
        select(Course).where(
            Course.slug == slug,
            Course.status == CourseStatus.published,
            Course.deleted_at.is_(None),
        )
    )
    course = course_result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="course not found")

    lesson_result = await db.execute(
        select(Lesson)
        .join(CourseModule, Lesson.module_id == CourseModule.id)
        .where(
            Lesson.id == lesson_id,
            CourseModule.course_id == course.id,
        )
    )
    lesson = lesson_result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=404, detail="lesson not found in this course")

    # Access check
    if not lesson.is_free_preview:
        enrollment = await _verify_enrollment(db, user.id, course.id)
        if enrollment is None:
            raise HTTPException(
                status_code=403,
                detail="enrollment required — this lesson is not a free preview",
            )

    # Check completion status
    completed_result = await db.execute(
        select(LessonProgress).where(
            LessonProgress.user_id == user.id,
            LessonProgress.lesson_id == lesson.id,
        )
    )
    is_completed = completed_result.scalar_one_or_none() is not None

    data = LessonRead.model_validate(lesson)
    data.is_completed = is_completed
    return data


@router.post("/{slug}/lessons/{lesson_id}/complete", response_model=CompleteLessonResponse)
async def complete_lesson(
    slug: str,
    lesson_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated["User", Depends(get_current_user)],
) -> CompleteLessonResponse:
    """Mark a lesson as complete. Issues certificate at 100%."""
    course_result = await db.execute(
        select(Course).where(
            Course.slug == slug,
            Course.status == CourseStatus.published,
            Course.deleted_at.is_(None),
        )
    )
    course = course_result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="course not found")

    enrollment = await _verify_enrollment(db, user.id, course.id)
    if enrollment is None:
        raise HTTPException(status_code=403, detail="must be enrolled to complete lessons")

    lesson_result = await db.execute(
        select(Lesson)
        .join(CourseModule, Lesson.module_id == CourseModule.id)
        .where(
            Lesson.id == lesson_id,
            CourseModule.course_id == course.id,
        )
    )
    lesson = lesson_result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=404, detail="lesson not found in this course")

    # Upsert progress
    existing_result = await db.execute(
        select(LessonProgress).where(
            LessonProgress.user_id == user.id,
            LessonProgress.lesson_id == lesson.id,
        )
    )
    progress = existing_result.scalar_one_or_none()
    if progress is None:
        progress = LessonProgress(user_id=user.id, lesson_id=lesson.id)
        db.add(progress)

    # Count total and completed
    total_result = await db.execute(
        select(sql_func.count(Lesson.id))
        .join(CourseModule, Lesson.module_id == CourseModule.id)
        .where(CourseModule.course_id == course.id)
    )
    total_lessons = total_result.scalar() or 0

    await db.flush()

    completed_result = await db.execute(
        select(sql_func.count(LessonProgress.id))
        .join(Lesson, LessonProgress.lesson_id == Lesson.id)
        .join(CourseModule, Lesson.module_id == CourseModule.id)
        .where(
            LessonProgress.user_id == user.id,
            CourseModule.course_id == course.id,
        )
    )
    completed_lessons = completed_result.scalar() or 0

    percent = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0.0
    course_complete = total_lessons > 0 and completed_lessons >= total_lessons

    # Auto-issue certificate at 100%
    certificate_code = None
    if course_complete:
        cert_result = await db.execute(
            select(Certificate).where(
                Certificate.user_id == user.id,
                Certificate.course_id == course.id,
            )
        )
        cert = cert_result.scalar_one_or_none()
        if cert is None:
            cert = Certificate(
                user_id=user.id,
                course_id=course.id,
                certificate_code=_generate_certificate_code(),
            )
            db.add(cert)
            enrollment.completed_at = sql_func.now()
        certificate_code = cert.certificate_code

    await db.commit()
    await db.refresh(progress)

    return CompleteLessonResponse(
        lesson_id=lesson.id,
        completed_at=progress.completed_at,
        total_lessons=total_lessons,
        completed_lessons=completed_lessons,
        percent_complete=round(percent, 1),
        course_complete=course_complete,
        certificate_code=certificate_code,
    )


# ---------- Progress + my courses ----------

@router.get("/{slug}/progress", response_model=ProgressResponse)
async def get_progress(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated["User", Depends(get_current_user)],
) -> ProgressResponse:
    """Get current user's progress in a course."""
    course_result = await db.execute(
        select(Course).where(
            Course.slug == slug,
            Course.status == CourseStatus.published,
            Course.deleted_at.is_(None),
        )
    )
    course = course_result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="course not found")

    enrollment = await _verify_enrollment(db, user.id, course.id)
    if enrollment is None:
        raise HTTPException(status_code=403, detail="not enrolled in this course")

    total_result = await db.execute(
        select(sql_func.count(Lesson.id))
        .join(CourseModule, Lesson.module_id == CourseModule.id)
        .where(CourseModule.course_id == course.id)
    )
    total_lessons = total_result.scalar() or 0

    completed_result = await db.execute(
        select(sql_func.count(LessonProgress.id))
        .join(Lesson, LessonProgress.lesson_id == Lesson.id)
        .join(CourseModule, Lesson.module_id == CourseModule.id)
        .where(
            LessonProgress.user_id == user.id,
            CourseModule.course_id == course.id,
        )
    )
    completed_lessons = completed_result.scalar() or 0

    percent = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0.0
    is_complete = total_lessons > 0 and completed_lessons >= total_lessons

    cert_result = await db.execute(
        select(Certificate).where(
            Certificate.user_id == user.id,
            Certificate.course_id == course.id,
        )
    )
    cert = cert_result.scalar_one_or_none()

    return ProgressResponse(
        course_id=course.id,
        course_slug=course.slug,
        total_lessons=total_lessons,
        completed_lessons=completed_lessons,
        percent_complete=round(percent, 1),
        is_complete=is_complete,
        certificate_available=cert is not None,
        certificate_code=cert.certificate_code if cert else None,
    )


my_router = APIRouter(prefix="/my-courses", tags=["courses"])


@my_router.get("", response_model=list[MyCourseItem])
async def list_my_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated["User", Depends(get_current_user)],
) -> list[MyCourseItem]:
    """List all courses the current user is enrolled in."""
    enrollments_result = await db.execute(
        select(Enrollment, Course)
        .join(Course, Enrollment.course_id == Course.id)
        .where(
            Enrollment.user_id == user.id,
            Course.deleted_at.is_(None),
        )
        .order_by(Enrollment.enrolled_at.desc())
    )
    rows = enrollments_result.all()

    items: list[MyCourseItem] = []
    for enrollment, course in rows:
        total_result = await db.execute(
            select(sql_func.count(Lesson.id))
            .join(CourseModule, Lesson.module_id == CourseModule.id)
            .where(CourseModule.course_id == course.id)
        )
        total_lessons = total_result.scalar() or 0

        completed_result = await db.execute(
            select(sql_func.count(LessonProgress.id))
            .join(Lesson, LessonProgress.lesson_id == Lesson.id)
            .join(CourseModule, Lesson.module_id == CourseModule.id)
            .where(
                LessonProgress.user_id == user.id,
                CourseModule.course_id == course.id,
            )
        )
        completed_lessons = completed_result.scalar() or 0

        percent = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0.0

        items.append(MyCourseItem(
            course_id=course.id,
            course_title=course.title,
            course_slug=course.slug,
            course_thumbnail_url=course.thumbnail_url,
            enrolled_at=enrollment.enrolled_at,
            total_lessons=total_lessons,
            completed_lessons=completed_lessons,
            percent_complete=round(percent, 1),
            is_complete=total_lessons > 0 and completed_lessons >= total_lessons,
        ))

    return items

# ---------- Technology filter endpoint ----------

@router.get("/technologies", response_model=list[dict])
async def list_technologies(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    """Return unique technologies across all published courses with counts."""
    result = await db.execute(
        select(Course).where(
            Course.status == CourseStatus.published,
            Course.deleted_at.is_(None),
        )
    )
    courses = result.scalars().all()

    tech_counts: dict[str, int] = {}
    for c in courses:
        for tech in (c.technologies or []):
            if isinstance(tech, str) and tech.strip():
                name = tech.strip()
                tech_counts[name] = tech_counts.get(name, 0) + 1

    # Sort by count desc, then alphabetically
    sorted_techs = sorted(
        tech_counts.items(),
        key=lambda x: (-x[1], x[0].lower()),
    )
    return [{"name": name, "count": count} for name, count in sorted_techs]
