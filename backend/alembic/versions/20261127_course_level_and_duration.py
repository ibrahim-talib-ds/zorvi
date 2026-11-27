"""Add a beginner-to-intermediate course level and duration in weeks."""
from alembic import op
import sqlalchemy as sa


revision = "20261127_course_level_duration"
down_revision = "20261127_resume_legacy"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL enum values are additive; IF NOT EXISTS keeps deployments safe
    # when an environment was manually prepared with this label already.
    op.execute(
        "ALTER TYPE course_difficulty "
        "ADD VALUE IF NOT EXISTS 'beginner_to_intermediate'"
    )
    op.add_column(
        "courses",
        sa.Column("duration_weeks", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_check_constraint(
        "ck_courses_duration_weeks_nonnegative",
        "courses",
        "duration_weeks >= 0",
    )


def downgrade() -> None:
    # PostgreSQL does not support removing one enum label directly. Move any
    # affected rows back to the closest legacy value before older code runs.
    op.execute(
        "UPDATE courses SET difficulty = 'beginner' "
        "WHERE difficulty::text = 'beginner_to_intermediate'"
    )
    op.drop_constraint(
        "ck_courses_duration_weeks_nonnegative", "courses", type_="check"
    )
    op.drop_column("courses", "duration_weeks")
