"""ZORVI — model integration tests against real PostgreSQL 18."""
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.role import Role
from app.models.user import User


def _email(tag: str) -> str:
    return f"{tag}-{uuid.uuid4().hex[:10]}@zorvi.local"


@pytest.mark.asyncio(loop_scope="session")
async def test_insert_query_user(async_session):
    email = _email("insert")
    user = User(email=email, password_hash="dummy-hash", full_name="Test User")
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    assert user.id is not None
    assert user.email == email
    assert user.is_active is True
    assert user.is_verified is False
    assert user.created_at is not None
    assert user.deleted_at is None
    assert user.is_deleted is False

    # Query back
    result = await async_session.execute(select(User).where(User.email == email))
    fetched = result.scalar_one()
    assert fetched.id == user.id

    await async_session.delete(user)
    await async_session.commit()


@pytest.mark.asyncio(loop_scope="session")
async def test_soft_delete_user(async_session):
    email = _email("softdel")
    user = User(email=email, password_hash="x", full_name="SD")
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    user.deleted_at = datetime.now(timezone.utc)
    await async_session.commit()
    await async_session.refresh(user)

    assert user.deleted_at is not None
    assert user.is_deleted is True

    await async_session.delete(user)
    await async_session.commit()


@pytest.mark.asyncio(loop_scope="session")
async def test_role_unique_constraint(async_session):
    name = f"role-{uuid.uuid4().hex[:8]}"
    r1 = Role(name=name, description="first")
    async_session.add(r1)
    await async_session.commit()

    r2 = Role(name=name, description="duplicate")
    async_session.add(r2)
    with pytest.raises(IntegrityError):
        await async_session.commit()
    await async_session.rollback()

    await async_session.delete(r1)
    await async_session.commit()
