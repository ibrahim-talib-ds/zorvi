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


def test_provider_retry_delay_uses_short_retry_after():
    response = ai_build.httpx.Response(429, headers={"Retry-After": "5"})
    assert ai_build._provider_retry_delay(response, 0) == 5.0


def test_provider_retry_delay_skips_long_quota_windows():
    response = ai_build.httpx.Response(429, headers={"Retry-After": "3600"})
    assert ai_build._provider_retry_delay(response, 0) is None


def test_provider_retry_delay_uses_bounded_backoff_without_header():
    response = ai_build.httpx.Response(503)
    assert ai_build._provider_retry_delay(response, 0) == 1.0
    assert ai_build._provider_retry_delay(response, 1) == 2.0


def test_groq_json_generation_error_is_detected_for_failed_generation():
    response = ai_build.httpx.Response(400, json={"error": {"message": "Failed to generate JSON. See failed_generation."}})
    assert ai_build._is_json_generation_error(response) is True


def test_non_json_provider_error_does_not_trigger_output_fallback():
    response = ai_build.httpx.Response(400, json={"error": {"message": "Invalid model name"}})
    assert ai_build._is_json_generation_error(response) is False


def test_openrouter_free_model_is_configured_and_reported_free(monkeypatch):
    settings = SimpleNamespace(
        AI_PROVIDER="openai-compatible",
        AI_API_KEY="test-key",
        AI_BASE_URL="https://openrouter.ai/api/v1",
        AI_MODEL="baidu/ernie-5.5-flash-preview:free",
    )
    monkeypatch.setattr(ai_build, "get_settings", lambda: settings)
    base_url, api_key, model, bearer = ai_build._provider_config()
    assert base_url == "https://openrouter.ai/api/v1"
    assert api_key == "test-key"
    assert model == "particle-ai/particle-1:free"
    assert bearer is True
    status = ai_build._provider_status()
    assert status["configured"] is True
    assert status["model"] == "particle-ai/particle-1:free"
    assert status["free_tier"] is True


def test_openrouter_keeps_other_explicit_free_models(monkeypatch):
    settings = SimpleNamespace(
        AI_PROVIDER="openai-compatible",
        AI_API_KEY="test-key",
        AI_BASE_URL="https://openrouter.ai/api/v1",
        AI_MODEL="inclusionai/ling-3.2-flash:free",
    )
    monkeypatch.setattr(ai_build, "get_settings", lambda: settings)
    _, _, model, _ = ai_build._provider_config()
    assert model == "inclusionai/ling-3.2-flash:free"


def test_ernie_is_replaced_only_for_openrouter():
    assert ai_build._effective_openrouter_model(
        "https://openrouter.ai/api/v1", "baidu/ernie-5.5-flash-preview:free"
    ) == "particle-ai/particle-1:free"
    assert ai_build._effective_openrouter_model(
        "https://api.groq.com/openai/v1", "baidu/ernie-5.5-flash-preview:free"
    ) == "baidu/ernie-5.5-flash-preview:free"


def test_openrouter_fallback_chain_contains_only_other_free_models():
    fallbacks = ai_build._openrouter_fallback_models(
        "https://openrouter.ai/api/v1", "particle-ai/particle-1:free"
    )
    assert fallbacks == [
        "inclusionai/ling-3.2-flash:free",
        "nvidia/nemotron-3.5-super-vl:free",
    ]
    assert all(model.endswith(":free") for model in fallbacks)
    assert ai_build._openrouter_fallback_models(
        "https://api.groq.com/openai/v1", "openai/gpt-oss-120b"
    ) == []


def test_openrouter_rejects_non_free_model(monkeypatch):
    settings = SimpleNamespace(
        AI_PROVIDER="openai-compatible",
        AI_API_KEY="test-key",
        AI_BASE_URL="https://openrouter.ai/api/v1",
        AI_MODEL="some/provider-paid-model",
    )
    monkeypatch.setattr(ai_build, "get_settings", lambda: settings)
    with pytest.raises(HTTPException) as error:
        ai_build._provider_config()
    assert error.value.status_code == 503
    assert "restricted to explicitly free models" in error.value.detail


def test_extract_chat_content_supports_text_part_arrays():
    assert ai_build._extract_chat_content({
        "choices": [{"message": {"content": [{"type": "text", "text": "{\"ok\":"}, {"type": "text", "text": " true}"}]}}]
    }) == '{"ok": true}'


def test_extract_chat_content_rejects_missing_or_blank_text():
    assert ai_build._extract_chat_content({"choices": [{"message": {"content": None}}]}) is None
    assert ai_build._extract_chat_content({"choices": [{"message": {"content": "  "}}]}) is None
    assert ai_build._extract_chat_content({"choices": []}) is None


