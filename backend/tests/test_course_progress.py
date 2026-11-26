"""Regression tests for enrollment, lesson completion, next-lesson and certificates."""
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import delete, select

from app.api.v1.courses import complete_lesson, get_progress, list_my_courses
from app.models.certificate import Certificate
from app.models.course import Course, CourseDifficulty, CourseStatus
from app.models.course_module import CourseModule
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson, VideoProvider
from app.models.lesson_progress import LessonProgress
from app.models.user import User


@pytest.mark.asyncio(loop_scope="session")
async def test_course_progress_next_lesson_and_certificate(async_session):
    db = async_session
    suffix = uuid.uuid4().hex
    user = User(
        email=f"course-progress-{suffix}@zorvi.local",
        password_hash="test-only-hash",
        full_name="Course Progress Test",
    )
    db.add(user)
    await db.flush()

    course = Course(
        title="Progress Regression Course",
        slug=f"progress-regression-{suffix}",
        short_description="Temporary course for progress regression tests.",
        instructor_id=user.id,
        difficulty=CourseDifficulty.beginner,
        status=CourseStatus.published,
        published_at=datetime.now(timezone.utc),
    )
    db.add(course)
    await db.flush()

    module = CourseModule(
        course_id=course.id,
        title="Progress Module",
        sort_order=0,
    )
    db.add(module)
    await db.flush()

    first = Lesson(
        module_id=module.id,
        title="First test lesson",
        video_provider=VideoProvider.none,
        duration_minutes=3,
        sort_order=0,
    )
    second = Lesson(
        module_id=module.id,
        title="Second test lesson",
        video_provider=VideoProvider.none,
        duration_minutes=3,
        sort_order=1,
    )
    db.add_all([first, second])
    await db.flush()

    enrollment = Enrollment(user_id=user.id, course_id=course.id)
    db.add(enrollment)
    await db.commit()

    user_id, course_id, module_id = user.id, course.id, module.id
    first_id, second_id = first.id, second.id
    slug = course.slug

    try:
        initial = await get_progress(slug, db, user)
        assert initial.completed_lessons == 0
        assert initial.completed_lesson_ids == []
        assert initial.is_complete is False

        first_result = await complete_lesson(slug, first_id, db, user)
        assert first_result.completed_lessons == 1
        assert first_result.percent_complete == 50.0
        assert first_result.course_complete is False

        progress = await get_progress(slug, db, user)
        assert progress.completed_lesson_ids == [first_id]
        assert progress.certificate_available is False

        my_courses = await list_my_courses(db, user)
        assert len(my_courses) == 1
        assert my_courses[0].next_lesson_id == second_id
        assert my_courses[0].percent_complete == 50.0

        final_result = await complete_lesson(slug, second_id, db, user)
        assert final_result.course_complete is True
        assert final_result.completed_lessons == 2
        assert final_result.certificate_code

        finished = await get_progress(slug, db, user)
        assert finished.is_complete is True
        assert finished.certificate_available is True
        assert finished.certificate_code == final_result.certificate_code
        assert set(finished.completed_lesson_ids) == {first_id, second_id}

        repeat_result = await complete_lesson(slug, second_id, db, user)
        assert repeat_result.course_complete is True
        assert repeat_result.certificate_code == final_result.certificate_code
    finally:
        await db.rollback()
        await db.execute(
            delete(Certificate).where(
                Certificate.user_id == user_id,
                Certificate.course_id == course_id,
            )
        )
        await db.execute(
            delete(LessonProgress).where(
                LessonProgress.user_id == user_id,
                LessonProgress.lesson_id.in_([first_id, second_id]),
            )
        )
        await db.execute(
            delete(Enrollment).where(
                Enrollment.user_id == user_id,
                Enrollment.course_id == course_id,
            )
        )
        await db.execute(delete(Lesson).where(Lesson.module_id == module_id))
        await db.execute(delete(CourseModule).where(CourseModule.id == module_id))
        await db.execute(delete(Course).where(Course.id == course_id))
        await db.execute(delete(User).where(User.id == user_id))
        await db.commit()
