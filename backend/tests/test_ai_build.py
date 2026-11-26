"""Fast unit tests for IBRANT's AI response boundary."""
import pytest
from fastapi import HTTPException

from app.api.v1.ai_build import (
    MAX_MODEL_CONTEXT_TOTAL_BYTES,
    _groq_strict_schema,
    _normalize_build_plan_data,
    _parse_json_content,
    _select_project_file_context,
)
from app.schemas.ai_build import BuildPlan, BuildStepResult
from app.schemas.user_project import ProjectFile


def test_parse_json_from_plain_response():
    assert _parse_json_content('{"ok": true, "files": []}') == {"ok": True, "files": []}


def test_normalize_plan_step_scalar_fields():
    normalized = _normalize_build_plan_data({
        "steps": [
            {"id": 1, "acceptance_criteria": "Student can be added"},
            {"id": 2, "acceptance_criteria": ["List loads"]},
            {"acceptance_criteria": None},
        ]
    })
    assert normalized["steps"][0]["id"] == "1"
    assert normalized["steps"][0]["acceptance_criteria"] == ["Student can be added"]
    assert normalized["steps"][1]["acceptance_criteria"] == ["List loads"]
    assert normalized["steps"][2]["id"] == "step-3"
    assert normalized["steps"][2]["acceptance_criteria"] == []


def test_parse_json_from_markdown_fence():
    assert _parse_json_content('```json\n{"ok": true}\n```') == {"ok": True}


def test_parse_json_rejects_non_json_content():
    with pytest.raises(HTTPException) as error:
        _parse_json_content("I cannot return JSON")
    assert error.value.status_code == 502


def test_generated_project_file_rejects_secrets_and_path_traversal():
    for path in ("../outside.txt", ".env", ".ENV.production", "keys/id_rsa", "certs/private.pem"):
        with pytest.raises(ValueError):
            ProjectFile(path=path, content="not-a-secret")


def test_build_plan_requires_reviewable_ordered_steps():
    plan = BuildPlan.model_validate({
        "project_name": "Student Portal",
        "summary": "An attendance application.",
        "app_type": "full_stack",
        "stack": {"frontend": "React", "backend": "FastAPI", "database": "PostgreSQL", "languages": ["TypeScript", "Python"], "rationale": "Fits the requirements."},
        "architecture": ["React client", "FastAPI service", "PostgreSQL database"],
        "questions": [],
        "steps": [
            {"id": "01", "title": "Foundation", "objective": "Create the source layout."},
            {"id": "02", "title": "API", "objective": "Create the first API module."},
        ],
        "limitations": ["Database must be configured externally."],
    })
    assert [step.title for step in plan.steps] == ["Foundation", "API"]


def test_build_step_requires_at_least_one_complete_file():
    result = BuildStepResult.model_validate({"summary": "Adds a page.", "files": [{"path": "index.html", "content": "<!doctype html>"}]})
    assert result.files[0].path == "index.html"

from types import SimpleNamespace

from app.api.v1 import ai_build
from app.models.build_task import BuildTask


def test_gemini_free_first_provider_defaults(monkeypatch):
    settings = SimpleNamespace(
        AI_PROVIDER="gemini",
        AI_API_KEY="test-key",
        AI_BASE_URL=None,
        AI_MODEL=None,
        AI_REQUEST_TIMEOUT_SECONDS=10,
    )
    monkeypatch.setattr(ai_build, "get_settings", lambda: settings)
    base_url, api_key, model, bearer = ai_build._provider_config()
    assert base_url == "https://generativelanguage.googleapis.com/v1beta/openai"
    assert api_key == "test-key"
    assert model == "gemini-3.8-flash"
    assert bearer is True


def test_gemini_provider_requires_backend_key(monkeypatch):
    settings = SimpleNamespace(AI_PROVIDER="gemini", AI_API_KEY=None, AI_BASE_URL=None, AI_MODEL=None)
    monkeypatch.setattr(ai_build, "get_settings", lambda: settings)
    with pytest.raises(HTTPException) as error:
        ai_build._provider_config()
    assert error.value.status_code == 503


def test_ollama_local_provider_needs_no_api_key(monkeypatch):
    settings = SimpleNamespace(AI_PROVIDER="ollama", AI_API_KEY=None, AI_BASE_URL=None, AI_MODEL=None)
    monkeypatch.setattr(ai_build, "get_settings", lambda: settings)
    base_url, api_key, model, bearer = ai_build._provider_config()
    assert base_url == "http://127.0.0.1:11434/v1"
    assert api_key == ""
    assert model == "qwen2.5-coder:7b"
    assert bearer is False


def test_merge_replaces_existing_files_without_counting_twice():
    merged = ai_build._merge_files(
        [{"path": "index.html", "content": "old"}, {"path": "README.md", "content": "notes"}],
        [ProjectFile(path="index.html", content="new"), ProjectFile(path="app.js", content="run();")],
    )
    by_path = {item["path"]: item["content"] for item in merged}
    assert by_path == {"index.html": "new", "README.md": "notes", "app.js": "run();"}


def test_merge_enforces_project_file_limit():
    existing = [{"path": f"file-{index}.txt", "content": "x"} for index in range(50)]
    with pytest.raises(HTTPException) as error:
        ai_build._merge_files(existing, [ProjectFile(path="extra.txt", content="x")])
    assert error.value.status_code == 413


def test_build_task_is_registered_in_model_metadata():
    assert BuildTask.__tablename__ == "build_tasks"
    assert "build_tasks" in BuildTask.metadata.tables


def test_task_timeline_can_keep_the_completed_step_index():
    task = BuildTask(current_step_index=2, events=[])
    ai_build._append_event(task, "step_applied", "Finished step two", "success", step_index_override=1)
    assert task.events[0]["step_index"] == 1


def test_project_file_context_is_bounded_and_utf8_safe():
    files = [
        {"path": f"src/file-{index}.txt", "content": "é" * 7000}
        for index in range(20)
    ]
    selected, used_bytes, truncated = _select_project_file_context(files)

    assert used_bytes <= MAX_MODEL_CONTEXT_TOTAL_BYTES
    assert used_bytes == sum(len(item["content"].encode("utf-8")) for item in selected)
    assert truncated is True
    assert len(selected) < len(files)
    assert all(item["content"].encode("utf-8").decode("utf-8") == item["content"] for item in selected)


def test_groq_strict_schema_requires_all_fields_without_extra_properties():
    for model in (BuildPlan, BuildStepResult):
        schema = _groq_strict_schema(model)

        def assert_strict(node):
            if isinstance(node, dict):
                if node.get("type") == "object":
                    properties = node.get("properties", {})
                    assert node.get("additionalProperties") is False
                    assert set(node.get("required", [])) == set(properties)
                for value in node.values():
                    assert_strict(value)
            elif isinstance(node, list):
                for value in node:
                    assert_strict(value)

        assert_strict(schema)

    step_schema = _groq_strict_schema(BuildPlan)["$defs"]["BuildPlanStep"]
    assert "title" in step_schema["properties"]
