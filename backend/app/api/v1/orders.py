"""ZORVI — buyer-facing order endpoints."""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.marketplace import (
    MarketplacePackage,
    MarketplaceProduct,
    ProductStatus,
)
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User
from app.schemas.order import (
    OrderCreate,
    OrderRead,
    SubmitPaymentRequest,
)

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrderRead:
    order = Order(
        user_id=user.id,
        status=OrderStatus.pending,
        total_cents=0,
        currency=payload.currency.upper(),
        buyer_note=payload.buyer_note,
    )
    db.add(order)
    await db.flush()

    total = 0
    for item_in in payload.items:
        pkg = await db.get(MarketplacePackage, item_in.package_id)
        if pkg is None or not pkg.is_active:
            raise HTTPException(status_code=400, detail=f"package {item_in.package_id} unavailable")
        product = await db.get(MarketplaceProduct, pkg.product_id)
        if (
            product is None
            or product.status != ProductStatus.published
            or product.deleted_at is not None
        ):
            raise HTTPException(status_code=400, detail=f"product for package {pkg.id} not for sale")

        snapshot = OrderItem(
            order_id=order.id,
            product_id=product.id,
            package_id=pkg.id,
            product_title=product.title,
            product_slug=product.slug,
            package_name=pkg.name,
            license_type=pkg.license_type.value,
            price_cents=pkg.price_cents,
            currency=pkg.currency.upper(),
        )
        db.add(snapshot)
        total += pkg.price_cents

    order.total_cents = total
    await db.commit()
    await db.refresh(order)

    result = await db.execute(select(Order).where(Order.id == order.id))
    order = result.scalar_one()
    return OrderRead.model_validate(order)


@router.get("", response_model=list[OrderRead])
async def list_my_orders(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[OrderRead]:
    result = await db.execute(
        select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc())
    )
    return [OrderRead.model_validate(o) for o in result.scalars().all()]


@router.get("/{order_id}", response_model=OrderRead)
async def get_my_order(
    order_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrderRead:
    order = await db.get(Order, order_id)
    if order is None or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="order not found")
    return OrderRead.model_validate(order)


@router.post("/{order_id}/submit-payment", response_model=OrderRead)
async def submit_payment(
    order_id: uuid.UUID,
    payload: SubmitPaymentRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrderRead:
    order = await db.get(Order, order_id)
    if order is None or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="order not found")
    if order.status not in (OrderStatus.pending, OrderStatus.awaiting_verification):
        raise HTTPException(
            status_code=409,
            detail=f"order in status '{order.status.value}' cannot submit payment",
        )

    order.payment_method = payload.payment_method
    order.payment_reference = payload.payment_reference
    order.payment_proof_url = payload.payment_proof_url
    if payload.buyer_note is not None:
        order.buyer_note = payload.buyer_note
    order.status = OrderStatus.awaiting_verification
    await db.commit()
    await db.refresh(order)
    return OrderRead.model_validate(order)


@router.post("/{order_id}/cancel", response_model=OrderRead)
async def cancel_my_order(
    order_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrderRead:
    order = await db.get(Order, order_id)
    if order is None or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="order not found")
    if order.status not in (OrderStatus.pending, OrderStatus.awaiting_verification):
        raise HTTPException(status_code=409, detail=f"cannot cancel order in status '{order.status.value}'")
    order.status = OrderStatus.cancelled
    await db.commit()
    await db.refresh(order)
    return OrderRead.model_validate(order)
