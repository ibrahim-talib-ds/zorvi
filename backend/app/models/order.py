"""ZORVI — Orders and order items.

Order lifecycle (manual admin approval):
  pending               -> buyer created the order
  awaiting_verification -> buyer marked "I paid, here is proof"
  paid                  -> admin approved (only path that grants downloads)
  cancelled             -> buyer or admin cancelled before payment
  refunded              -> admin marked it refunded after payment

Rule: nothing sets status='paid' except POST /admin/orders/{id}/mark-paid.
Provider webhooks (Stripe/Paddle) will plug into the same status
transition in a later phase.

Prices are SNAPSHOTTED at order time on order_items. Changing a package
price later never alters an existing order.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class OrderStatus(str, enum.Enum):
    pending = "pending"
    awaiting_verification = "awaiting_verification"
    paid = "paid"
    cancelled = "cancelled"
    refunded = "refunded"


class PaymentMethod(str, enum.Enum):
    manual_bank_transfer = "manual_bank_transfer"
    manual_paypal = "manual_paypal"
    manual_wise = "manual_wise"
    manual_other = "manual_other"


class Order(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_user_id", "user_id"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_created_at", "created_at"),
        Index("ix_orders_provider_payment_id", "provider_payment_id", unique=False),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status", native_enum=True),
        nullable=False,
        default=OrderStatus.pending,
        server_default=text("'pending'"),
    )
    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        Enum(PaymentMethod, name="payment_method", native_enum=True),
        nullable=True,
    )
    # Snapshot of total. Recomputed from items at order creation.
    total_cents: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, server_default=text("'USD'")
    )

    # Free-form fields the buyer submits about their manual payment
    payment_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_proof_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    buyer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Verified by whom / when — audit trail
    marked_paid_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    refunded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Placeholder for future real providers (Paddle/Stripe). Unique when set.
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    provider_payment_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="OrderItem.created_at",
    )

    def __repr__(self) -> str:
        return f"<Order id={self.id} status={self.status.value} total={self.total_cents}>"


class OrderItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """One purchased package. All fields except FKs are snapshots at order time."""
    __tablename__ = "order_items"
    __table_args__ = (
        Index("ix_order_items_order_id", "order_id"),
        Index("ix_order_items_product_id", "product_id"),
        Index("ix_order_items_package_id", "package_id"),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marketplace_products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    package_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marketplace_packages.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Snapshots (never modified after creation)
    product_title: Mapped[str] = mapped_column(String(200), nullable=False)
    product_slug: Mapped[str] = mapped_column(String(220), nullable=False)
    package_name: Mapped[str] = mapped_column(String(80), nullable=False)
    license_type: Mapped[str] = mapped_column(String(40), nullable=False)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="items")
    download_tokens: Mapped[list["DownloadToken"]] = relationship(
        "DownloadToken",
        back_populates="order_item",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<OrderItem {self.product_slug}/{self.package_name} @ {self.price_cents}>"
