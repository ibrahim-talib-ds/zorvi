import json

from app.api.v1.courses import _student_safe_exercise


def test_student_lesson_payload_does_not_expose_exercise_answer_key():
    encoded = "IBRANT_EXERCISE_V1:" + json.dumps({
        "version": 1,
        "type": "multiple_choice",
        "title": "Check your understanding",
        "instructions": "Choose one answer.",
        "options": ["A", "B"],
        "expected_answer": "B",
    })

    result = _student_safe_exercise(encoded)

    assert result is not None
    config = json.loads(result.removeprefix("IBRANT_EXERCISE_V1:"))
    assert config["options"] == ["A", "B"]
    assert "expected_answer" not in config


def test_legacy_plain_text_exercises_are_preserved():
    legacy = "Write a short explanation of the website."

    assert _student_safe_exercise(legacy) == legacy
