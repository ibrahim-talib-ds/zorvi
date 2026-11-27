"""Seed the Web Development category used by ibrant Academy courses."""
from alembic import op


revision = "20261127_webdev_category"
down_revision = "20261127_course_level_duration"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "INSERT INTO marketplace_categories "
        "(name, slug, description, sort_order, is_active) "
        "VALUES ("
        "'Web Development', 'web-development', "
        "'Courses covering web technologies, frontend and backend development, "
        "and application engineering.', 0, TRUE"
        ") ON CONFLICT (slug) DO NOTHING"
    )


def downgrade() -> None:
    # Keep the shared category as user/course data may have been attached to it.
    pass
