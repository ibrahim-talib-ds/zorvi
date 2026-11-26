"""Create account-owned project workspaces for the Build area."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261126_user_projects"
down_revision = "20261125_notification_receipts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("template", sa.String(length=40), nullable=False, server_default="web"),
        sa.Column("files", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("last_opened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_user_projects_user_updated", "user_projects", ["user_id", "updated_at"])


def downgrade() -> None:
    op.drop_index("ix_user_projects_user_updated", table_name="user_projects")
    op.drop_table("user_projects")
