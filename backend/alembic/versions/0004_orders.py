"""orders, order_items, download_tokens

Revision ID: 0004_orders
Revises: 0003_marketplace
Create Date: 2026-11-07

Idempotent enum creation via DO-block. Column-level enums use
create_type=False so SQLAlchemy does not attempt to re-create them.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004_orders"
down_revision: Union[str, None] = "0003_marketplace"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------- 1. Create enum types idempotently ----------
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE order_status AS ENUM
                ('pending','awaiting_verification','paid','cancelled','refunded');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE payment_method AS ENUM
                ('manual_bank_transfer','manual_paypal','manual_wise','manual_other');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    order_status = postgresql.ENUM(
        'pending', 'awaiting_verification', 'paid', 'cancelled', 'refunded',
        name='order_status', create_type=False,
    )
    payment_method = postgresql.ENUM(
        'manual_bank_transfer', 'manual_paypal', 'manual_wise', 'manual_other',
        name='payment_method', create_type=False,
    )

    # ---------- 2. orders ----------
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", order_status, nullable=False,
                  server_default=sa.text("'pending'")),
        sa.Column("payment_method", payment_method, nullable=True),
        sa.Column("total_cents", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("currency", sa.String(3), nullable=False, server_default=sa.text("'USD'")),
        sa.Column("payment_reference", sa.String(255), nullable=True),
        sa.Column("payment_proof_url", sa.String(1000), nullable=True),
        sa.Column("buyer_note", sa.Text(), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("marked_paid_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider", sa.String(50), nullable=True),
        sa.Column("provider_payment_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"],
                                name="fk_orders_user_id_users",
                                ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["marked_paid_by_id"], ["users.id"],
                                name="fk_orders_marked_paid_by_id_users",
                                ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_orders"),
    )
    op.create_index("ix_orders_user_id", "orders", ["user_id"])
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_index("ix_orders_created_at", "orders", ["created_at"])
    op.create_index("ix_orders_provider_payment_id", "orders", ["provider_payment_id"])

    # ---------- 3. order_items ----------
    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("package_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("product_title", sa.String(200), nullable=False),
        sa.Column("product_slug", sa.String(220), nullable=False),
        sa.Column("package_name", sa.String(80), nullable=False),
        sa.Column("license_type", sa.String(40), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"],
                                name="fk_order_items_order_id_orders",
                                ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["marketplace_products.id"],
                                name="fk_order_items_product_id_marketplace_products",
                                ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["package_id"], ["marketplace_packages.id"],
                                name="fk_order_items_package_id_marketplace_packages",
                                ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_order_items"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.create_index("ix_order_items_product_id", "order_items", ["product_id"])
    op.create_index("ix_order_items_package_id", "order_items", ["package_id"])

    # ---------- 4. download_tokens ----------
    op.create_table(
        "download_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("order_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_file_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("download_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["order_item_id"], ["order_items.id"],
                                name="fk_download_tokens_order_item_id_order_items",
                                ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_file_id"], ["marketplace_product_files.id"],
                                name="fk_download_tokens_product_file_id_marketplace_product_files",
                                ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_download_tokens"),
    )
    op.create_index("uq_download_tokens_token", "download_tokens", ["token"], unique=True)
    op.create_index("ix_download_tokens_order_item_id", "download_tokens", ["order_item_id"])
    op.create_index("ix_download_tokens_expires_at", "download_tokens", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_download_tokens_expires_at", table_name="download_tokens")
    op.drop_index("ix_download_tokens_order_item_id", table_name="download_tokens")
    op.drop_index("uq_download_tokens_token", table_name="download_tokens")
    op.drop_table("download_tokens")
    op.drop_index("ix_order_items_package_id", table_name="order_items")
    op.drop_index("ix_order_items_product_id", table_name="order_items")
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_table("order_items")
    op.drop_index("ix_orders_provider_payment_id", table_name="orders")
    op.drop_index("ix_orders_created_at", table_name="orders")
    op.drop_index("ix_orders_status", table_name="orders")
    op.drop_index("ix_orders_user_id", table_name="orders")
    op.drop_table("orders")
    op.execute("DROP TYPE IF EXISTS payment_method")
    op.execute("DROP TYPE IF EXISTS order_status")
