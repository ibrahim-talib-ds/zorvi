import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.notification import Notification
from app.models.notification_receipt import NotificationReceipt
from app.models.user import User
from app.schemas.notification import NotificationRead

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _read_payload(note: Notification, receipt: NotificationReceipt | None):
    data = NotificationRead.model_validate(note).model_dump()
    if note.is_broadcast:
        data["read_at"] = (receipt.read_at if receipt else None) or note.read_at
    return data


async def _get_receipt(db: AsyncSession, notification_id: uuid.UUID, user_id: uuid.UUID):
    result = await db.execute(
        select(NotificationReceipt).where(
            NotificationReceipt.notification_id == notification_id,
            NotificationReceipt.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


@router.get("", response_model=list[NotificationRead])
async def list_my_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Notification, NotificationReceipt)
        .outerjoin(
            NotificationReceipt,
            (NotificationReceipt.notification_id == Notification.id)
            & (NotificationReceipt.user_id == current_user.id),
        )
        .where(
            or_(Notification.user_id == current_user.id, Notification.is_broadcast.is_(True)),
            or_(NotificationReceipt.id.is_(None), NotificationReceipt.dismissed_at.is_(None)),
        )
        .order_by(Notification.created_at.desc())
        .limit(100)
    )
    return [_read_payload(note, receipt) for note, receipt in result.all()]


@router.post("/mark-all-read")
async def mark_all_read(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Notification).where(
            or_(Notification.user_id == current_user.id, Notification.is_broadcast.is_(True))
        )
    )
    now = datetime.now(timezone.utc)
    updated = 0
    for note in result.scalars().all():
        if note.is_broadcast:
            receipt = await _get_receipt(db, note.id, current_user.id)
            if receipt is None:
                db.add(NotificationReceipt(notification_id=note.id, user_id=current_user.id, read_at=now))
                updated += 1
            elif receipt.dismissed_at is None and receipt.read_at is None:
                receipt.read_at = now
                updated += 1
        elif note.user_id == current_user.id and note.read_at is None:
            note.read_at = now
            updated += 1
    await db.commit()
    return {"status": "ok", "updated": updated}


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        nid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Notification not found")
    result = await db.execute(select(Notification).where(Notification.id == nid))
    note = result.scalar_one_or_none()
    if note is None or (note.user_id != current_user.id and not note.is_broadcast):
        raise HTTPException(status_code=404, detail="Notification not found")

    now = datetime.now(timezone.utc)
    if note.is_broadcast:
        receipt = await _get_receipt(db, note.id, current_user.id)
        if receipt is None:
            db.add(NotificationReceipt(notification_id=note.id, user_id=current_user.id, read_at=now))
        else:
            receipt.read_at = receipt.read_at or now
    else:
        note.read_at = note.read_at or now
    await db.commit()
    return {"status": "ok"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        nid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Notification not found")
    result = await db.execute(select(Notification).where(Notification.id == nid))
    note = result.scalar_one_or_none()
    if note is None or (note.user_id != current_user.id and not note.is_broadcast):
        raise HTTPException(status_code=404, detail="Notification not found")

    if note.is_broadcast:
        receipt = await _get_receipt(db, note.id, current_user.id)
        if receipt is None:
            db.add(NotificationReceipt(
                notification_id=note.id,
                user_id=current_user.id,
                dismissed_at=datetime.now(timezone.utc),
            ))
        else:
            receipt.dismissed_at = datetime.now(timezone.utc)
    else:
        await db.delete(note)
    await db.commit()
    return {"status": "ok"}
