"""ZORVI — Marketplace models: categories, products, packages, files.

Public read routes MUST filter MarketplaceProduct.status == published.
Paid files (MarketplaceProductFile) are NOT served here; downloads come
in a later phase with purchase verification.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class ProductStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class ProductDifficulty(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    expert = "expert"


class LicenseType(str, enum.Enum):
    personal = "personal"
    single_business = "single_business"
    commercial = "commercial"
    extended = "extended"


class MarketplaceCategory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "marketplace_categories"
    __table_args__ = (
        Index("uq_marketplace_categories_slug", "slug", unique=True),
        Index("ix_marketplace_categories_parent_id", "parent_id"),
        Index("ix_marketplace_categories_is_active", "is_active"),
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marketplace_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("TRUE")
    )


class MarketplaceProduct(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "marketplace_products"
    __table_args__ = (
        Index(
            "uq_marketplace_products_slug_active",
            "slug",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("ix_marketplace_products_category_id", "category_id"),
        Index("ix_marketplace_products_status", "status"),
        Index("ix_marketplace_products_is_featured", "is_featured"),
        Index("ix_marketplace_products_creator_id", "creator_id"),
        Index("ix_marketplace_products_created_at", "created_at"),
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), nullable=False)
    short_description: Mapped[str] = mapped_column(String(255), nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    license: Mapped[str | None] = mapped_column(Text, nullable=True)
    long_description: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marketplace_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    creator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    difficulty: Mapped[ProductDifficulty] = mapped_column(
        Enum(ProductDifficulty, name="product_difficulty", native_enum=True),
        nullable=False,
        default=ProductDifficulty.intermediate,
        server_default=text("'intermediate'"),
    )
    status: Mapped[ProductStatus] = mapped_column(
        Enum(ProductStatus, name="product_status", native_enum=True),
        nullable=False,
        default=ProductStatus.draft,
        server_default=text("'draft'"),
    )
    starting_price_cents: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="USD", server_default=text("'USD'")
    )
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    demo_video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    live_demo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("FALSE")
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    packages: Mapped[list["MarketplacePackage"]] = relationship(
        "MarketplacePackage",
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="MarketplacePackage.sort_order",
    )


class MarketplacePackage(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "marketplace_packages"
    __table_args__ = (
        Index("uq_marketplace_packages_product_name", "product_id", "name", unique=True),
        Index("ix_marketplace_packages_product_id", "product_id"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marketplace_products.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="USD", server_default=text("'USD'")
    )
    license_type: Mapped[LicenseType] = mapped_column(
        Enum(LicenseType, name="license_type", native_enum=True),
        nullable=False,
        default=LicenseType.personal,
        server_default=text("'personal'"),
    )
    includes_source_code: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("TRUE")
    )
    includes_documentation: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("FALSE")
    )
    includes_support_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    includes_updates_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("TRUE")
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )

    product: Mapped["MarketplaceProduct"] = relationship(
        "MarketplaceProduct", back_populates="packages"
    )


class MarketplaceProductFile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "marketplace_product_files"
    __table_args__ = (
        Index("uq_marketplace_product_files_storage_key", "storage_key", unique=True),
        Index("ix_marketplace_product_files_product_id", "product_id"),
        Index("ix_marketplace_product_files_package_id", "package_id"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marketplace_products.id", ondelete="CASCADE"),
        nullable=False,
    )
    package_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marketplace_packages.id", ondelete="CASCADE"),
        nullable=True,
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    file_type: Mapped[str] = mapped_column(
        String(80), nullable=False, default="application/octet-stream"
    )
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    download_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("TRUE")
    )
