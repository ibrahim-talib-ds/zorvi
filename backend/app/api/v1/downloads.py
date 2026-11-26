"""Secure, single-use downloads for paid marketplace orders.

A package is delivered as one ZIP file (or the original ZIP if that is the
only uploaded deliverable). Download tokens are short-lived, single-use,
owner-scoped through a paid order, and audited when consumed.
"""
import shutil
import tempfile
import uuid
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.download_token import DownloadToken
from app.models.marketplace import MarketplaceProductFile
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User
from app.schemas.download import DownloadInfo, IssueDownloadRequest, IssuedDownload
from app.services.downloads import issue_order_download_tokens
from app.services.storage import storage

router = APIRouter(tags=["downloads"])
DEFAULT_TTL_MINUTES = 15
MAX_TTL_MINUTES = 1440
MAX_PACKAGE_ARCHIVE_BYTES = 512 * 1024 * 1024


def _safe_download_name(value: str) -> str:
    name = Path(value.replace("\\", "/")).name
    cleaned = "".join(ch for ch in name if ch.isalnum() or ch in " ._-").strip(" .")
    return (cleaned[:180] or "download")


def _attachment_headers(file_name: str, content_type: str, size: int) -> dict[str, str]:
    safe_name = _safe_download_name(file_name)
    ascii_name = safe_name.encode("ascii", "ignore").decode("ascii") or "download"
    encoded = quote(safe_name.encode("utf-8"))
    return {
        "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}',
        "Content-Type": content_type,
        "Content-Length": str(size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
    }


def _package_files_query(order_item: OrderItem):
    stmt = select(MarketplaceProductFile).where(
        MarketplaceProductFile.product_id == order_item.product_id,
        MarketplaceProductFile.is_active.is_(True),
    )
    if order_item.package_id is None:
        return stmt.where(MarketplaceProductFile.package_id.is_(None))
    return stmt.where(or_(
        MarketplaceProductFile.package_id == order_item.package_id,
        MarketplaceProductFile.package_id.is_(None),
    ))


def _stream_file(handle):
    try:
        while True:
            chunk = handle.read(64 * 1024)
            if not chunk:
                break
            yield chunk
    finally:
        handle.close()


def _build_package_archive(files: list[MarketplaceProductFile]):
    """Build a bounded-memory archive; files are streamed into a temp file."""
    output = tempfile.SpooledTemporaryFile(max_size=8 * 1024 * 1024, mode="w+b")
    used_names: set[str] = set()
    total_source_bytes = 0
    try:
        with zipfile.ZipFile(output, mode="w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            for file_row in files:
                total_source_bytes += max(0, int(file_row.file_size_bytes or 0))
                if total_source_bytes > MAX_PACKAGE_ARCHIVE_BYTES:
                    raise HTTPException(status_code=413, detail="This package is too large to bundle as a single download.")
                if not storage.exists(file_row.storage_key):
                    raise HTTPException(status_code=404, detail=f"Package file unavailable: {_safe_download_name(file_row.file_name)}")
                base = _safe_download_name(file_row.file_name)
                member = base
                stem, suffix = Path(base).stem, Path(base).suffix
                number = 2
                while member.lower() in used_names:
                    member = f"{stem}-{number}{suffix}"
                    number += 1
                used_names.add(member.lower())
                with storage.open_read(file_row.storage_key) as source:
                    with archive.open(member, mode="w") as destination:
                        shutil.copyfileobj(source, destination, length=64 * 1024)
        output.seek(0, 2)
        size = output.tell()
        output.seek(0)
        return output, size
    except Exception:
        output.close()
        raise


@router.get("/downloads/{token}", response_class=StreamingResponse)
async def download_by_token(
    token: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(DownloadToken)
        .options(selectinload(DownloadToken.order_item))
        .where(DownloadToken.token == token)
        .with_for_update()
    )
    token_row = result.scalar_one_or_none()
    if token_row is None:
        raise HTTPException(status_code=404, detail="token not found")

    now = datetime.now(timezone.utc)
    expiry = token_row.expires_at
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if expiry < now:
        raise HTTPException(status_code=410, detail="token expired")
    if token_row.used_at is not None:
        raise HTTPException(status_code=410, detail="token already used")

    order_item = token_row.order_item
    order = await db.get(Order, order_item.order_id) if order_item else None
    if order is None or order.status != OrderStatus.paid:
        raise HTTPException(status_code=404, detail="not available")

    archive_handle = None
    if token_row.product_file_id is not None:
        file_row = await db.get(MarketplaceProductFile, token_row.product_file_id)
        if file_row is None or not file_row.is_active or not storage.exists(file_row.storage_key):
            raise HTTPException(status_code=404, detail="file not available")
        try:
            download_handle = storage.open_read(file_row.storage_key)
        except (FileNotFoundError, ValueError):
            raise HTTPException(status_code=404, detail="file not available")
        safe_name = _safe_download_name(file_row.file_name)
        size = file_row.file_size_bytes
        content_type = file_row.file_type or "application/octet-stream"
        file_row.download_count = (file_row.download_count or 0) + 1
        response_iter = _stream_file(download_handle)
    else:
        if order_item is None:
            raise HTTPException(status_code=404, detail="package not available")
        files_result = await db.execute(_package_files_query(order_item).order_by(MarketplaceProductFile.created_at.asc()))
        package_files = list(files_result.scalars().all())
        if not package_files:
            raise HTTPException(status_code=404, detail="package files not available")
        safe_name = _safe_download_name(f"{order_item.product_slug}-{order_item.package_name}.zip")
        archive_handle, size = _build_package_archive(package_files)
        content_type = "application/zip"
        for file_row in package_files:
            file_row.download_count = (file_row.download_count or 0) + 1
        response_iter = _stream_file(archive_handle)

    token_row.used_at = now
    token_row.ip_address = request.client.host if request.client else None
    token_row.user_agent = request.headers.get("user-agent", "")[:500] or None
    token_row.download_count = (token_row.download_count or 0) + 1
    await db.commit()
    return StreamingResponse(response_iter, headers=_attachment_headers(safe_name, content_type, size))


@router.post("/orders/{order_id}/downloads", response_model=list[IssuedDownload])
async def reissue_downloads(
    order_id: uuid.UUID,
    payload: IssueDownloadRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[IssuedDownload]:
    order = await db.get(Order, order_id)
    if order is None or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="order not found")
    if order.status != OrderStatus.paid:
        raise HTTPException(status_code=409, detail=f"downloads only available for paid orders (status='{order.status.value}')")

    ttl = min(payload.ttl_minutes or DEFAULT_TTL_MINUTES, MAX_TTL_MINUTES)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ttl)
    items_result = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
    issued = await issue_order_download_tokens(db, list(items_result.scalars().all()), expires_at)
    await db.commit()
    return issued


@router.get("/orders/{order_id}/downloads", response_model=list[DownloadInfo])
async def list_downloads_for_order(
    order_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[DownloadInfo]:
    order = await db.get(Order, order_id)
    if order is None or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="order not found")
    if order.status != OrderStatus.paid:
        raise HTTPException(status_code=409, detail="downloads only available for paid orders")

    items_result = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
    items = {item.id: item for item in items_result.scalars().all()}
    if not items:
        return []
    token_result = await db.execute(select(DownloadToken).where(DownloadToken.order_item_id.in_(items)))
    infos: list[DownloadInfo] = []
    for token_row in token_result.scalars().all():
        if token_row.product_file_id is not None:
            file_row = await db.get(MarketplaceProductFile, token_row.product_file_id)
            if file_row is None:
                continue
            infos.append(DownloadInfo(
                token=token_row.token,
                file_name=file_row.file_name,
                file_size_bytes=file_row.file_size_bytes,
                expires_at=token_row.expires_at,
                is_used=token_row.is_used,
            ))
            continue
        item = items.get(token_row.order_item_id)
        if item is None:
            continue
        files_result = await db.execute(_package_files_query(item))
        package_files = list(files_result.scalars().all())
        infos.append(DownloadInfo(
            token=token_row.token,
            file_name=_safe_download_name(f"{item.product_slug}-{item.package_name}.zip"),
            file_size_bytes=sum(file.file_size_bytes for file in package_files),
            expires_at=token_row.expires_at,
            is_used=token_row.is_used,
        ))
    return infos
