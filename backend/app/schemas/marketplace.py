"""ZORVI — marketplace request/response schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.marketplace import LicenseType, ProductDifficulty, ProductStatus
from app.schemas.user import UserRead


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    parent_id: uuid.UUID | None
    sort_order: int
    is_active: bool


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    slug: str | None = Field(default=None, max_length=120)
    description: str | None = None
    parent_id: uuid.UUID | None = None
    sort_order: int = 0
    is_active: bool = True


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = None
    parent_id: uuid.UUID | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class PackageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    description: str
    price_cents: int
    currency: str
    license_type: LicenseType
    includes_source_code: bool
    includes_documentation: bool
    includes_support_days: int
    includes_updates_days: int
    is_active: bool
    sort_order: int


class PackageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = ""
    price_cents: int = Field(ge=0)
    currency: str = Field(min_length=3, max_length=3, default="USD")
    license_type: LicenseType = LicenseType.personal
    includes_source_code: bool = True
    includes_documentation: bool = False
    includes_support_days: int = Field(ge=0, default=0)
    includes_updates_days: int = Field(ge=0, default=0)
    sort_order: int = 0


class ProductListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    slug: str
    short_description: str
    difficulty: ProductDifficulty
    status: ProductStatus
    starting_price_cents: int
    currency: str
    cover_image_url: str | None
    is_featured: bool
    published_at: datetime | None
    created_at: datetime
    creator_name: str | None = None
    creator_avatar_url: str | None = None
    is_free: bool = False
    external_download_url: str | None = None


class ProductRead(ProductListItem):
    long_description: str
    instructions: str | None = None
    license: str | None = None
    demo_video_url: str | None
    live_demo_url: str | None
    category_id: uuid.UUID | None
    packages: list[PackageRead] = []
    creator_id: uuid.UUID | None = None
    creator_name: str | None = None
    creator_avatar_url: str | None = None
    is_free: bool = False
    external_download_url: str | None = None


class ProductCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    slug: str | None = Field(default=None, max_length=220)
    short_description: str = Field(min_length=10, max_length=255)
    long_description: str = ""
    instructions: str | None = None
    license: str | None = None
    category_id: uuid.UUID | None = None
    difficulty: ProductDifficulty = ProductDifficulty.intermediate
    starting_price_cents: int = Field(ge=0, default=0)
    currency: str = Field(min_length=3, max_length=3, default="USD")
    cover_image_url: str | None = None
    demo_video_url: str | None = None
    live_demo_url: str | None = None
    is_featured: bool = False
    is_free: bool = False
    external_download_url: str | None = None


class ProductUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    short_description: str | None = Field(default=None, min_length=10, max_length=255)
    long_description: str | None = None
    category_id: uuid.UUID | None = None
    difficulty: ProductDifficulty | None = None
    starting_price_cents: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    cover_image_url: str | None = None
    demo_video_url: str | None = None
    live_demo_url: str | None = None
    is_featured: bool | None = None
    status: ProductStatus | None = None
