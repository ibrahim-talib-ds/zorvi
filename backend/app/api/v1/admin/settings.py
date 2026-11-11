"""ZORVI — Admin platform settings endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models.platform_setting import PlatformSetting
from app.schemas.admin_settings import (
    SettingItem,
    SettingsRead,
    SettingsUpdate,
)

# Router-level dependency: all endpoints require admin role
router = APIRouter(
    prefix="/admin/settings",
    tags=["admin:settings"],
    dependencies=[Depends(require_role("admin", "super_admin"))],
)


@router.get("", response_model=SettingsRead)
async def get_settings(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SettingsRead:
    result = await db.execute(select(PlatformSetting).order_by(PlatformSetting.key))
    items = [
        SettingItem(key=s.key, value=s.value, description=s.description)
        for s in result.scalars().all()
    ]
    return SettingsRead(settings=items)


@router.patch("", response_model=SettingsRead)
async def update_settings(
    payload: SettingsUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SettingsRead:
    for key, value in payload.settings.items():
        result = await db.execute(
            select(PlatformSetting).where(PlatformSetting.key == key)
        )
        setting = result.scalar_one_or_none()
        if setting is not None:
            setting.value = value

    await db.commit()

    result = await db.execute(select(PlatformSetting).order_by(PlatformSetting.key))
    items = [
        SettingItem(key=s.key, value=s.value, description=s.description)
        for s in result.scalars().all()
    ]
    return SettingsRead(settings=items)
