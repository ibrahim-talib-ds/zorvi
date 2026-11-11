import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationRead

router = APIRouter(
    prefix="/admin/notifications",
    tags=["admin-notifications"],
    dependencies=[Depends(require_role("admin", "super_admin"))],
)


@router.get("")
async def list_all_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: str | None = None,
):
    """List ALL notifications (optionally filter by user)."""
    stmt = select(Notification).order_by(Notification.created_at.desc()).limit(100)
    if user_id:
        import uuid
        try:
            uid = uuid.UUID(user_id)
            stmt = stmt.where(Notification.user_id == uid)
        except ValueError:
            pass
    res = await db.execute(stmt)
    return [NotificationRead.model_validate(n) for n in res.scalars().all()]


@router.post("", status_code=201)
async def create_notification(
    payload: NotificationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin: send a notification to multiple users or broadcast to all."""
    # Determine target user list
    targets: list[uuid.UUID | None] = []
    if payload.user_ids and len(payload.user_ids) > 0:
        targets = list(payload.user_ids)
    elif payload.user_id:
        targets = [payload.user_id]
    else:
        targets = [None]  # Broadcast

    created = []
    for uid in targets:
        note = Notification(
            user_id=uid,
            title=payload.title,
            message=payload.message,
            href=payload.href,
            type=payload.type,
            is_broadcast=(uid is None),
        )
        db.add(note)
        created.append(note)

    await db.commit()
    for n in created:
        await db.refresh(n)

    if len(created) == 1:
        return NotificationRead.model_validate(created[0])
    return {"created": len(created), "notifications": [NotificationRead.model_validate(n) for n in created]}


@router.delete("/{notification_id}")
async def admin_delete_notification(
    notification_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin: delete a notification."""
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
