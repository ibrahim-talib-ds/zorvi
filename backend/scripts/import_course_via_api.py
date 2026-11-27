#!/usr/bin/env python3
"""Idempotently add/update selected lessons through the authenticated admin API.

Dry-run is the default. This script never creates a new course and never publishes one.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
LESSON_FIELDS = (
    "description", "content_markdown", "code_example", "code_language",
    "exercise", "practical_examples", "practice_questions", "duration_minutes",
)


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().casefold()


def request_json(base: str, token: str, path: str, method: str = "GET", payload=None):
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = Request(base.rstrip("/") + path, data=body, headers=headers, method=method)
    try:
        with urlopen(req, timeout=25) as response:
            raw = response.read()
            return json.loads(raw.decode("utf-8")) if raw else None
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed with HTTP {exc.code}: {detail[:1000]}") from exc
    except URLError as exc:
        raise RuntimeError(f"Cannot reach the configured API at {base}: {exc.reason}") from exc


def load_manifest(path: Path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Cannot read valid JSON manifest: {exc}") from exc
    course = data.get("course")
    modules = data.get("modules")
    if not isinstance(course, dict) or not course.get("slug") or not isinstance(modules, list) or not modules:
        raise SystemExit("Manifest must contain course.slug and a non-empty modules array.")
    for module in modules:
        if not isinstance(module.get("title"), str) or not isinstance(module.get("lessons"), list):
            raise SystemExit("Every module needs a title and lessons array.")
        for lesson in module["lessons"]:
            for field in ("title", "description", "content_markdown", "exercise"):
                if not isinstance(lesson.get(field), str) or not lesson[field].strip():
                    raise SystemExit(f"Lesson is missing required field {field!r}.")
            if lesson["exercise"].count("--- QUESTION ---") != 1 or lesson["exercise"].count("--- SOLUTION ---") != 1:
                raise SystemExit(f"Exercise delimiters are invalid in {lesson['title']!r}.")
            for field in ("practical_examples", "practice_questions"):
                if not isinstance(lesson.get(field, []), list):
                    raise SystemExit(f"{field} must be an array in {lesson['title']!r}.")
    return data


def unique_map(items, label):
    result = {}
    for item in items:
        key = normalize(item["title"])
        if key in result:
            raise SystemExit(f"Duplicate {label} title in the existing course: {item['title']!r}")
        result[key] = item
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", nargs="?", type=Path,
                        default=ROOT / "course-content/web-development-modules-3-to-5.json")
    parser.add_argument("--apply", action="store_true", help="Perform API writes; otherwise only show the plan.")
    parser.add_argument("--allow-published", action="store_true",
                        help="Explicitly allow lesson updates when the existing course is published.")
    parser.add_argument("--backup-dir", type=Path, default=ROOT / "backend/course-import-backups")
    args = parser.parse_args()

    base = os.getenv("IBRANT_API_BASE", "").strip()
    token = os.getenv("IBRANT_ADMIN_TOKEN", "").strip()
    if not base or not token:
        raise SystemExit("Set IBRANT_API_BASE (including /api/v1) and IBRANT_ADMIN_TOKEN. No request was sent.")

    data = load_manifest(args.manifest)
    slug = data["course"]["slug"]
    courses = request_json(base, token, "/admin/courses")
    matches = [course for course in courses if course.get("slug") == slug]
    if len(matches) != 1:
        raise SystemExit(f"Expected exactly one course with slug {slug!r}; found {len(matches)}. No writes made.")
    course = request_json(base, token, f"/admin/courses/{matches[0]['id']}")
    if course.get("status") == "published" and not args.allow_published:
        raise SystemExit("Course is currently published. Re-run with --allow-published only after approving a live content update.")
    if course.get("status") == "archived":
        raise SystemExit("Course is archived. No writes made.")

    modules = unique_map(course.get("modules") or [], "module")
    plan = []
    backups = []
    for module_index, module_spec in enumerate(data["modules"], start=2):
        module = modules.get(normalize(module_spec["title"]))
        existing_lessons = unique_map((module or {}).get("lessons") or [], "lesson")
        plan.append({
            "module_spec": module_spec,
            "module": module,
            "module_sort_order": module_index,
            "lessons": [
                (lesson_spec, existing_lessons.get(normalize(lesson_spec["title"])), lesson_index)
                for lesson_index, lesson_spec in enumerate(module_spec["lessons"])
            ],
        })
        for lesson_spec, existing, _ in plan[-1]["lessons"]:
            if existing:
                backups.append({
                    "lesson_id": existing["id"],
                    "module_id": existing["module_id"],
                    "title": existing["title"],
                    "old_values": {field: existing.get(field) for field in LESSON_FIELDS},
                })

    print(f"Course: {course['title']} ({slug}) — status: {course.get('status')}")
    print("Planned modules:", len(plan))
    creates = updates = 0
    for item in plan:
        module_spec = item["module_spec"]
        print(f"  {'USE' if item['module'] else 'CREATE'} module: {module_spec['title']}")
        for lesson_spec, existing, _ in item["lessons"]:
            if existing:
                updates += 1
                print(f"    UPDATE lesson: {lesson_spec['title']}")
            else:
                creates += 1
                print(f"    CREATE lesson: {lesson_spec['title']}")
    print(f"Lesson operations: {creates} create, {updates} update.")
    if not args.apply:
        print("DRY RUN — no data was changed. Add --apply to perform the planned operations.")
        return

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = args.backup_dir / f"api-course-{slug}-{timestamp}.json"
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    temp = backup_path.with_suffix(".json.tmp")
    temp.write_text(json.dumps({
        "created_at": timestamp,
        "course": {"id": course["id"], "title": course["title"], "slug": slug, "status": course.get("status")},
        "records": backups,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(backup_path)
    print(f"Backup saved: {backup_path}")

    for item in plan:
        module_spec = item["module_spec"]
        module = item["module"]
        if module is None:
            module = request_json(base, token, f"/admin/courses/{course['id']}/modules", "POST", {
                "title": module_spec["title"],
                "description": module_spec.get("description", ""),
                "sort_order": item["module_sort_order"],
            })
        elif module_spec.get("description") and module.get("description") != module_spec["description"]:
            request_json(base, token, f"/admin/modules/{module['id']}", "PATCH", {
                "description": module_spec["description"]
            })

        existing_lessons = unique_map(module.get("lessons") or [], "lesson")
        for lesson_spec, _, lesson_index in item["lessons"]:
            payload = {field: lesson_spec[field] for field in LESSON_FIELDS if field in lesson_spec}
            if "code_language" not in payload:
                payload["code_language"] = "text"
            payload["sort_order"] = lesson_index
            if lesson_spec["title"] and normalize(lesson_spec["title"]) in existing_lessons:
                lesson = existing_lessons[normalize(lesson_spec["title"])]
                request_json(base, token, f"/admin/lessons/{lesson['id']}", "PATCH", payload)
            else:
                payload["title"] = lesson_spec["title"]
                payload["is_free_preview"] = False
                request_json(base, token, f"/admin/modules/{module['id']}/lessons", "POST", payload)

    verified = request_json(base, token, f"/admin/courses/{course['id']}")
    verified_modules = unique_map(verified.get("modules") or [], "module")
    for module_spec in data["modules"]:
        found = verified_modules.get(normalize(module_spec["title"]))
        if found is None or len(found.get("lessons") or []) != len(module_spec["lessons"]):
            raise SystemExit(f"Post-write verification failed for module {module_spec['title']!r}.")
    print("SUCCESS — selected modules and lessons verified.")
    print(f"Course status remains: {verified.get('status')}. This script never publishes the course.")


if __name__ == "__main__":
    main()
