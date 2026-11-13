from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.message import Message
from app.schemas.message import MessageCreate

router = APIRouter(prefix="/messages", tags=["messages"])

@router.post("")
async def send_message(
    payload: MessageCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    msg = Message(
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        product_id=payload.product_id,
        subject=payload.subject,
        body=payload.body,
    )
    db.add(msg)
    await db.commit()
    return {"status": "ok", "message": "Message sent successfully"}
