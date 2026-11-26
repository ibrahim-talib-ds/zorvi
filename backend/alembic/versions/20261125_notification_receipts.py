"""Add per-user read and dismissal state for broadcast notifications."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261125_notification_receipts"
down_revision = "20261125_lesson_code_language"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_receipts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("notification_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("notification_id", "user_id", name="uq_notification_receipt_user"),
    )
    op.create_index("ix_notification_receipts_user_id", "notification_receipts", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_notification_receipts_user_id", table_name="notification_receipts")
    op.drop_table("notification_receipts")
