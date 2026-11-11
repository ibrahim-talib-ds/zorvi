"""ZORVI — RBAC enforcement tests."""
import pytest


@pytest.mark.asyncio(loop_scope="session")
async def test_admin_route_requires_auth(client):
    r = await client.post(
        "/api/v1/admin/marketplace",
        json={
            "title": "x", "short_description": "0123456789",
            "starting_price_cents": 0,
        },
    )
    assert r.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_admin_route_denies_plain_user(client, clean_test_users):
    import uuid
    email = f"student-{uuid.uuid4().hex[:8]}@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "StudentPass123"},
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StudentPass123"},
    )
    token = login.json()["access_token"]
    r = await client.post(
        "/api/v1/admin/marketplace",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Test Product", "short_description": "A test product desc",
            "starting_price_cents": 999,
        },
    )
    assert r.status_code == 403
    assert "requires one of roles" in r.json()["detail"]


@pytest.mark.asyncio(loop_scope="session")
async def test_admin_route_allows_super_admin(client, admin_token):
    r = await client.post(
        "/api/v1/admin/marketplace",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "RBAC Test Product",
            "short_description": "Just checking admin access works",
            "starting_price_cents": 1000,
        },
    )
    assert r.status_code == 201, r.text
