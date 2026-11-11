"""marketplace: categories, products, packages, files

Revision ID: 0003_marketplace
Revises: 0002_refresh_tokens
Create Date: 2026-11-07

Fixed 2026-11-07: enum types were being double-created (explicit .create()
plus SQLAlchemy's auto-create_type on the column definition). Now uses
DO-block idempotent creation + create_type=False on column-level enums.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003_marketplace"
down_revision: Union[str, None] = "0002_refresh_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------- 1. Create enum types idempotently ----------
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE product_difficulty AS ENUM
                ('beginner', 'intermediate', 'advanced', 'expert');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE license_type AS ENUM
                ('personal', 'single_business', 'commercial', 'extended');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # ---------- 2. Column enum refs (create_type=False = do NOT re-create) ----------
    product_status = postgresql.ENUM(
        'draft', 'published', 'archived',
        name='product_status', create_type=False,
    )
    product_difficulty = postgresql.ENUM(
        'beginner', 'intermediate', 'advanced', 'expert',
        name='product_difficulty', create_type=False,
    )
    license_type = postgresql.ENUM(
        'personal', 'single_business', 'commercial', 'extended',
        name='license_type', create_type=False,
    )

    # ---------- 3. marketplace_categories ----------
    op.create_table(
        "marketplace_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["marketplace_categories.id"],
                                name="fk_marketplace_categories_parent_id_marketplace_categories",
                                ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_marketplace_categories"),
    )
    op.create_index("uq_marketplace_categories_slug", "marketplace_categories",
                    ["slug"], unique=True)
    op.create_index("ix_marketplace_categories_parent_id", "marketplace_categories",
                    ["parent_id"])
    op.create_index("ix_marketplace_categories_is_active", "marketplace_categories",
                    ["is_active"])

    # ---------- 4. marketplace_products ----------
    op.create_table(
        "marketplace_products",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(220), nullable=False),
        sa.Column("short_description", sa.String(255), nullable=False),
        sa.Column("long_description", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("difficulty", product_difficulty, nullable=False,
                  server_default=sa.text("'intermediate'")),
        sa.Column("status", product_status, nullable=False,
                  server_default=sa.text("'draft'")),
        sa.Column("starting_price_cents", sa.Integer(), nullable=False,
                  server_default=sa.text("0")),
        sa.Column("currency", sa.String(3), nullable=False, server_default=sa.text("'USD'")),
        sa.Column("cover_image_url", sa.String(500), nullable=True),
        sa.Column("demo_video_url", sa.String(500), nullable=True),
        sa.Column("live_demo_url", sa.String(500), nullable=True),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["category_id"], ["marketplace_categories.id"],
                                name="fk_marketplace_products_category_id_marketplace_categories",
                                ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["creator_id"], ["users.id"],
                                name="fk_marketplace_products_creator_id_users",
                                ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_marketplace_products"),
    )
    op.create_index("ix_marketplace_products_category_id", "marketplace_products",
                    ["category_id"])
    op.create_index("ix_marketplace_products_status", "marketplace_products", ["status"])
    op.create_index("ix_marketplace_products_is_featured", "marketplace_products",
                    ["is_featured"])
    op.create_index("ix_marketplace_products_creator_id", "marketplace_products",
                    ["creator_id"])
    op.create_index("ix_marketplace_products_created_at", "marketplace_products",
                    ["created_at"])
    op.create_index("ix_marketplace_products_deleted_at", "marketplace_products",
                    ["deleted_at"])
    op.execute(
        "CREATE UNIQUE INDEX uq_marketplace_products_slug_active "
        "ON marketplace_products (slug) WHERE deleted_at IS NULL"
    )

    # ---------- 5. marketplace_packages ----------
    op.create_table(
        "marketplace_packages",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default=sa.text("'USD'")),
        sa.Column("license_type", license_type, nullable=False,
                  server_default=sa.text("'personal'")),
        sa.Column("includes_source_code", sa.Boolean(), nullable=False,
                  server_default=sa.text("TRUE")),
        sa.Column("includes_documentation", sa.Boolean(), nullable=False,
                  server_default=sa.text("FALSE")),
        sa.Column("includes_support_days", sa.Integer(), nullable=False,
                  server_default=sa.text("0")),
        sa.Column("includes_updates_days", sa.Integer(), nullable=False,
                  server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["marketplace_products.id"],
                                name="fk_marketplace_packages_product_id_marketplace_products",
                                ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_marketplace_packages"),
    )
    op.create_index("ix_marketplace_packages_product_id", "marketplace_packages",
                    ["product_id"])
    op.create_index("uq_marketplace_packages_product_name", "marketplace_packages",
                    ["product_id", "name"], unique=True)

    # ---------- 6. marketplace_product_files ----------
    op.create_table(
        "marketplace_product_files",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("package_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False,
                  server_default=sa.text("0")),
        sa.Column("file_type", sa.String(80), nullable=False,
                  server_default=sa.text("'application/octet-stream'")),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("download_count", sa.Integer(), nullable=False,
                  server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["marketplace_products.id"],
                                name="fk_marketplace_product_files_product_id_marketplace_products",
                                ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["package_id"], ["marketplace_packages.id"],
                                name="fk_marketplace_product_files_package_id_marketplace_packages",
                                ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_marketplace_product_files"),
    )
    op.create_index("ix_marketplace_product_files_product_id", "marketplace_product_files",
                    ["product_id"])
    op.create_index("ix_marketplace_product_files_package_id", "marketplace_product_files",
                    ["package_id"])
    op.create_index("uq_marketplace_product_files_storage_key", "marketplace_product_files",
                    ["storage_key"], unique=True)


def downgrade() -> None:
    op.drop_index("uq_marketplace_product_files_storage_key",
                  table_name="marketplace_product_files")
    op.drop_index("ix_marketplace_product_files_package_id",
                  table_name="marketplace_product_files")
    op.drop_index("ix_marketplace_product_files_product_id",
                  table_name="marketplace_product_files")
    op.drop_table("marketplace_product_files")
    op.drop_index("uq_marketplace_packages_product_name", table_name="marketplace_packages")
    op.drop_index("ix_marketplace_packages_product_id", table_name="marketplace_packages")
    op.drop_table("marketplace_packages")
    op.execute("DROP INDEX IF EXISTS uq_marketplace_products_slug_active")
    for idx in (
        "ix_marketplace_products_deleted_at",
        "ix_marketplace_products_created_at",
        "ix_marketplace_products_creator_id",
        "ix_marketplace_products_is_featured",
        "ix_marketplace_products_status",
        "ix_marketplace_products_category_id",
    ):
        op.drop_index(idx, table_name="marketplace_products")
    op.drop_table("marketplace_products")
    op.drop_index("ix_marketplace_categories_is_active", table_name="marketplace_categories")
    op.drop_index("ix_marketplace_categories_parent_id", table_name="marketplace_categories")
    op.drop_index("uq_marketplace_categories_slug", table_name="marketplace_categories")
    op.drop_table("marketplace_categories")
    op.execute("DROP TYPE IF EXISTS license_type")
    op.execute("DROP TYPE IF EXISTS product_difficulty")
    op.execute("DROP TYPE IF EXISTS product_status")
