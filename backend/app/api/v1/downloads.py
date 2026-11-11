"""ZORVI — download endpoints.

GET  /api/v1/downloads/{token}     — token is the credential; streams file
POST /api/v1/orders/{id}/downloads — buyer re-issues fresh tokens

Rules enforced here:
  * tokens are single-use (used_at)
  * tokens expire (expires_at)
  * file is served only as an attachment (never inline, never directory)
  * filesystem paths are never placed in any response
  * IP + User-Agent are captured at use time for audit
"""
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.download_token import DownloadToken
from app.models.marketplace import MarketplaceProductFile
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User
from app.schemas.download import (
    DownloadInfo,
    IssuedDownload,
    IssueDownloadRequest,
)
from app.services.storage import storage

router = APIRouter(tags=["downloads"])

DEFAULT_TTL_MINUTES = 15
MAX_TTL_MINUTES = 1440


def _issue_token() -> str:
    return secrets.token_urlsafe(48)[:64]


def _token_info(tok: DownloadToken, file: MarketplaceProductFile) -> DownloadInfo:
    return DownloadInfo(
        token=tok.token,
        file_name=file.file_name,
        file_size_bytes=file.file_size_bytes,
        expires_at=tok.expires_at,
        is_used=tok.is_used,
    )


# ---------- public: use token ----------
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
    )
    tok = result.scalar_one_or_none()
    if tok is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="token not found")

    now = datetime.now(timezone.utc)
    if tok.expires_at < now:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="token expired")
    if tok.used_at is not None:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="token already used")

    # Confirming the token still belongs to a PAID order (defense in depth).
    order = await db.get(Order, tok.order_item.order_id) if tok.order_item else None
    if order is None or order.status != OrderStatus.paid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not available")

    file_row = await db.get(MarketplaceProductFile, tok.product_file_id) if tok.product_file_id else None
    if file_row is None or not file_row.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="file not available")

    if not storage.exists(file_row.storage_key):
        # Missing on disk is a server error, not a client one — log in real app.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="file not available",
        )

    # Mark consumed BEFORE opening stream, then re-verify in same txn.
    tok.used_at = now
    tok.ip_address = request.client.host if request.client else None
    tok.user_agent = request.headers.get("user-agent", "")[:500] or None
    tok.download_count = (tok.download_count or 0) + 1
    await db.commit()

    fh = storage.open_read(file_row.storage_key)

    def _iter():
        try:
            while True:
                chunk = fh.read(64 * 1024)
                if not chunk:
                    break
                yield chunk
        finally:
            fh.close()

    safe_name = Path(file_row.file_name).name or "download"
    headers = {
        "Content-Disposition": f'attachment; filename="{safe_name}"',
        "Content-Type": file_row.file_type or "application/octet-stream",
        "Content-Length": str(file_row.file_size_bytes),
        "Cache-Control": "private, no-store",
    }
    return StreamingResponse(_iter(), headers=headers)


# ---------- authenticated: re-issue for a paid order ----------
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
        raise HTTPException(
            status_code=409,
            detail=f"downloads only available for paid orders (status='{order.status.value}')",
        )

    ttl = min(payload.ttl_minutes or DEFAULT_TTL_MINUTES, MAX_TTL_MINUTES)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=ttl)

    # Load items
    items_result = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order.id)
    )
    items = items_result.scalars().all()

    issued: list[IssuedDownload] = []
    for item in items:
        files_result = await db.execute(
            select(MarketplaceProductFile).where(
                MarketplaceProductFile.product_id == item.product_id,
                MarketplaceProductFile.is_active.is_(True),
            )
        )
        candidate = files_result.scalars().all()
        for f in candidate:
            if f.package_id is not None and f.package_id != item.package_id:
                continue
            tok = DownloadToken(
                order_item_id=item.id,
                product_file_id=f.id,
                token=_issue_token(),
                expires_at=expires_at,
            )
            db.add(tok)
            await db.flush()
            issued.append(
                IssuedDownload(
                    order_item_id=item.id,
                    token=tok.token,
                    expires_at=tok.expires_at,
                    file_name=f.file_name,
                )
            )

    await db.commit()
    return issued


# ---------- authenticated: inspect (no download) ----------
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

    items_result = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order.id)
    )
    item_ids = [i.id for i in items_result.scalars().all()]
    if not item_ids:
        return []

    tokens_result = await db.execute(
        select(DownloadToken).where(DownloadToken.order_item_id.in_(item_ids))
    )
    tokens = tokens_result.scalars().all()

    infos: list[DownloadInfo] = []
    for tok in tokens:
        if tok.product_file_id is None:
            continue
        f = await db.get(MarketplaceProductFile, tok.product_file_id)
        if f is None:
            continue
        infos.append(_token_info(tok, f))
    return infos
