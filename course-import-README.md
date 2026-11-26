# ZORVI safe course importer

This tool updates content on **existing** ZORVI lessons. It does not create/delete courses,
modules, or lessons.

## Safety rules

- Exact course slug/title match is required.
- Every module and lesson title must match after whitespace/case normalization.
- Module and lesson counts must match exactly.
- Ambiguous or missing matches stop the import.
- The first version only allows writes when `ENVIRONMENT=development`.
- A JSON backup of the existing lesson content is written before the database commit.
- It preserves course/module/lesson IDs, titles, video URLs/providers, sort order,
  preview flags, and student progress.
- `--check` performs validation and mapping only.
- `--apply` performs the update after backup.

## Install / placement

Copy `scripts/import_course.py` into `backend/scripts/import_course.py`.
The backend virtual environment must already have the dependencies from `backend/requirements.txt`.

## Manifest structure

Use `course-content/course-template.json` as the starting point.

Each lesson must include:
- `title`
- `description`
- `content_markdown`
- `exercise` with exactly one `--- QUESTION ---` and one `--- SOLUTION ---`
- optional `code_example`
- optional `duration_minutes`

The exercise field is text for the existing lesson schema. This importer does not execute SQL.
SQL code examples and exercises are stored as course content only.

## Commands

Run from the repository root:

```bash
cd ~/Projects/zorvi/backend

# 1. Validate the JSON file (does not connect to or change the database)
.venv/bin/python scripts/import_course.py ../course-content/sql-course.json --check

# 2. Validate exact database mapping; no writes
.venv/bin/python scripts/import_course.py ../course-content/sql-course.json

# 3. Back up and apply to the development database only
.venv/bin/python scripts/import_course.py ../course-content/sql-course.json --apply
```

The first command checks the manifest and database mapping; it does not write anything.
Do not point the development environment at production. This first version intentionally
refuses writes unless `ENVIRONMENT=development`.

## Important frontend note

The current lesson exercise UI launches a Python runner for code exercises. This importer
does not pretend that SQL executes in that Python runner. Before publishing SQL coding
exercises, the frontend exercise component should be updated to present SQL tasks as
self-check/reference solutions or connected to a real SQL execution sandbox.
