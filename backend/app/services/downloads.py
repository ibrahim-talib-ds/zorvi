"""Package-level, owner-authorized download-token issuance."""
import re
import secrets
from datetime import datetime
from pathlib import Path

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.download_token import DownloadToken
from app.models.marketplace import MarketplaceProductFile
from app.models.order import OrderItem
from app.schemas.download import IssuedDownload


def _safe_archive_stem(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip()).strip(".-_")
    return (value[:100] or "project")


async def issue_order_download_tokens(
    db: AsyncSession,
    items: list[OrderItem],
    expires_at: datetime,
) -> list[IssuedDownload]:
    """Issue one token per purchased package, normally for one ZIP archive.

    A package that contains exactly one uploaded ZIP keeps that ZIP as the
    download target, avoiding an unnecessary nested archive. All other
    deliverable sets are represented by an archive token (product_file_id=NULL).
    """
    issued: list[IssuedDownload] = []
    for item in items:
        stmt = select(MarketplaceProductFile).where(
            MarketplaceProductFile.product_id == item.product_id,
            MarketplaceProductFile.is_active.is_(True),
        )
        if item.package_id is None:
            stmt = stmt.where(MarketplaceProductFile.package_id.is_(None))
        else:
            stmt = stmt.where(
                or_(
                    MarketplaceProductFile.package_id == item.package_id,
                    MarketplaceProductFile.package_id.is_(None),
                )
            )
        result = await db.execute(stmt.order_by(MarketplaceProductFile.created_at.asc()))
        files = list(result.scalars().all())
        if not files:
            continue

        direct_zip = len(files) == 1 and Path(files[0].file_name).suffix.lower() == ".zip"
        file_row = files[0] if direct_zip else None
        archive_name = (
            Path(files[0].file_name).name
            if direct_zip
            else f"{_safe_archive_stem(item.product_slug)}-{_safe_archive_stem(item.package_name)}.zip"
        )
        token = secrets.token_urlsafe(48)[:64]
        row = DownloadToken(
            order_item_id=item.id,
            product_file_id=file_row.id if file_row else None,
            token=token,
            expires_at=expires_at,
        )
        db.add(row)
        await db.flush()
        issued.append(IssuedDownload(
            order_item_id=item.id,
            token=row.token,
            expires_at=row.expires_at,
            file_name=archive_name,
        ))
    return issued
