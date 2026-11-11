import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class ProductImageCreate(BaseModel):
    image_url: str = Field(min_length=5, max_length=500)
    sort_order: int = 0


class ProductImageRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    image_url: str
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}
