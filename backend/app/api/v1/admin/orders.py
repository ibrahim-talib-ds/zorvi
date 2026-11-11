"""ZORVI — admin order management (mark-paid / cancelled / refunded).

Only path in the entire system that sets status='paid'. Provider webhooks
will plug into the same helper in a later phase.
"""
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models.download_token import DownloadToken
from app.models.marketplace import MarketplaceProductFile
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.schemas.order import (
    AdminNoteRequest,
    DownloadTokenIssue,
    MarkPaidResponse,
    OrderRead,
)

router = APIRouter(
    prefix="/admin/orders",
    tags=["admin:orders"],
    dependencies=[Depends(require_role("admin", "super_admin"))],
)

DOWNLOAD_TOKEN_TTL_MINUTES = 15


def _issue_token() -> str:
    return secrets.token_urlsafe(48)[:64]


@router.get("", response_model=list[OrderRead])
async def list_all_orders(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
    order_status: OrderStatus | None = None,
    limit: int = 100,
) -> list[OrderRead]:
    stmt = select(Order).order_by(Order.created_at.desc()).limit(min(limit, 500))
    if order_status is not None:
        stmt = stmt.where(Order.status == order_status)
    result = await db.execute(stmt)
    return [OrderRead.model_validate(o) for o in result.scalars().all()]


@router.get("/{order_id}", response_model=OrderRead)
async def get_order(
    order_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> OrderRead:
    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="order not found")
    return OrderRead.model_validate(order)


@router.post("/{order_id}/mark-paid", response_model=MarkPaidResponse)
async def mark_paid(
    order_id: uuid.UUID,
    payload: AdminNoteRequest,
    admin: Annotated[User, Depends(require_role("admin", "super_admin"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MarkPaidResponse:
    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="order not found")
    if order.status == OrderStatus.paid:
        raise HTTPException(status_code=409, detail="order already paid")
    if order.status not in (OrderStatus.pending, OrderStatus.awaiting_verification):
        raise HTTPException(
            status_code=409,
            detail=f"cannot mark '{order.status.value}' as paid",
        )

    now = datetime.now(timezone.utc)
    order.status = OrderStatus.paid
    order.paid_at = now
    order.marked_paid_by_id = admin.id
    if payload.admin_note is not None:
        order.admin_note = payload.admin_note

    # Issue one download token per file attached to each ordered package,
    # plus shared files (package_id IS NULL) on the product.
    issued: list[DownloadTokenIssue] = []
    expires_at = now + timedelta(minutes=DOWNLOAD_TOKEN_TTL_MINUTES)

    for item in order.items:
        stmt = select(MarketplaceProductFile).where(
            MarketplaceProductFile.product_id == item.product_id,
            MarketplaceProductFile.is_active.is_(True),
        )
        # match files for this package OR shared files (package_id null)
        result = await db.execute(stmt)
        candidate_files = result.scalars().all()
        for f in candidate_files:
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
                DownloadTokenIssue(
                    order_item_id=item.id,
                    token=tok.token,
                    expires_at=tok.expires_at,
                    file_name=f.file_name,
                )
            )

    await db.commit()
    await db.refresh(order)
    return MarkPaidResponse(
        order=OrderRead.model_validate(order),
        download_tokens=issued,
    )


@router.post("/{order_id}/mark-cancelled", response_model=OrderRead)
async def mark_cancelled(
    order_id: uuid.UUID,
    payload: AdminNoteRequest,
    admin: Annotated[User, Depends(require_role("admin", "super_admin"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrderRead:
    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="order not found")
    if order.status in (OrderStatus.cancelled, OrderStatus.refunded):
        raise HTTPException(status_code=409, detail=f"already {order.status.value}")
    order.status = OrderStatus.cancelled
    if payload.admin_note is not None:
        order.admin_note = payload.admin_note
    await db.commit()
    await db.refresh(order)
    return OrderRead.model_validate(order)


@router.post("/{order_id}/mark-refunded", response_model=OrderRead)
async def mark_refunded(
    order_id: uuid.UUID,
    payload: AdminNoteRequest,
    admin: Annotated[User, Depends(require_role("admin", "super_admin"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrderRead:
    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="order not found")
    if order.status != OrderStatus.paid:
        raise HTTPException(status_code=409, detail="only paid orders can be refunded")
    order.status = OrderStatus.refunded
    order.refunded_at = datetime.now(timezone.utc)
    if payload.admin_note is not None:
        order.admin_note = payload.admin_note
    await db.commit()
    await db.refresh(order)
    return OrderRead.model_validate(order)
