"""ZORVI — authentication flow tests against real PostgreSQL."""
import uuid

import pytest


def _email(tag: str) -> str:
    return f"{tag}-{uuid.uuid4().hex[:10]}@example.com"


@pytest.mark.asyncio(loop_scope="session")
async def test_register_success(client, clean_test_users):
    email = _email("reg")
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "StrongPass123", "full_name": "Test"},
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["email"] == email.lower()
    assert "id" in data
    body = str(data)
    assert "password" not in body
    assert "password_hash" not in body


@pytest.mark.asyncio(loop_scope="session")
async def test_register_duplicate_email(client, clean_test_users):
    email = _email("dup")
    payload = {"email": email, "password": "StrongPass123"}
    r1 = await client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201, r1.text
    r2 = await client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409, r2.text


@pytest.mark.asyncio(loop_scope="session")
async def test_register_weak_password(client, clean_test_users):
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": _email("weak"), "password": "short"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio(loop_scope="session")
async def test_login_success(client, clean_test_users):
    email = _email("login")
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "StrongPass123"},
    )
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass123"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0


@pytest.mark.asyncio(loop_scope="session")
async def test_login_wrong_password(client, clean_test_users):
    email = _email("wrong")
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "StrongPass123"},
    )
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPass999"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_login_nonexistent(client, clean_test_users):
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": _email("none"), "password": "StrongPass123"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_me_authenticated(client, clean_test_users):
    email = _email("me")
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "StrongPass123", "full_name": "Me"},
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass123"},
    )
    token = login.json()["access_token"]
    r = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == email.lower()
    assert data["full_name"] == "Me"


@pytest.mark.asyncio(loop_scope="session")
async def test_me_unauthenticated(client):
    r = await client.get("/api/v1/users/me")
    assert r.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_me_invalid_token(client):
    r = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer not.a.jwt"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_refresh_rotation(client, clean_test_users):
    email = _email("refresh")
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "StrongPass123"},
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass123"},
    )
    old_refresh = login.json()["refresh_token"]

    r1 = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": old_refresh}
    )
    assert r1.status_code == 200, r1.text
    new_access = r1.json()["access_token"]
    new_refresh = r1.json()["refresh_token"]
    assert new_refresh != old_refresh

    me = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {new_access}"},
    )
    assert me.status_code == 200

    r2 = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": old_refresh}
    )
    assert r2.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_logout_revokes_refresh(client, clean_test_users):
    email = _email("logout")
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "StrongPass123"},
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass123"},
    )
    refresh = login.json()["refresh_token"]

    r1 = await client.post("/api/v1/auth/logout", json={"refresh_token": refresh})
    assert r1.status_code == 200

    r2 = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 401
