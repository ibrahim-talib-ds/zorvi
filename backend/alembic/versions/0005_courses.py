"""courses, modules, lessons, enrollments, progress, certificates

Revision ID: 0005_courses
Revises: 0004_orders
Create Date: 2026-11-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0005_courses"
down_revision: Union[str, None] = "0004_orders"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums (idempotent)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE course_difficulty AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE video_provider AS ENUM ('youtube', 'vimeo', 'local', 'none');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    """)

    course_status = postgresql.ENUM(
        'draft', 'published', 'archived', name='course_status', create_type=False,
    )
    course_difficulty = postgresql.ENUM(
        'beginner', 'intermediate', 'advanced', 'expert',
        name='course_difficulty', create_type=False,
    )
    video_provider = postgresql.ENUM(
        'youtube', 'vimeo', 'local', 'none', name='video_provider', create_type=False,
    )

    # courses
    op.create_table(
        "courses",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(220), nullable=False),
        sa.Column("short_description", sa.String(500), nullable=False),
        sa.Column("long_description", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("thumbnail_url", sa.String(500), nullable=True),
        sa.Column("instructor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("difficulty", course_difficulty, nullable=False, server_default=sa.text("'beginner'")),
        sa.Column("status", course_status, nullable=False, server_default=sa.text("'draft'")),
        sa.Column("technologies", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("prerequisites", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("learning_path", sa.String(100), nullable=True),
        sa.Column("estimated_hours", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["instructor_id"], ["users.id"],
                                name="fk_courses_instructor_id_users", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["category_id"], ["marketplace_categories.id"],
                                name="fk_courses_category_id_marketplace_categories", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_courses"),
    )
    op.create_index("ix_courses_instructor_id", "courses", ["instructor_id"])
    op.create_index("ix_courses_category_id", "courses", ["category_id"])
    op.create_index("ix_courses_status", "courses", ["status"])
    op.create_index("ix_courses_created_at", "courses", ["created_at"])
    op.execute(
        "CREATE UNIQUE INDEX uq_courses_slug_active ON courses (slug) WHERE deleted_at IS NULL"
    )

    # course_modules
    op.create_table(
        "course_modules",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"],
                                name="fk_course_modules_course_id_courses", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_course_modules"),
    )
    op.create_index("ix_course_modules_course_id", "course_modules", ["course_id"])
    op.create_index("ix_course_modules_sort_order", "course_modules", ["sort_order"])

    # lessons
    op.create_table(
        "lessons",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("module_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("video_provider", video_provider, nullable=False, server_default=sa.text("'none'")),
        sa.Column("video_url", sa.String(500), nullable=True),
        sa.Column("video_file_key", sa.String(500), nullable=True),
        sa.Column("content_markdown", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("code_example", sa.Text(), nullable=True),
        sa.Column("exercise", sa.Text(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_free_preview", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["module_id"], ["course_modules.id"],
                                name="fk_lessons_module_id_course_modules", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_lessons"),
    )
    op.create_index("ix_lessons_module_id", "lessons", ["module_id"])
    op.create_index("ix_lessons_sort_order", "lessons", ["sort_order"])

    # enrollments
    op.create_table(
        "enrollments",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"],
                                name="fk_enrollments_user_id_users", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"],
                                name="fk_enrollments_course_id_courses", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_enrollments"),
        sa.UniqueConstraint("user_id", "course_id", name="uq_enrollments_user_course"),
    )
    op.create_index("ix_enrollments_user_id", "enrollments", ["user_id"])
    op.create_index("ix_enrollments_course_id", "enrollments", ["course_id"])

    # lesson_progress
    op.create_table(
        "lesson_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"],
                                name="fk_lesson_progress_user_id_users", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"],
                                name="fk_lesson_progress_lesson_id_lessons", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_lesson_progress"),
        sa.UniqueConstraint("user_id", "lesson_id", name="uq_lesson_progress_user_lesson"),
    )
    op.create_index("ix_lesson_progress_user_id", "lesson_progress", ["user_id"])
    op.create_index("ix_lesson_progress_lesson_id", "lesson_progress", ["lesson_id"])

    # certificates
    op.create_table(
        "certificates",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("certificate_code", sa.String(20), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("pdf_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"],
                                name="fk_certificates_user_id_users", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"],
                                name="fk_certificates_course_id_courses", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_certificates"),
        sa.UniqueConstraint("user_id", "course_id", name="uq_certificates_user_course"),
        sa.UniqueConstraint("certificate_code", name="uq_certificates_code"),
    )
    op.create_index("ix_certificates_user_id", "certificates", ["user_id"])
    op.create_index("ix_certificates_course_id", "certificates", ["course_id"])


def downgrade() -> None:
    op.drop_index("ix_certificates_course_id", table_name="certificates")
    op.drop_index("ix_certificates_user_id", table_name="certificates")
    op.drop_table("certificates")

    op.drop_index("ix_lesson_progress_lesson_id", table_name="lesson_progress")
    op.drop_index("ix_lesson_progress_user_id", table_name="lesson_progress")
    op.drop_table("lesson_progress")

    op.drop_index("ix_enrollments_course_id", table_name="enrollments")
    op.drop_index("ix_enrollments_user_id", table_name="enrollments")
    op.drop_table("enrollments")

    op.drop_index("ix_lessons_sort_order", table_name="lessons")
    op.drop_index("ix_lessons_module_id", table_name="lessons")
    op.drop_table("lessons")

    op.drop_index("ix_course_modules_sort_order", table_name="course_modules")
    op.drop_index("ix_course_modules_course_id", table_name="course_modules")
    op.drop_table("course_modules")

    op.execute("DROP INDEX IF EXISTS uq_courses_slug_active")
    op.drop_index("ix_courses_created_at", table_name="courses")
    op.drop_index("ix_courses_status", table_name="courses")
    op.drop_index("ix_courses_category_id", table_name="courses")
    op.drop_index("ix_courses_instructor_id", table_name="courses")
    op.drop_table("courses")

    for name in ("video_provider", "course_difficulty", "course_status"):
        sa.Enum(name=name).drop(op.get_bind(), checkfirst=True)
