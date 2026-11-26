import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.marketplace import MarketplaceProduct
from app.models.message import Message
from app.models.user import User
from app.schemas.message import MessageCreate, MessageRead

router = APIRouter(prefix="/messages", tags=["messages"])


async def _serialize_messages(db: AsyncSession, messages: list[Message]) -> list[MessageRead]:
    user_ids = {m.sender_id for m in messages} | {m.receiver_id for m in messages}
    users: dict[uuid.UUID, User] = {}
    if user_ids:
        result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users = {user.id: user for user in result.scalars().all()}
    product_ids = {m.product_id for m in messages if m.product_id}
    products: dict[uuid.UUID, MarketplaceProduct] = {}
    if product_ids:
        result = await db.execute(select(MarketplaceProduct).where(MarketplaceProduct.id.in_(product_ids)))
        products = {product.id: product for product in result.scalars().all()}

    items: list[MessageRead] = []
    for message in messages:
        item = MessageRead.model_validate(message)
        sender = users.get(message.sender_id)
        receiver = users.get(message.receiver_id)
        item.sender_name = sender.full_name if sender else None
        item.sender_email = sender.email if sender else None
        item.receiver_name = receiver.full_name if receiver else None
        if message.product_id and message.product_id in products:
            item.product_title = products[message.product_id].title
        items.append(item)
    return items


@router.get("", response_model=list[MessageRead])
async def list_my_messages(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Message)
        .where(or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id))
        .order_by(Message.created_at.desc())
        .limit(200)
    )
    return await _serialize_messages(db, list(result.scalars().all()))


@router.post("", status_code=status.HTTP_201_CREATED)
async def send_message(
    payload: MessageCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if payload.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot message yourself.")

    receiver = await db.get(User, payload.receiver_id)
    if not receiver or not receiver.is_active:
        raise HTTPException(status_code=404, detail="Message recipient not found.")

    if payload.product_id:
        product = await db.get(MarketplaceProduct, payload.product_id)
        if not product or product.deleted_at is not None:
            raise HTTPException(status_code=404, detail="Marketplace product not found.")
        if product.creator_id != payload.receiver_id:
            raise HTTPException(status_code=400, detail="The recipient must be the seller of this product.")

    msg = Message(
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        product_id=payload.product_id,
        subject=payload.subject.strip(),
        body=payload.body.strip(),
    )
    db.add(msg)
    await db.commit()
    return {"status": "ok", "id": str(msg.id), "message": "Message sent successfully"}


@router.post("/{message_id}/read")
async def mark_message_read(
    message_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    message = await db.get(Message, message_id)
    if not message or message.receiver_id != current_user.id:
        raise HTTPException(status_code=404, detail="Message not found.")
    message.is_read = True
    await db.commit()
    return {"status": "ok"}
