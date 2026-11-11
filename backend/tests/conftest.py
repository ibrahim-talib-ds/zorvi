"""ZORVI — pytest fixtures."""
import uuid

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, func, select

from app.core.database import AsyncSessionLocal, engine
from app.main import app
from app.models.download_token import DownloadToken
from app.models.marketplace import (
    MarketplacePackage,
    MarketplaceProduct,
    MarketplaceProductFile,
)
from app.models.order import Order, OrderItem
from app.models.refresh_token import RefreshToken
from app.models.role import Role, UserRole
from app.models.user import User

TEST_EMAIL_DOMAIN = "@example.com"


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(loop_scope="session")
async def async_session():
    async with AsyncSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(loop_scope="session")
async def clean_test_users(async_session):
    """Delete test users and every dependent row in FK-safe order."""

    async def _clean():
        like = f"%{TEST_EMAIL_DOMAIN}"
        ids_q = await async_session.execute(select(User.id).where(User.email.like(like)))
        user_ids = [r[0] for r in ids_q.all()]
        if not user_ids:
            return

        # products owned by test users
        prods_q = await async_session.execute(
            select(MarketplaceProduct.id).where(
                MarketplaceProduct.creator_id.in_(user_ids)
            )
        )
        product_ids = [r[0] for r in prods_q.all()]

        # items/packages/files/tokens
        if product_ids:
            pkgs_q = await async_session.execute(
                select(MarketplacePackage.id).where(
                    MarketplacePackage.product_id.in_(product_ids)
                )
            )
            package_ids = [r[0] for r in pkgs_q.all()]

            items_q = await async_session.execute(
                select(OrderItem.id).where(
                    (OrderItem.product_id.in_(product_ids))
                    | (OrderItem.package_id.in_(package_ids) if package_ids else False)
                )
            )
            item_ids = [r[0] for r in items_q.all()]

            # orders touching those items or owned by test users
            order_ids_q = await async_session.execute(
                select(Order.id).where(
                    (Order.user_id.in_(user_ids))
                    | (Order.id.in_(
                        select(OrderItem.order_id).where(OrderItem.id.in_(item_ids))
                    ) if item_ids else False)
                )
            )
            order_ids = [r[0] for r in order_ids_q.all()]
        else:
            order_ids = []
            package_ids = []
            item_ids = []

        # extra safety: orders owned by test users (even if no products)
        if not order_ids:
            oq = await async_session.execute(
                select(Order.id).where(Order.user_id.in_(user_ids))
            )
            order_ids = [r[0] for r in oq.all()]

        if order_ids:
            oi_q = await async_session.execute(
                select(OrderItem.id).where(OrderItem.order_id.in_(order_ids))
            )
            item_ids = list({*item_ids, *[r[0] for r in oi_q.all()]})

        if item_ids:
            await async_session.execute(
                delete(DownloadToken).where(DownloadToken.order_item_id.in_(item_ids))
            )
            await async_session.execute(
                delete(OrderItem).where(OrderItem.id.in_(item_ids))
            )

        if order_ids:
            await async_session.execute(delete(Order).where(Order.id.in_(order_ids)))

        if product_ids:
            await async_session.execute(
                delete(MarketplaceProductFile).where(
                    MarketplaceProductFile.product_id.in_(product_ids)
                )
            )
            await async_session.execute(
                delete(MarketplacePackage).where(
                    MarketplacePackage.product_id.in_(product_ids)
                )
            )
            await async_session.execute(
                delete(MarketplaceProduct).where(
                    MarketplaceProduct.id.in_(product_ids)
                )
            )

        await async_session.execute(
            delete(RefreshToken).where(RefreshToken.user_id.in_(user_ids))
        )
        await async_session.execute(
            delete(UserRole).where(UserRole.user_id.in_(user_ids))
        )
        await async_session.execute(delete(User).where(User.id.in_(user_ids)))
        await async_session.commit()

    await _clean()
    yield
    await _clean()


@pytest_asyncio.fixture(loop_scope="session")
async def admin_token(client, clean_test_users):
    email = f"admin-{uuid.uuid4().hex[:10]}{TEST_EMAIL_DOMAIN}"
    password = "AdminPass123"
    await client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "full_name": "Admin",
    })

    async with AsyncSessionLocal() as db:
        for name, desc in (
            ("super_admin", "Full system access"),
            ("admin", "Administrative access"),
            ("instructor", "Create and manage courses"),
            ("student", "Enroll in and learn from courses"),
            ("customer", "Purchase marketplace products"),
        ):
            existing = await db.execute(select(Role).where(Role.name == name))
            if existing.scalar_one_or_none() is None:
                db.add(Role(name=name, description=desc))
        await db.commit()

        u = await db.execute(select(User).where(func.lower(User.email) == email.lower()))
        user = u.scalar_one()
        r = await db.execute(select(Role).where(Role.name == "super_admin"))
        role = r.scalar_one()
        link = await db.execute(select(UserRole).where(
            UserRole.user_id == user.id, UserRole.role_id == role.id,
        ))
        if link.scalar_one_or_none() is None:
            db.add(UserRole(user_id=user.id, role_id=role.id))
            await db.commit()

    tok = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return tok.json()["access_token"]


@pytest_asyncio.fixture(scope="session", loop_scope="session", autouse=True)
async def _engine_lifecycle():
    yield
    await engine.dispose()
