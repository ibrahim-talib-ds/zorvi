import re
"""ZORVI — admin marketplace product CRUD."""
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models.product_image import ProductImage
from app.schemas.product_image import ProductImageCreate, ProductImageRead
from app.models.marketplace import (
    MarketplaceCategory,
    MarketplacePackage,
    MarketplaceProduct,
    MarketplaceProductFile,
    ProductStatus,
)
from app.models.user import User
from app.services.storage import storage
from app.schemas.marketplace import (
    PackageCreate,
    PackageRead,
    ProductCreate,
    ProductRead,
    ProductUpdate,
)

router = APIRouter(
    prefix="/admin/marketplace",
    tags=["admin:marketplace"],
    dependencies=[Depends(require_role("admin", "super_admin"))],
)


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "product"


async def _unique_product_slug(db: AsyncSession, base: str) -> str:
    slug = base
    i = 1
    while True:
        existing = await db.execute(
            select(MarketplaceProduct).where(
                MarketplaceProduct.slug == slug,
                MarketplaceProduct.deleted_at.is_(None),
            )
        )
        if existing.scalar_one_or_none() is None:
            return slug
        i += 1
        slug = f"{base}-{i}"


# ---------- Dashboard stats ----------

@router.get("/stats")
async def dashboard_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> dict:
    """Return aggregate stats for admin dashboard."""
    from sqlalchemy import func as sql_func
    
    products_count = (await db.execute(
        select(sql_func.count(MarketplaceProduct.id)).where(MarketplaceProduct.deleted_at.is_(None))
    )).scalar() or 0
    
    from app.models.order import Order, OrderStatus
    orders_count = (await db.execute(
        select(sql_func.count(Order.id))
    )).scalar() or 0
    
    paid_orders = (await db.execute(
        select(sql_func.count(Order.id)).where(Order.status == OrderStatus.paid)
    )).scalar() or 0
    
    revenue_cents = (await db.execute(
        select(sql_func.coalesce(sql_func.sum(Order.total_cents), 0)).where(Order.status == OrderStatus.paid)
    )).scalar() or 0
    
    from app.models.user import User as UserModel
    customers_count = (await db.execute(
        select(sql_func.count(UserModel.id)).where(UserModel.deleted_at.is_(None))
    )).scalar() or 0
    
    return {
        "products_count": products_count,
        "orders_count": orders_count,
        "paid_orders_count": paid_orders,
        "revenue_cents": int(revenue_cents),
        "customers_count": customers_count,
    }


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> ProductRead:
    if payload.category_id is not None:
        cat = await db.get(MarketplaceCategory, payload.category_id)
        if cat is None:
            raise HTTPException(status_code=400, detail="category not found")
    slug = payload.slug or await _unique_product_slug(db, _slugify(payload.title))
    if payload.slug:
        existing = await db.execute(
            select(MarketplaceProduct).where(
                MarketplaceProduct.slug == slug,
                MarketplaceProduct.deleted_at.is_(None),
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="slug already in use")
    product = MarketplaceProduct(
        title=payload.title, slug=slug,
        short_description=payload.short_description,
        long_description=payload.long_description,
        category_id=payload.category_id, creator_id=user.id,
        difficulty=payload.difficulty, status=ProductStatus.draft,
        starting_price_cents=payload.starting_price_cents,
        currency=payload.currency.upper(),
        cover_image_url=payload.cover_image_url,
        demo_video_url=payload.demo_video_url,
        live_demo_url=payload.live_demo_url,
        is_featured=payload.is_featured,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return ProductRead.model_validate(product)


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> ProductRead:
    product = await db.get(MarketplaceProduct, product_id)
    if product is None or product.deleted_at is not None:
        raise HTTPException(status_code=404, detail="product not found")
    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data and data["category_id"] is not None:
        cat = await db.get(MarketplaceCategory, data["category_id"])
        if cat is None:
            raise HTTPException(status_code=400, detail="category not found")
    new_status = data.pop("status", None)
    for field, value in data.items():
        if field == "currency" and value is not None:
            value = value.upper()
        setattr(product, field, value)
    if new_status is not None:
        product.status = new_status
        if new_status == ProductStatus.published and product.published_at is None:
            product.published_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(product)
    return ProductRead.model_validate(product)


@router.post(
    "/{product_id}/packages",
    response_model=PackageRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_package(
    product_id: uuid.UUID,
    payload: PackageCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> PackageRead:
    product = await db.get(MarketplaceProduct, product_id)
    if product is None or product.deleted_at is not None:
        raise HTTPException(status_code=404, detail="product not found")
    existing = await db.execute(
        select(MarketplacePackage).where(
            MarketplacePackage.product_id == product_id,
            MarketplacePackage.name == payload.name,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409, detail="package with this name already exists"
        )
    package = MarketplacePackage(
        product_id=product_id, name=payload.name,
        description=payload.description, price_cents=payload.price_cents,
        currency=payload.currency.upper(), license_type=payload.license_type,
        includes_source_code=payload.includes_source_code,
        includes_documentation=payload.includes_documentation,
        includes_support_days=payload.includes_support_days,
        includes_updates_days=payload.includes_updates_days,
        sort_order=payload.sort_order,
    )
    db.add(package)
    await db.commit()
    await db.refresh(package)
    return PackageRead.model_validate(package)

# ---------- File upload ----------


def _safe_filename(name: str) -> str:
    """Strip path, allow only safe chars."""
    name = name.split("/")[-1].split("\\")[-1]
    name = re.sub(r"[^a-zA-Z0-9._-]", "_", name)
    return name or "file"

ALLOWED_EXTENSIONS = {".zip", ".pdf", ".md", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".mp4"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


@router.post(
    "/{product_id}/packages/{package_id}/upload",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
)
async def upload_package_file(
    product_id: uuid.UUID,
    package_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin", "super_admin")),
) -> dict:
    """Upload a deliverable file for a package."""
    # Verify product + package exist and belong together
    product = await db.get(MarketplaceProduct, product_id)
    if product is None or product.deleted_at is not None:
        raise HTTPException(status_code=404, detail="product not found")

    package = await db.get(MarketplacePackage, package_id)
    if package is None or package.product_id != product_id:
        raise HTTPException(status_code=404, detail="package not found")

    # Validate file extension
    orig_name = file.filename or "file"
    ext = "." + orig_name.rsplit(".", 1)[-1].lower() if "." in orig_name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"file type '{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    safe_name = _safe_filename(orig_name)
    # storage_key layout: {product_id}/{package_id}/{filename}
    storage_key = f"{product_id}/{package_id}/{safe_name}"

    # Save to disk
    try:
        size = await storage.save(storage_key, file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="file too large (max 100 MB)")

    # Create DB row
    file_row = MarketplaceProductFile(
        product_id=product_id,
        package_id=package_id,
        file_name=orig_name,
        file_size_bytes=size,
        file_type=file.content_type or "application/octet-stream",
        storage_key=storage_key,
    )
    db.add(file_row)
    await db.commit()
    await db.refresh(file_row)

    return {
        "id": str(file_row.id),
        "file_name": file_row.file_name,
        "file_size_bytes": file_row.file_size_bytes,
        "file_type": file_row.file_type,
        "storage_key": file_row.storage_key,
    }

# ---------- List all products (admin view — includes drafts) ----------

@router.get("", response_model=list[ProductRead])
async def list_all_products(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
    status_filter: ProductStatus | None = None,
) -> list[ProductRead]:
    """Admin view: list ALL products (draft, published, archived)."""
    stmt = (
        select(MarketplaceProduct)
        .where(MarketplaceProduct.deleted_at.is_(None))
        .order_by(MarketplaceProduct.created_at.desc())
    )
    if status_filter is not None:
        stmt = stmt.where(MarketplaceProduct.status == status_filter)

    result = await db.execute(stmt)
    return [ProductRead.model_validate(p) for p in result.scalars().all()]


@router.post(
    "/{product_id}/images",
    response_model=ProductImageRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_product_image(
    product_id: uuid.UUID,
    payload: ProductImageCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> ProductImageRead:
    """Admin: add a new image to a product."""
    # Ensure product exists
    product_res = await db.execute(
        select(MarketplaceProduct).where(MarketplaceProduct.id == product_id)
    )
    if not product_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="product not found")

    img = ProductImage(
        product_id=product_id,
        image_url=payload.image_url,
        sort_order=payload.sort_order,
    )
    db.add(img)
    await db.commit()
    await db.refresh(img)
    return ProductImageRead.model_validate(img)


@router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_image(
    image_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("admin", "super_admin"))],
) -> None:
    """Admin: delete a product image."""
    res = await db.execute(select(ProductImage).where(ProductImage.id == image_id))
    img = res.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail="image not found")
    await db.delete(img)
    await db.commit()


@router.post(
    "/{product_id}/images/upload",
    response_model=ProductImageRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_gallery_image(
    product_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role("admin", "super_admin")),
) -> ProductImageRead:
    """Admin: upload an image file for the product gallery."""
    import os
    import uuid as uuid_lib
    from pathlib import Path

    # Ensure product exists
    product_res = await db.execute(
        select(MarketplaceProduct).where(MarketplaceProduct.id == product_id)
    )
    if not product_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="product not found")

    # Validate file type
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WebP, GIF allowed")

    # Validate size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max 10MB per image")

    # Save file
    ext = file.filename.split(".")[-1].lower() if file.filename else "jpg"
    filename = f"{uuid_lib.uuid4().hex}.{ext}"
    upload_dir = Path("storage/product_images") / str(product_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    filepath = upload_dir / filename
    with open(filepath, "wb") as f_out:
        f_out.write(contents)

    # Public URL
    image_url = f"/api/v1/products/images/{product_id}/{filename}"

    # Count existing to set sort_order
    count_res = await db.execute(
        select(ProductImage).where(ProductImage.product_id == product_id)
    )
    existing = len(count_res.scalars().all())

    img = ProductImage(
        product_id=product_id,
        image_url=image_url,
        sort_order=existing,
    )
    db.add(img)
    await db.commit()
    await db.refresh(img)
    return ProductImageRead.model_validate(img)
