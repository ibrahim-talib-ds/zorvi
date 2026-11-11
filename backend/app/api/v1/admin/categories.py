"""ZORVI — admin category CRUD."""
import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models.marketplace import MarketplaceCategory
from app.models.user import User
from app.schemas.marketplace import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(
    prefix="/admin/categories",
    tags=["admin:categories"],
    dependencies=[Depends(require_role("admin", "super_admin"))],
)


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "category"


async def _unique_category_slug(db: AsyncSession, base: str) -> str:
    slug = base
    i = 1
    while True:
        existing = await db.execute(
            select(MarketplaceCategory).where(MarketplaceCategory.slug == slug)
        )
        if existing.scalar_one_or_none() is None:
            return slug
        i += 1
        slug = f"{base}-{i}"


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> CategoryRead:
    slug = payload.slug or await _unique_category_slug(db, _slugify(payload.name))
    if payload.slug:
        existing = await db.execute(
            select(MarketplaceCategory).where(MarketplaceCategory.slug == slug)
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="slug already in use")
    category = MarketplaceCategory(
        name=payload.name, slug=slug, description=payload.description,
        parent_id=payload.parent_id, sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return CategoryRead.model_validate(category)


@router.patch("/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: uuid.UUID,
    payload: CategoryUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> CategoryRead:
    category = await db.get(MarketplaceCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="category not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    await db.commit()
    await db.refresh(category)
    return CategoryRead.model_validate(category)

@router.get("", response_model=list[CategoryRead])
async def list_categories(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
    include_inactive: bool = False,
) -> list[CategoryRead]:
    """Admin view: list all categories, optionally including inactive."""
    stmt = select(MarketplaceCategory).order_by(
        MarketplaceCategory.sort_order, MarketplaceCategory.name
    )
    if not include_inactive:
        stmt = stmt.where(MarketplaceCategory.is_active.is_(True))
    result = await db.execute(stmt)
    return [CategoryRead.model_validate(c) for c in result.scalars().all()]


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> None:
    """Soft-delete a category by setting is_active=false."""
    category = await db.get(MarketplaceCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="category not found")
    category.is_active = False
    await db.commit()
