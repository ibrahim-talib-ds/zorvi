import uuid

import pytest
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.notification import Notification


async def _login(client, label: str) -> str:
    email = label + "-" + uuid.uuid4().hex[:10] + "@example.com"
    password = "UserPass123"
    await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    response = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.mark.asyncio(loop_scope="session")
async def test_broadcast_read_and_dismissal_are_per_user(client, clean_test_users):
    token_a = await _login(client, "notice-a")
    token_b = await _login(client, "notice-b")
    async with AsyncSessionLocal() as db:
        note = Notification(
            user_id=None,
            title="Platform update",
            message="A shared update for all users.",
            href="/account/notifications",
            type="info",
            is_broadcast=True,
        )
        db.add(note)
        await db.commit()
        await db.refresh(note)
        note_id = str(note.id)

    headers_a = {"Authorization": "Bearer " + token_a}
    headers_b = {"Authorization": "Bearer " + token_b}
    a_before = await client.get("/api/v1/notifications", headers=headers_a)
    b_before = await client.get("/api/v1/notifications", headers=headers_b)
    assert any(n["id"] == note_id and n["read_at"] is None for n in a_before.json())
    assert any(n["id"] == note_id and n["read_at"] is None for n in b_before.json())

    marked = await client.post("/api/v1/notifications/" + note_id + "/read", headers=headers_a)
    assert marked.status_code == 200
    a_after = await client.get("/api/v1/notifications", headers=headers_a)
    b_after = await client.get("/api/v1/notifications", headers=headers_b)
    assert next(n for n in a_after.json() if n["id"] == note_id)["read_at"] is not None
    assert next(n for n in b_after.json() if n["id"] == note_id)["read_at"] is None

    deleted = await client.delete("/api/v1/notifications/" + note_id, headers=headers_a)
    assert deleted.status_code == 200
    a_hidden = await client.get("/api/v1/notifications", headers=headers_a)
    b_visible = await client.get("/api/v1/notifications", headers=headers_b)
    assert all(n["id"] != note_id for n in a_hidden.json())
    assert any(n["id"] == note_id for n in b_visible.json())

    async with AsyncSessionLocal() as db:
        record = await db.execute(select(Notification).where(Notification.id == uuid.UUID(note_id)))
        found = record.scalar_one_or_none()
        if found:
            await db.delete(found)
            await db.commit()


@pytest.mark.asyncio(loop_scope="session")
async def test_user_cannot_read_or_delete_another_users_notification(client, clean_test_users):
    token_a = await _login(client, "notice-owner")
    token_b = await _login(client, "notice-other")
    user_response = await client.get("/api/v1/users/me", headers={"Authorization": "Bearer " + token_a})
    assert user_response.status_code == 200
    user_id = uuid.UUID(user_response.json()["id"])
    async with AsyncSessionLocal() as db:
        note = Notification(
            user_id=user_id,
            title="Private update",
            message="Only the recipient may manage this.",
            type="info",
            is_broadcast=False,
        )
        db.add(note)
        await db.commit()
        await db.refresh(note)
        note_id = str(note.id)

    headers_b = {"Authorization": "Bearer " + token_b}
    assert (await client.post("/api/v1/notifications/" + note_id + "/read", headers=headers_b)).status_code == 404
    assert (await client.delete("/api/v1/notifications/" + note_id, headers=headers_b)).status_code == 404

    async with AsyncSessionLocal() as db:
        record = await db.execute(select(Notification).where(Notification.id == uuid.UUID(note_id)))
        found = record.scalar_one_or_none()
        assert found is not None
        await db.delete(found)
        await db.commit()
