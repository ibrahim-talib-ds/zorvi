"""Store the language used by a lesson's legacy code example."""
from alembic import op
import sqlalchemy as sa

revision = "20261125_lesson_code_language"
down_revision = "20261125_course_resources"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lessons",
        sa.Column("code_language", sa.String(length=32), nullable=False, server_default="sql"),
    )


def downgrade() -> None:
    op.drop_column("lessons", "code_language")
