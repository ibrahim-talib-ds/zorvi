"""ZORVI — Admin course management."""
import re
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models.course import Course, CourseStatus
from app.models.course_module import CourseModule
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.admin_course import (
    AdminCourseRead,
    AdminLessonRead,
    AdminModuleRead,
    CourseCreate,
    CourseUpdate,
    LessonCreate,
    LessonUpdate,
    ModuleCreate,
    ModuleUpdate,
)

router = APIRouter(
    prefix="/admin",
    tags=["admin:courses"],
    dependencies=[Depends(require_role("admin", "super_admin"))],
)


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "course"


async def _unique_course_slug(db: AsyncSession, base: str) -> str:
    slug = base
    i = 1
    while True:
        existing = await db.execute(
            select(Course).where(
                Course.slug == slug, Course.deleted_at.is_(None)
            )
        )
        if existing.scalar_one_or_none() is None:
            return slug
        i += 1
        slug = f"{base}-{i}"


# ---------- Courses ----------

@router.post("/courses", response_model=AdminCourseRead, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> AdminCourseRead:
    slug = payload.slug or await _unique_course_slug(db, _slugify(payload.title))
    if payload.slug:
        existing = await db.execute(
            select(Course).where(Course.slug == slug, Course.deleted_at.is_(None))
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="slug already in use")

    course = Course(
        title=payload.title,
        slug=slug,
        short_description=payload.short_description,
        long_description=payload.long_description,
        thumbnail_url=payload.thumbnail_url,
        instructor_id=user.id,
        category_id=payload.category_id,
        difficulty=payload.difficulty,
        technologies=payload.technologies,
        prerequisites=payload.prerequisites,
        learning_path=payload.learning_path,
        estimated_hours=payload.estimated_hours,
        is_featured=payload.is_featured,
        status=CourseStatus.draft,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return AdminCourseRead.model_validate(course)


@router.get("/courses", response_model=list[AdminCourseRead])
async def list_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
    status_filter: CourseStatus | None = None,
) -> list[AdminCourseRead]:
    stmt = (
        select(Course)
        .where(Course.deleted_at.is_(None))
        .order_by(Course.created_at.desc())
    )
    if status_filter is not None:
        stmt = stmt.where(Course.status == status_filter)
    result = await db.execute(stmt)
    return [AdminCourseRead.model_validate(c) for c in result.scalars().all()]


@router.get("/courses/{course_id}", response_model=AdminCourseRead)
async def get_course(
    course_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> AdminCourseRead:
    course = await db.get(Course, course_id)
    if course is None or course.deleted_at is not None:
        raise HTTPException(status_code=404, detail="course not found")
    return AdminCourseRead.model_validate(course)


@router.patch("/courses/{course_id}", response_model=AdminCourseRead)
async def update_course(
    course_id: uuid.UUID,
    payload: CourseUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> AdminCourseRead:
    course = await db.get(Course, course_id)
    if course is None or course.deleted_at is not None:
        raise HTTPException(status_code=404, detail="course not found")

    data = payload.model_dump(exclude_unset=True)
    new_status = data.pop("status", None)
    for field, value in data.items():
        setattr(course, field, value)
    if new_status is not None:
        course.status = new_status
        if new_status == CourseStatus.published and course.published_at is None:
            course.published_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(course)
    return AdminCourseRead.model_validate(course)


# ---------- Modules ----------

@router.post("/courses/{course_id}/modules", response_model=AdminModuleRead, status_code=201)
async def create_module(
    course_id: uuid.UUID,
    payload: ModuleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> AdminModuleRead:
    course = await db.get(Course, course_id)
    if course is None or course.deleted_at is not None:
        raise HTTPException(status_code=404, detail="course not found")

    module = CourseModule(
        course_id=course_id,
        title=payload.title,
        description=payload.description,
        sort_order=payload.sort_order,
    )
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return AdminModuleRead.model_validate(module)


@router.patch("/modules/{module_id}", response_model=AdminModuleRead)
async def update_module(
    module_id: uuid.UUID,
    payload: ModuleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> AdminModuleRead:
    module = await db.get(CourseModule, module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="module not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(module, field, value)
    await db.commit()
    await db.refresh(module)
    return AdminModuleRead.model_validate(module)


@router.delete("/modules/{module_id}", status_code=204)
async def delete_module(
    module_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> None:
    module = await db.get(CourseModule, module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="module not found")
    await db.delete(module)
    await db.commit()


# ---------- Lessons ----------

@router.post("/modules/{module_id}/lessons", response_model=AdminLessonRead, status_code=201)
async def create_lesson(
    module_id: uuid.UUID,
    payload: LessonCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> AdminLessonRead:
    module = await db.get(CourseModule, module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="module not found")

    lesson = Lesson(
        module_id=module_id,
        title=payload.title,
        description=payload.description,
        video_provider=payload.video_provider,
        video_url=payload.video_url,
        video_file_key=payload.video_file_key,
        content_markdown=payload.content_markdown,
        code_example=payload.code_example,
        exercise=payload.exercise,
        duration_minutes=payload.duration_minutes,
        sort_order=payload.sort_order,
        is_free_preview=payload.is_free_preview,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return AdminLessonRead.model_validate(lesson)


@router.patch("/lessons/{lesson_id}", response_model=AdminLessonRead)
async def update_lesson(
    lesson_id: uuid.UUID,
    payload: LessonUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> AdminLessonRead:
    lesson = await db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="lesson not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)
    await db.commit()
    await db.refresh(lesson)
    return AdminLessonRead.model_validate(lesson)


@router.delete("/lessons/{lesson_id}", status_code=204)
async def delete_lesson(
    lesson_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> None:
    lesson = await db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="lesson not found")
    await db.delete(lesson)
    await db.commit()
