"""Persist delayed retries for AI build capacity limits."""
from alembic import op
import sqlalchemy as sa

revision = "20261127_durable_build_retries"
down_revision = "20261126_build_tasks"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("build_tasks", sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("build_tasks", sa.Column("retry_count", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.create_index("ix_build_tasks_status_retry", "build_tasks", ["status", "next_retry_at"])

def downgrade() -> None:
    op.drop_index("ix_build_tasks_status_retry", table_name="build_tasks")
    op.drop_column("build_tasks", "retry_count")
    op.drop_column("build_tasks", "next_retry_at")
