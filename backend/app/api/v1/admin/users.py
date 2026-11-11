from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter(
    prefix="/admin/users",
    tags=["admin-users"],
    dependencies=[Depends(require_role("admin", "super_admin"))],
)


@router.get("", response_model=list[UserRead])
async def search_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
):
    """Admin: search users by name or email."""
    stmt = select(User).where(User.deleted_at.is_(None))
    
    if search and search.strip():
        q = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                User.email.ilike(q),
                User.full_name.ilike(q),
            )
        )
    
    stmt = stmt.order_by(User.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return [UserRead.model_validate(u) for u in res.scalars().all()]
