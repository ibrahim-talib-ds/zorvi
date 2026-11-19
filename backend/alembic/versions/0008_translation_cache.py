"""add translation_cache

Revision ID: 0008_translation_cache
Revises: 18d419148e12
Create Date: 2026-11-19

Created by the zorvi language fix script.

app/translation/service.py reads and writes the table "translation_cache",
but none of the previous migrations created it, so every /api/v1/translate
request failed on any database built from migrations.
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_translation_cache"
down_revision = "18d419148e12"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "translation_cache" in inspector.get_table_names():
        return  # table already exists (e.g. created manually) - nothing to do
    op.create_table(
        "translation_cache",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_hash", sa.String(length=64), nullable=False),
        sa.Column("source_lang", sa.String(length=10), nullable=False, server_default="en"),
        sa.Column("target_lang", sa.String(length=10), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column("translated_text", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False, server_default="mymemory"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("source_hash", "target_lang", name="uq_translation_cache_hash_target"),
    )
    op.create_index("ix_translation_cache_target_lang", "translation_cache", ["target_lang"])


def downgrade():
    op.drop_index("ix_translation_cache_target_lang", table_name="translation_cache")
    op.drop_table("translation_cache")
