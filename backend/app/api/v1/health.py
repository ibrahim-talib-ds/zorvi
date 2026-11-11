"""ZORVI — health check endpoint. Proves DB connectivity on every request."""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db

log = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)) -> dict:
    settings = get_settings()
    try:
        result = await db.execute(text("SELECT version()"))
        db_version = result.scalar_one()
    except Exception as exc:  # noqa: BLE001
        log.exception("health: database check failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"database unavailable: {type(exc).__name__}",
        ) from exc

    return {
        "status": "ok",
        "database": "connected",
        "db_version": db_version.split(",")[0],
        "service": settings.PROJECT_NAME,
        "tagline": settings.PROJECT_TAGLINE,
        "environment": settings.ENVIRONMENT,
    }
