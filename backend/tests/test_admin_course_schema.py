"""Validation tests for the admin course metadata contract."""
import pytest
from pydantic import ValidationError

from app.models.course import CourseDifficulty
from app.schemas.admin_course import CourseCreate, CourseUpdate


def test_beginner_to_intermediate_is_a_supported_course_level():
    payload = CourseCreate(
        title="Web Development and Application Engineering",
        short_description="Build responsive web applications in ibrant Studio.",
        difficulty="beginner_to_intermediate",
        duration_weeks=12,
        estimated_hours=120,
    )

    assert payload.difficulty is CourseDifficulty.beginner_to_intermediate
    assert payload.duration_weeks == 12


def test_course_duration_weeks_is_bounded():
    with pytest.raises(ValidationError):
        CourseCreate(
            title="A course title",
            short_description="A sufficiently long course description.",
            duration_weeks=261,
        )


def test_course_duration_can_be_updated():
    payload = CourseUpdate(duration_weeks=12)
    assert payload.model_dump(exclude_unset=True) == {"duration_weeks": 12}
