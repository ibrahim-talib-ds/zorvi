"""ZORVI — health endpoint tests (real DB round-trip, session loop)."""
import pytest


@pytest.mark.asyncio(loop_scope="session")
async def test_health_ok(client):
    r = await client.get("/health")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert data["service"] == "ZORVI"
    assert "PostgreSQL" in data["db_version"]


@pytest.mark.asyncio(loop_scope="session")
async def test_health_versioned(client):
    r = await client.get("/api/v1/health")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
