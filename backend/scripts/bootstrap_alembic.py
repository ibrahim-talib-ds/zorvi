"""Safely initialize Alembic history for the known pre-Alembic production schema.

Only stamps the verified legacy baseline when the database has the expected
ZORVI schema markers and no Alembic history. It never stamps head or changes
application tables/data.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from app.core.config import get_settings  # noqa: E402

BASELINE = "695280e6696d"
settings = get_settings()
engine = create_engine(settings.DATABASE_URL_SYNC, pool_pre_ping=True, connect_args={"connect_timeout": 12})

with engine.connect() as connection:
    inspector = inspect(connection)
    tables = set(inspector.get_table_names(schema="public"))
    if "alembic_version" in tables:
        rows = connection.exec_driver_sql("SELECT version_num FROM public.alembic_version").fetchall()
        print(f"[startup] Alembic history present ({len(rows)} revision row(s)); no baseline stamp needed.")
    else:
        required_tables = {
            "users", "roles", "user_roles", "refresh_tokens", "marketplace_categories",
            "marketplace_products", "marketplace_packages", "marketplace_product_files",
            "orders", "order_items", "download_tokens", "courses", "course_modules",
            "lessons", "enrollments", "lesson_progress", "certificates",
            "instructor_applications", "notifications", "platform_settings", "translation_cache",
        }
        missing_tables = sorted(required_tables - tables)
        if missing_tables:
            raise RuntimeError("Refusing to stamp legacy baseline; missing schema tables: " + ", ".join(missing_tables))
        required_columns = {
            "users": {"oauth_provider", "oauth_id", "avatar_url", "deleted_at"},
            "courses": {"deleted_at"},
            "notifications": {"read_at"},
        }
        missing_columns = []
        for table, expected in required_columns.items():
            actual = {column["name"] for column in inspector.get_columns(table, schema="public")}
            missing_columns.extend(f"{table}.{name}" for name in sorted(expected - actual))
        if missing_columns:
            raise RuntimeError("Refusing to stamp legacy baseline; schema markers missing: " + ", ".join(missing_columns))
        print(f"[startup] Existing schema matches verified legacy baseline {BASELINE}; initializing migration history only.")
        subprocess.run([sys.executable, "-m", "alembic", "stamp", BASELINE], cwd=BACKEND_DIR, check=True)

engine.dispose()
