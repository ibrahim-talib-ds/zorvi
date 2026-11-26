#!/usr/bin/env python3
"""Safely update existing ZORVI course lesson content from a JSON manifest.

This importer never creates or deletes courses, modules, or lessons.
It matches by exact course slug/title and normalized module/lesson titles.
It only updates the explicitly supported lesson content fields.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.core.database import AsyncSessionLocal  # noqa: E402
from app.models.course import Course  # noqa: E402
from app.models.course_module import CourseModule  # noqa: E402
from app.models.lesson import Lesson  # noqa: E402

LESSON_FIELDS = (
    "description",
    "content_markdown",
    "code_example",
    "exercise",
    "duration_minutes",
)
REQUIRED_LESSON_FIELDS = ("description", "content_markdown", "exercise")


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().casefold()


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def load_manifest(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"Manifest not found: {path}")
    except json.JSONDecodeError as exc:
        fail(f"Invalid JSON at line {exc.lineno}, column {exc.colno}: {exc.msg}")

    if not isinstance(data, dict):
        fail("The manifest root must be a JSON object.")
    course = data.get("course")
    modules = data.get("modules")
    if not isinstance(course, dict) or not isinstance(modules, list) or not modules:
        fail("Manifest must contain a course object and a non-empty modules array.")

    if not (course.get("slug") or course.get("title")):
        fail("Set course.slug or course.title for exact course identification.")

    module_names: set[str] = set()
    lesson_total = 0
    for mi, module in enumerate(modules, start=1):
        if not isinstance(module, dict) or not isinstance(module.get("title"), str):
            fail(f"Module #{mi} must have a title.")
        key = normalize(module["title"])
        if key in module_names:
            fail(f"Duplicate module title in manifest: {module['title']!r}")
        module_names.add(key)

        lessons = module.get("lessons")
        if not isinstance(lessons, list) or not lessons:
            fail(f"Module {module['title']!r} must contain a non-empty lessons array.")

        lesson_names: set[str] = set()
        for li, lesson in enumerate(lessons, start=1):
            if not isinstance(lesson, dict) or not isinstance(lesson.get("title"), str):
                fail(f"Lesson #{li} in module {module['title']!r} must have a title.")
            lesson_key = normalize(lesson["title"])
            if lesson_key in lesson_names:
                fail(f"Duplicate lesson title in module {module['title']!r}: {lesson['title']!r}")
            lesson_names.add(lesson_key)

            for field in REQUIRED_LESSON_FIELDS:
                value = lesson.get(field)
                if not isinstance(value, str) or not value.strip():
                    fail(
                        f"Lesson {lesson['title']!r} is missing non-empty {field!r}."
                    )
            if not (lesson["exercise"].count("--- QUESTION ---") == 1
                    and lesson["exercise"].count("--- SOLUTION ---") == 1):
                fail(
                    f"Lesson {lesson['title']!r}: exercise must contain exactly one "
                    "'--- QUESTION ---' and one '--- SOLUTION ---' delimiter."
                )
            for field in ("description", "content_markdown", "exercise"):
                if not isinstance(lesson[field], str):
                    fail(f"Lesson {lesson['title']!r}: {field} must be text.")
            if "code_example" in lesson and lesson["code_example"] is not None:
                if not isinstance(lesson["code_example"], str):
                    fail(f"Lesson {lesson['title']!r}: code_example must be text or null.")
            if "duration_minutes" in lesson:
                duration = lesson["duration_minutes"]
                if not isinstance(duration, int) or isinstance(duration, bool) or duration < 0:
                    fail(f"Lesson {lesson['title']!r}: duration_minutes must be a non-negative integer.")
            unknown = set(lesson) - {"title", *LESSON_FIELDS}
            if unknown:
                fail(f"Unsupported fields in lesson {lesson['title']!r}: {sorted(unknown)}")
            lesson_total += 1

    return {"data": data, "lesson_total": lesson_total}


def atomic_write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(path)


async def run(args: argparse.Namespace) -> None:
    settings = get_settings()
    environment = str(settings.ENVIRONMENT).strip().casefold()
    if args.apply and environment != "development":
        fail(
            f"Refusing database writes because ENVIRONMENT={settings.ENVIRONMENT!r}. "
            "This initial importer only permits writes to a development database."
        )

    parsed = urlparse(settings.DATABASE_URL.replace("+asyncpg", ""))
    db_host = parsed.hostname or "(host not parsed)"
    db_name = (parsed.path or "").lstrip("/") or "(database not parsed)"
    print(f"Environment : {settings.ENVIRONMENT}")
    print(f"DB host     : {db_host}")
    print(f"DB name     : {db_name}")

    manifest = load_manifest(args.manifest)
    data = manifest["data"]
    course_spec = data["course"]
    print(f"Manifest    : {args.manifest}")
    print(f"Modules     : {len(data['modules'])}")
    print(f"Lessons     : {manifest['lesson_total']}")

    async with AsyncSessionLocal() as db:
        # Read and validate the entire target structure before changing anything.
        stmt = select(Course).where(Course.deleted_at.is_(None))
        if course_spec.get("slug"):
            stmt = stmt.where(Course.slug == course_spec["slug"])
        else:
            stmt = stmt.where(Course.title == course_spec["title"])
        result = await db.execute(stmt)
        courses = result.scalars().unique().all()

        if len(courses) != 1:
            fail(
                f"Expected exactly one matching course; found {len(courses)}. "
                "No data was changed. Verify course.slug/title in the manifest."
            )
        course = courses[0]
        if course_spec.get("title") and course.title != course_spec["title"]:
            fail(
                f"Slug matched course title {course.title!r}, but manifest expected "
                f"{course_spec['title']!r}. No data was changed."
            )

        db_modules = list(course.modules)
        if len(db_modules) != len(data["modules"]):
            fail(
                f"Module count mismatch: database has {len(db_modules)}, "
                f"manifest has {len(data['modules'])}. No data was changed."
            )

        module_map = {normalize(m.title): m for m in db_modules}
        if len(module_map) != len(db_modules):
            fail("Database contains duplicate normalized module titles; refusing to guess.")

        planned: list[tuple[Lesson, dict[str, Any]]] = []
        seen_module_keys: set[str] = set()

        for module_spec in data["modules"]:
            module_key = normalize(module_spec["title"])
            module = module_map.get(module_key)
            if module is None:
                fail(f"Module not found: {module_spec['title']!r}. No data was changed.")
            seen_module_keys.add(module_key)

            db_lessons = list(module.lessons)
            lesson_map = {normalize(x.title): x for x in db_lessons}
            if len(lesson_map) != len(db_lessons):
                fail(
                    f"Database module {module.title!r} contains duplicate normalized "
                    "lesson titles; refusing to guess."
                )
            if len(db_lessons) != len(module_spec["lessons"]):
                fail(
                    f"Lesson count mismatch in module {module.title!r}: database has "
                    f"{len(db_lessons)}, manifest has {len(module_spec['lessons'])}. "
                    "No data was changed."
                )

            seen_lesson_keys: set[str] = set()
            for lesson_spec in module_spec["lessons"]:
                lesson_key = normalize(lesson_spec["title"])
                lesson = lesson_map.get(lesson_key)
                if lesson is None:
                    fail(
                        f"Lesson not found in {module.title!r}: "
                        f"{lesson_spec['title']!r}. No data was changed."
                    )
                seen_lesson_keys.add(lesson_key)
                planned.append((lesson, lesson_spec))

            if seen_lesson_keys != set(lesson_map):
                fail(f"Lesson mapping incomplete in module {module.title!r}.")

        if seen_module_keys != set(module_map):
            fail("Module mapping incomplete.")

        if len(planned) != manifest["lesson_total"]:
            fail("Internal lesson mapping count mismatch.")

        print(f"Matched     : {course.title!r} ({course.slug})")
        print("Mapping     : PASS — every module and lesson matched exactly.")
        print("Write scope : description, content_markdown, code_example, exercise, duration_minutes")
        print("Protected   : course/module/lesson IDs, titles, videos, sort order, preview flags, progress")

        if not args.apply:
            print("\nDRY RUN ONLY — no database values were changed.")
            print("After reviewing the mapping, run again with --apply to update.")
            return

        backup_dir = args.backup_dir
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup_path = backup_dir / f"course-{course.slug}-{timestamp}.json"
        backup = {
            "created_at": timestamp,
            "course": {"id": str(course.id), "title": course.title, "slug": course.slug},
            "records": [],
        }

        for lesson, lesson_spec in planned:
            old_values = {field: getattr(lesson, field) for field in LESSON_FIELDS}
            backup["records"].append({
                "lesson_id": str(lesson.id),
                "module_id": str(lesson.module_id),
                "title": lesson.title,
                "old_values": old_values,
            })

        # Persist the backup before any DB commit.
        atomic_write_json(backup_path, backup)
        print(f"Backup saved: {backup_path}")

        try:
            for lesson, lesson_spec in planned:
                for field in LESSON_FIELDS:
                    if field in lesson_spec:
                        setattr(lesson, field, lesson_spec[field])
            await db.commit()
        except Exception:
            await db.rollback()
            raise

        print(f"SUCCESS — updated {len(planned)} existing lessons.")
        print("No course, module, or lesson rows were created or deleted.")
        print("Keep the backup file until the updated course has been reviewed.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Safely update existing ZORVI course lesson content."
    )
    parser.add_argument("manifest", type=Path, help="Path to the course JSON manifest.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Validate manifest and database mapping only.")
    mode.add_argument("--apply", action="store_true", help="Back up then update the development database.")
    parser.add_argument(
        "--backup-dir",
        type=Path,
        default=BACKEND_DIR / "course-import-backups",
        help="Directory for pre-update JSON backups.",
    )
    args = parser.parse_args()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
