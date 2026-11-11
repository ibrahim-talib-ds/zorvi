"""ZORVI — public marketplace browsing endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.models.product_image import ProductImage
from app.models.marketplace import (
    MarketplaceCategory,
    MarketplaceProduct,
    ProductDifficulty,
    ProductStatus,
)
from app.schemas.product_image import ProductImageRead
from app.schemas.marketplace import CategoryRead, ProductListItem, ProductRead

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


@router.get("/categories", response_model=list[CategoryRead])
async def list_categories(db: Annotated[AsyncSession, Depends(get_db)]) -> list[CategoryRead]:
    result = await db.execute(
        select(MarketplaceCategory)
        .where(MarketplaceCategory.is_active.is_(True))
        .order_by(MarketplaceCategory.sort_order, MarketplaceCategory.name)
    )
    return [CategoryRead.model_validate(c) for c in result.scalars().all()]


@router.get("/products", response_model=list[ProductListItem])
async def list_products(
    db: Annotated[AsyncSession, Depends(get_db)],
    category: str | None = None,
    difficulty: ProductDifficulty | None = None,
    featured: bool | None = None,
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[ProductListItem]:
    stmt = select(MarketplaceProduct).where(
        MarketplaceProduct.status == ProductStatus.published,
        MarketplaceProduct.deleted_at.is_(None),
    )
    if category:
        cat = await db.execute(
            select(MarketplaceCategory).where(
                MarketplaceCategory.slug == category,
                MarketplaceCategory.is_active.is_(True),
            )
        )
        cat_obj = cat.scalar_one_or_none()
        if cat_obj is None:
            return []
        stmt = stmt.where(MarketplaceProduct.category_id == cat_obj.id)
    if difficulty is not None:
        stmt = stmt.where(MarketplaceProduct.difficulty == difficulty)
    if featured is not None:
        stmt = stmt.where(MarketplaceProduct.is_featured == featured)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                MarketplaceProduct.title.ilike(like),
                MarketplaceProduct.short_description.ilike(like),
            )
        )
    stmt = (
        stmt.order_by(
            MarketplaceProduct.is_featured.desc(),
            MarketplaceProduct.created_at.desc(),
        )
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    products = result.scalars().all()

    # Fetch creator names
    creator_ids = list({p.creator_id for p in products if p.creator_id})
    creators = {}
    if creator_ids:
        creator_res = await db.execute(
            select(User).where(User.id.in_(creator_ids))
        )
        creators = {u.id: u for u in creator_res.scalars().all()}

    items = []
    for p in products:
        item = ProductListItem.model_validate(p)
        creator = creators.get(p.creator_id)
        if creator:
            item.creator_name = creator.full_name
            item.creator_avatar_url = creator.avatar_url
        items.append(item)
    return items


@router.get("/products/{slug}", response_model=ProductRead)
async def get_product(
    slug: str, db: Annotated[AsyncSession, Depends(get_db)]
) -> ProductRead:
    result = await db.execute(
        select(MarketplaceProduct).where(
            MarketplaceProduct.slug == slug,
            MarketplaceProduct.status == ProductStatus.published,
            MarketplaceProduct.deleted_at.is_(None),
        )
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="product not found"
        )

    # Fetch creator
    creator_name = None
    creator_avatar_url = None
    if product.creator_id:
        creator_res = await db.execute(
            select(User).where(User.id == product.creator_id)
        )
        creator = creator_res.scalar_one_or_none()
        if creator:
            creator_name = creator.full_name
            creator_avatar_url = creator.avatar_url

    product_read = ProductRead.model_validate(product)
    product_read.creator_name = creator_name
    product_read.creator_avatar_url = creator_avatar_url
    return product_read


@router.get("/creators/{creator_id}")
async def get_creator_profile(
    creator_id: str, db: Annotated[AsyncSession, Depends(get_db)]
):
    """Public creator profile — info + all their published products."""
    import uuid
    from app.schemas.user import UserRead
    
    try:
        creator_uuid = uuid.UUID(creator_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Creator not found")

    creator_res = await db.execute(
        select(User).where(User.id == creator_uuid, User.deleted_at.is_(None))
    )
    creator = creator_res.scalar_one_or_none()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")

    products_res = await db.execute(
        select(MarketplaceProduct)
        .where(
            MarketplaceProduct.creator_id == creator_uuid,
            MarketplaceProduct.status == ProductStatus.published,
            MarketplaceProduct.deleted_at.is_(None),
        )
        .order_by(MarketplaceProduct.created_at.desc())
    )
    products = products_res.scalars().all()

    return {
        "creator": {
            "id": str(creator.id),
            "full_name": creator.full_name,
            "avatar_url": creator.avatar_url,
            "role": creator.roles[0].name if creator.roles else "instructor",
            "joined_at": creator.created_at.isoformat(),
        },
        "products": [
            ProductListItem.model_validate(p).model_dump() for p in products
        ],
    }


@router.get("/products/{slug}/images", response_model=list[ProductImageRead])
async def get_product_images(
    slug: str, db: Annotated[AsyncSession, Depends(get_db)]
):
    """Public: fetch all gallery images for a product."""
    product_res = await db.execute(
        select(MarketplaceProduct).where(
            MarketplaceProduct.slug == slug,
            MarketplaceProduct.deleted_at.is_(None),
        )
    )
    product = product_res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="product not found")

    images_res = await db.execute(
        select(ProductImage)
        .where(ProductImage.product_id == product.id)
        .order_by(ProductImage.sort_order, ProductImage.created_at)
    )
    return [ProductImageRead.model_validate(i) for i in images_res.scalars().all()]
