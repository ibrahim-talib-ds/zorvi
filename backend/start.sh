#!/bin/sh
set -eu

# Prefer the project's virtual environment when present; hosted Python and
# Docker deployments can use the interpreter provided by their runtime.
if [ -x "./.venv/bin/python" ]; then
    PYTHON_BIN="./.venv/bin/python"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python)"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3)"
else
    echo "[startup] ERROR: Python interpreter not found." >&2
    exit 1
fi

echo "[startup] Checking migration baseline..."
"$PYTHON_BIN" scripts/bootstrap_alembic.py
echo "[startup] Applying database migrations..."
"$PYTHON_BIN" -m alembic upgrade head
echo "[startup] Database migrations are up to date. Starting API..."
exec "$PYTHON_BIN" -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
