"""Add persistent lesson exercise submissions."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261127_exercise_submissions"
down_revision = "20261127_webdev_category"
branch_labels = None
depends_on = None


def upgrade() -> None:
    status_enum = sa.Enum("draft", "submitted", "reviewed", name="exercise_submission_status")
    op.create_table(
        "exercise_submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", status_enum, nullable=False, server_default="draft"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("grade", sa.Integer(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("lesson_id", "student_id", name="uq_exercise_submission_lesson_student"),
    )
    op.create_index("ix_exercise_submissions_lesson_status", "exercise_submissions", ["lesson_id", "status"])
    op.create_index("ix_exercise_submissions_student", "exercise_submissions", ["student_id"])


def downgrade() -> None:
    op.drop_index("ix_exercise_submissions_student", table_name="exercise_submissions")
    op.drop_index("ix_exercise_submissions_lesson_status", table_name="exercise_submissions")
    op.drop_table("exercise_submissions")
