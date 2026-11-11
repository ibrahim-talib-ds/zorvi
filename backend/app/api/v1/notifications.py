from typing import Annotated
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationRead

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationRead])
async def list_my_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    res = await db.execute(
        select(Notification)
        .where(
            or_(
                Notification.user_id == current_user.id,
                Notification.is_broadcast.is_(True),
            )
        )
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return [NotificationRead.model_validate(n) for n in res.scalars().all()]


@router.post("/mark-all-read")
async def mark_all_read(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    res = await db.execute(
        select(Notification).where(
            or_(
                Notification.user_id == current_user.id,
                Notification.is_broadcast.is_(True),
            ),
            Notification.read_at.is_(None),
        )
    )
    notes = res.scalars().all()
    now = datetime.now(timezone.utc)
    for note in notes:
        note.read_at = now
    await db.commit()
    return {"status": "ok", "updated": len(notes)}


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    import uuid
    try:
        nid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=404)

    res = await db.execute(select(Notification).where(Notification.id == nid))
    note = res.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404)

    note.read_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "ok"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    import uuid
    try:
        nid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=404)

    res = await db.execute(select(Notification).where(Notification.id == nid))
    note = res.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404)

    await db.delete(note)
    await db.commit()
    return {"status": "ok"}
