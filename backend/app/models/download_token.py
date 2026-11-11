"""ZORVI — Download tokens for purchased files.

Each token is:
  - single-use      (used_at set on first successful download)
  - expiring        (default 15 minutes, configurable per issue)
  - audited         (ip_address, user_agent captured at use time)
  - opaque          (32-byte urlsafe base64; no file paths inside)
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class DownloadToken(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "download_tokens"
    __table_args__ = (
        Index("uq_download_tokens_token", "token", unique=True),
        Index("ix_download_tokens_order_item_id", "order_item_id"),
        Index("ix_download_tokens_expires_at", "expires_at"),
    )

    order_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("order_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Which file this token grants (nullable = the whole package as an archive)
    product_file_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marketplace_product_files.id", ondelete="CASCADE"),
        nullable=True,
    )

    token: Mapped[str] = mapped_column(String(64), nullable=False)

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    download_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    order_item: Mapped["OrderItem"] = relationship(  # noqa: F821
        "OrderItem", back_populates="download_tokens"
    )

    @property
    def is_used(self) -> bool:
        return self.used_at is not None

    def __repr__(self) -> str:
        return f"<DownloadToken {self.token[:8]}… item={self.order_item_id}>"
