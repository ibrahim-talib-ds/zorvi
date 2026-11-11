"""Add avatar_url to users

Revision ID: 0006_profile
Revises: 0005_courses
Create Date: 2026-11-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_profile"
down_revision: Union[str, None] = "0005_courses"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("avatar_url", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
