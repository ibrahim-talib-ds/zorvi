from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.rbac import require_role
from app.models.user import User
from app.models.message import Message
from app.models.marketplace import MarketplaceProduct
from app.schemas.message import MessageRead

router = APIRouter(
    prefix="/admin/messages",
    tags=["admin:messages"],
    dependencies=[Depends(require_role("admin", "super_admin"))],
)

@router.get("", response_model=list[MessageRead])
async def list_messages(db: Annotated[AsyncSession, Depends(get_db)]):
    stmt = select(Message).order_by(Message.created_at.desc()).limit(100)
    result = await db.execute(stmt)
    messages = result.scalars().all()

    sender_ids = list({m.sender_id for m in messages})
    senders = {}
    if sender_ids:
        s_res = await db.execute(select(User).where(User.id.in_(sender_ids)))
        senders = {u.id: u for u in s_res.scalars().all()}

    prod_ids = list({m.product_id for m in messages if m.product_id})
    products = {}
    if prod_ids:
        p_res = await db.execute(select(MarketplaceProduct).where(MarketplaceProduct.id.in_(prod_ids)))
        products = {p.id: p for p in p_res.scalars().all()}

    items = []
    for m in messages:
        item = MessageRead.model_validate(m)
        sender = senders.get(m.sender_id)
        if sender:
            item.sender_name = sender.full_name
            item.sender_email = sender.email
        if m.product_id and m.product_id in products:
            item.product_title = products[m.product_id].title
        items.append(item)
    return items
