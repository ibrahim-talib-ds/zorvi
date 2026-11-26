import uuid
from typing import Annotated
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.rbac import require_role
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.notification import Notification
from app.schemas.order import OrderRead, AdminNoteRequest

router = APIRouter(
    prefix="/admin/orders",
    tags=["admin:orders"],
    dependencies=[Depends(require_role("admin", "super_admin"))],
)

@router.get("", response_model=list[OrderRead])
async def list_orders(
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: OrderStatus | None = None,
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    
    result = await db.execute(stmt)
    orders = result.scalars().all()
    
    # Attach user info
    user_ids = {o.user_id for o in orders}
    users_res = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = {u.id: u for u in users_res.scalars().all()}
    
    items = []
    for o in orders:
        order_data = OrderRead.model_validate(o)
        user = users.get(o.user_id)
        if user:
            order_data.buyer_email = user.email
            order_data.buyer_name = user.full_name
        items.append(order_data)
    
    return items

@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.delete(order)
    await db.commit()
    return None

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_orders(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from sqlalchemy import delete
    await db.execute(delete(Order))
    await db.commit()
    return None

# --- Keep existing mark-paid logic ---
@router.post("/{order_id}/mark-paid")
async def mark_paid(
    order_id: uuid.UUID,
    payload: AdminNoteRequest,
    admin: Annotated[User, Depends(require_role("admin", "super_admin"))],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="order not found")
    if order.status == OrderStatus.paid:
        raise HTTPException(status_code=409, detail="order already paid")
    if order.status not in (OrderStatus.pending, OrderStatus.awaiting_verification):
        raise HTTPException(status_code=409, detail=f"cannot mark '{order.status.value}' as paid")

    now = datetime.now(timezone.utc)
    order.status = OrderStatus.paid
    order.paid_at = now
    order.marked_paid_by_id = admin.id
    if payload.admin_note is not None:
        order.admin_note = payload.admin_note

    db.add(Notification(
        user_id=order.user_id,
        title="Payment approved",
        message=f"Your payment for order #{str(order.id)[:8]} was approved. Your downloads are ready.",
        href=f"/account/orders/{order.id}",
        type="success",
        is_broadcast=False,
    ))

    # Issue one package-level download (a ZIP archive unless a single ZIP was uploaded).
    from datetime import timedelta
    from app.services.downloads import issue_order_download_tokens
    from app.schemas.order import DownloadTokenIssue, MarkPaidResponse

    issued = await issue_order_download_tokens(
        db,
        list(order.items),
        now + timedelta(minutes=60),
    )

    await db.commit()
    await db.refresh(order)
    return MarkPaidResponse(
        order=OrderRead.model_validate(order),
        download_tokens=[DownloadTokenIssue.model_validate(item.model_dump()) for item in issued],
    )

@router.post("/{order_id}/mark-cancelled", response_model=OrderRead)
async def mark_cancelled(
    order_id: uuid.UUID,
    payload: AdminNoteRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404)
    order.status = OrderStatus.cancelled
    db.add(Notification(
        user_id=order.user_id,
        title="Order cancelled",
        message=f"Your order #{str(order.id)[:8]} was cancelled by the marketplace team.",
        href=f"/account/orders/{order.id}",
        type="warning",
        is_broadcast=False,
    ))
    if payload.admin_note:
        order.admin_note = payload.admin_note
    await db.commit()
    await db.refresh(order)
    return OrderRead.model_validate(order)

@router.post("/{order_id}/mark-refunded", response_model=OrderRead)
async def mark_refunded(
    order_id: uuid.UUID,
    payload: AdminNoteRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404)
    order.status = OrderStatus.refunded
    order.refunded_at = datetime.now(timezone.utc)
    db.add(Notification(
        user_id=order.user_id,
        title="Order refunded",
        message=f"Your order #{str(order.id)[:8]} has been marked as refunded.",
        href=f"/account/orders/{order.id}",
        type="warning",
        is_broadcast=False,
    ))
    if payload.admin_note:
        order.admin_note = payload.admin_note
    await db.commit()
    await db.refresh(order)
    return OrderRead.model_validate(order)
