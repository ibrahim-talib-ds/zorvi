"""ZORVI — Platform settings (key-value store)."""
from sqlalchemy import String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PlatformSetting(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "platform_settings"

    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    value: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default=text("''"))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    def __repr__(self) -> str:
        return f"<PlatformSetting {self.key}>"
