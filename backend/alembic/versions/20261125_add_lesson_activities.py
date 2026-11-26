"""Add structured lesson examples and practice questions."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261125_lesson_activities"
down_revision = "695280e6696d"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("lessons", sa.Column("practical_examples", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")))
    op.add_column("lessons", sa.Column("practice_questions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")))

def downgrade() -> None:
    op.drop_column("lessons", "practice_questions")
    op.drop_column("lessons", "practical_examples")
