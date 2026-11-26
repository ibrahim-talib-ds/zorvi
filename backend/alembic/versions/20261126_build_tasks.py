"""Create persisted AI Build tasks for autopilot and admin monitoring."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261126_build_tasks"
down_revision = "20261126_user_projects"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "build_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("user_projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("plan", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="queued"),
        sa.Column("auto_run", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("current_step_index", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("completed_steps", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("events", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("resume_context", sa.Text(), nullable=True),
        sa.Column("current_step_title", sa.String(length=120), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_build_tasks_status_created", "build_tasks", ["status", "created_at"])
    op.create_index("ix_build_tasks_user_created", "build_tasks", ["user_id", "created_at"])
    op.create_index("ix_build_tasks_project_id", "build_tasks", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_build_tasks_project_id", table_name="build_tasks")
    op.drop_index("ix_build_tasks_user_created", table_name="build_tasks")
    op.drop_index("ix_build_tasks_status_created", table_name="build_tasks")
    op.drop_table("build_tasks")
