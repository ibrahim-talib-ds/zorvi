"""ZORVI — user endpoints."""
import re
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func as sql_func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.lesson_progress import LessonProgress
from app.models.order import Order, OrderStatus
from app.models.course_module import CourseModule
from app.models.user import User
from app.schemas.user import UserRead, UserStats, UserUpdate
from app.services.storage import LocalStorage

router = APIRouter(prefix="/users", tags=["users"])

AVATAR_DIR = Path(__file__).resolve().parents[2] / "storage" / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)

AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_AVATAR_SIZE = 2 * 1024 * 1024  # 2 MB


@router.get("/me", response_model=UserRead, summary="Current authenticated user")
async def read_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead, summary="Update current user")
async def update_me(
    payload: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserRead:
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip() or None
    await db.commit()
    await db.refresh(current_user)
    return UserRead.model_validate(current_user)


@router.post("/me/avatar", response_model=UserRead, summary="Upload avatar")
async def upload_avatar(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> UserRead:
    orig = file.filename or "avatar"
    ext = "." + orig.rsplit(".", 1)[-1].lower() if "." in orig else ""
    if ext not in AVATAR_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Avatar must be: {', '.join(sorted(AVATAR_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=413, detail="Avatar must be under 2 MB")

    safe_name = f"{current_user.id}{ext}"
    file_path = AVATAR_DIR / safe_name
    file_path.write_bytes(content)

    current_user.avatar_url = f"/api/v1/users/avatars/{safe_name}"
    await db.commit()
    await db.refresh(current_user)
    return UserRead.model_validate(current_user)


@router.get("/avatars/{filename}", include_in_schema=False)
async def serve_avatar(filename: str):
    """Serve avatar files. Public (avatars are not sensitive)."""
    from fastapi.responses import FileResponse
    # Sanitize
    if not re.match(r"^[a-f0-9-]+\.[a-z]+$", filename):
        raise HTTPException(status_code=404, detail="not found")
    file_path = AVATAR_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="not found")
    return FileResponse(file_path)


@router.get("/me/stats", response_model=UserStats, summary="User activity stats")
async def get_my_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserStats:
    orders_count = (await db.execute(
        select(sql_func.count(Order.id)).where(Order.user_id == current_user.id)
    )).scalar() or 0

    courses_enrolled = (await db.execute(
        select(sql_func.count(Enrollment.id)).where(Enrollment.user_id == current_user.id)
    )).scalar() or 0

    lessons_completed = (await db.execute(
        select(sql_func.count(LessonProgress.id)).where(
            LessonProgress.user_id == current_user.id
        )
    )).scalar() or 0

    return UserStats(
        orders_count=orders_count,
        courses_enrolled=courses_enrolled,
        lessons_completed=lessons_completed,
    )

@router.post("/me/delete", summary="Soft-delete current account")
async def delete_my_account(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Soft-delete the current user's account. Marks deleted_at and deactivates."""
    from datetime import datetime, timezone
    current_user.deleted_at = datetime.now(timezone.utc)
    current_user.is_active = False
    await db.commit()
    return {"message": "Account deleted successfully"}