@pytest.mark.asyncio(loop_scope="session")
async def test_openrouter_retries_empty_content_without_json_mode(monkeypatch):
    settings = SimpleNamespace(
        AI_PROVIDER="openai-compatible",
        AI_API_KEY="test-key",
        AI_BASE_URL="https://openrouter.ai/api/v1",
        AI_MODEL="baidu/ernie-5.5-flash-preview:free",
        AI_REQUEST_TIMEOUT_SECONDS=10,
    )
    monkeypatch.setattr(ai_build, "get_settings", lambda: settings)

    class FakeResponse:
        status_code = 200
        headers = {}

        def __init__(self, payload):
            self.payload = payload

        def json(self):
            return self.payload

    class FakeAsyncClient:
        requests = []
        responses = [
            FakeResponse({"choices": [{"finish_reason": "length", "message": {"role": "assistant", "content": None, "reasoning": "internal reasoning"}}], "usage": {"completion_tokens": 10000, "completion_tokens_details": {"reasoning_tokens": 9999}}}),
            FakeResponse({"choices": [{"finish_reason": "stop", "message": {"role": "assistant", "content": '{"ok": true}'}}]}),
        ]

        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, url, headers, json):
            self.requests.append(json)
            return self.responses.pop(0)

    monkeypatch.setattr(ai_build.httpx, "AsyncClient", FakeAsyncClient)
    result = await ai_build._ask_model("Return JSON", {"prompt": "test"}, max_tokens=42)

    assert result == {"ok": True}
    assert len(FakeAsyncClient.requests) == 2
    assert FakeAsyncClient.requests[0]["model"] == "particle-ai/particle-1:free"
    assert FakeAsyncClient.requests[0]["models"] == [
        "inclusionai/ling-3.2-flash:free", "nvidia/nemotron-3.5-super-vl:free"
    ]
    assert FakeAsyncClient.requests[0]["response_format"] == {"type": "json_object"}
    assert FakeAsyncClient.requests[0]["reasoning"] == {"effort": "none"}
    assert FakeAsyncClient.requests[1]["model"] == "particle-ai/particle-1:free"
    assert "response_format" not in FakeAsyncClient.requests[1]
    assert FakeAsyncClient.requests[1]["max_tokens"] == 42
    assert FakeAsyncClient.requests[1]["models"] == [
        "inclusionai/ling-3.2-flash:free", "nvidia/nemotron-3.5-super-vl:free"
    ]
    assert FakeAsyncClient.requests[1]["reasoning"] == {"effort": "none"}


@pytest.mark.asyncio(loop_scope="session")
async def test_openrouter_quota_429_without_retry_after_is_not_retried(monkeypatch):
    settings = SimpleNamespace(
        AI_PROVIDER="openai-compatible",
        AI_API_KEY="test-key",
        AI_BASE_URL="https://openrouter.ai/api/v1",
        AI_MODEL="baidu/ernie-5.5-flash-preview:free",
        AI_REQUEST_TIMEOUT_SECONDS=10,
    )
    monkeypatch.setattr(ai_build, "get_settings", lambda: settings)

    class FakeResponse:
        status_code = 429
        headers = {}

        def json(self):
            return {"error": {"message": "Free model daily limit reached"}}

    class FakeAsyncClient:
        request_count = 0

        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, url, headers, json):
            type(self).request_count += 1
            return FakeResponse()

    monkeypatch.setattr(ai_build.httpx, "AsyncClient", FakeAsyncClient)
    with pytest.raises(HTTPException) as error:
        await ai_build._ask_model("Return JSON", {"prompt": "test"})

    assert error.value.status_code == 429
    assert "no paid model was used" in error.value.detail.lower()
    assert FakeAsyncClient.request_count == 1


@pytest.mark.asyncio(loop_scope="session")
async def test_create_build_plan_repairs_schema_invalid_model_response(monkeypatch):
    invalid_plan = {"project_name": "Student Portal"}
    valid_plan = {
        "project_name": "Student Portal",
        "summary": "A portal for managing student attendance and records.",
        "app_type": "web",
        "stack": {
            "frontend": "React",
            "backend": "Python FastAPI",
            "database": "PostgreSQL",
            "languages": ["TypeScript", "Python"],
            "rationale": "A maintainable full-stack choice for the requested portal.",
        },
        "architecture": ["React client", "FastAPI service", "PostgreSQL database"],
        "questions": [],
        "steps": [
            {"id": "step-1", "title": "Foundation", "objective": "Create the project foundation.", "acceptance_criteria": ["The app starts locally."]},
            {"id": "step-2", "title": "Student records", "objective": "Add student record management.", "acceptance_criteria": ["Users can create and view records."]},
        ],
        "limitations": ["Production deployment requires external hosting configuration."],
    }
    calls = []

    async def fake_ask_model(system_prompt, user_payload, max_tokens=9000, response_model=None):
        calls.append((system_prompt, user_payload, response_model))
        return invalid_plan if len(calls) == 1 else valid_plan

    monkeypatch.setattr(ai_build, "_ask_model", fake_ask_model)
    request = ai_build.BuildPlanRequest(prompt="Build a student attendance web portal")

    plan = await ai_build.create_build_plan(request, user=None)

    assert plan.project_name == "Student Portal"
    assert len(plan.steps) == 2
    assert len(calls) == 2
    assert calls[1][2] is BuildPlan
    assert calls[1][1]["invalid_plan"] == invalid_plan
    assert calls[1][1]["validation_errors"]
