"""ZORVI — order request/response schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import OrderStatus, PaymentMethod


class OrderItemCreate(BaseModel):
    package_id: uuid.UUID


class OrderCreate(BaseModel):
    is_free_checkout: bool = False
    items: list[OrderItemCreate] = Field(min_length=1, max_length=20)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    buyer_note: str | None = None


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    product_id: uuid.UUID
    package_id: uuid.UUID | None
    product_title: str
    product_slug: str
    package_name: str
    license_type: str
    price_cents: int
    currency: str


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    status: OrderStatus
    payment_method: PaymentMethod | None
    total_cents: int
    currency: str
    payment_reference: str | None
    payment_proof_url: str | None
    buyer_note: str | None
    admin_note: str | None
    paid_at: datetime | None
    refunded_at: datetime | None
    created_at: datetime
    items: list[OrderItemRead] = []


class SubmitPaymentRequest(BaseModel):
    payment_method: PaymentMethod
    payment_reference: str | None = Field(default=None, max_length=255)
    payment_proof_url: str | None = Field(default=None, max_length=1000)
    buyer_note: str | None = None


class AdminNoteRequest(BaseModel):
    admin_note: str | None = None


class DownloadTokenIssue(BaseModel):
    """Returned to admin when mark-paid completes — links the buyer can use."""
    order_item_id: uuid.UUID
    token: str
    expires_at: datetime
    file_name: str


class MarkPaidResponse(BaseModel):
    order: OrderRead
    download_tokens: list[DownloadTokenIssue] = []
