"""Authenticated project workspace CRUD and ownership tests."""
import io
import uuid
import zipfile

import pytest


async def _register_and_login(client, label: str) -> str:
    email = f"{label}-{uuid.uuid4().hex[:10]}@example.com"
    password = "ProjectPass123"
    registered = await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert registered.status_code in (200, 201), registered.text
    logged_in = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert logged_in.status_code == 200, logged_in.text
    return logged_in.json()["access_token"]


@pytest.mark.asyncio(loop_scope="session")
async def test_project_create_list_update_delete(client, clean_test_users):
    token = await _register_and_login(client, "project-owner")
    headers = {"Authorization": f"Bearer {token}"}
    created = await client.post("/api/v1/projects", headers=headers, json={
        "name": "My first website",
        "template": "web",
        "files": [
            {"path": "index.html", "content": "<h1>Hello</h1>"},
            {"path": "styles.css", "content": "body { margin: 0; }"},
        ],
    })
    assert created.status_code == 201, created.text
    project = created.json()
    assert project["name"] == "My first website"
    assert project["file_count"] == 2
    assert {file["path"] for file in project["files"]} == {"index.html", "styles.css"}

    listed = await client.get("/api/v1/projects", headers=headers)
    assert listed.status_code == 200
    assert any(item["id"] == project["id"] for item in listed.json())

    updated = await client.patch(f"/api/v1/projects/{project['id']}", headers=headers, json={
        "name": "My updated website",
        "files": [{"path": "index.html", "content": "<h1>Saved remotely</h1>"}],
    })
    assert updated.status_code == 200, updated.text
    assert updated.json()["name"] == "My updated website"
    assert updated.json()["files"][0]["content"] == "<h1>Saved remotely</h1>"

    deleted = await client.delete(f"/api/v1/projects/{project['id']}", headers=headers)
    assert deleted.status_code == 204
    missing = await client.get(f"/api/v1/projects/{project['id']}", headers=headers)
    assert missing.status_code == 404


@pytest.mark.asyncio(loop_scope="session")
async def test_project_is_private_to_owner(client, clean_test_users):
    owner = await _register_and_login(client, "project-owner")
    stranger = await _register_and_login(client, "project-stranger")
    created = await client.post("/api/v1/projects", headers={"Authorization": f"Bearer {owner}"}, json={"name": "Private project"})
    assert created.status_code == 201, created.text
    project_id = created.json()["id"]
    response = await client.get(f"/api/v1/projects/{project_id}", headers={"Authorization": f"Bearer {stranger}"})
    assert response.status_code == 404


@pytest.mark.asyncio(loop_scope="session")
async def test_project_rejects_unsafe_or_duplicate_paths(client, clean_test_users):
    token = await _register_and_login(client, "project-paths")
    headers = {"Authorization": f"Bearer {token}"}
    unsafe = await client.post("/api/v1/projects", headers=headers, json={
        "name": "Unsafe", "files": [{"path": "../secrets.txt", "content": "no"}],
    })
    assert unsafe.status_code == 422
    secret = await client.post("/api/v1/projects", headers=headers, json={
        "name": "Secrets", "files": [{"path": ".env", "content": "TOKEN=secret"}],
    })
    assert secret.status_code == 422
    duplicate = await client.post("/api/v1/projects", headers=headers, json={
        "name": "Duplicate", "files": [
            {"path": "index.html", "content": "a"},
            {"path": "index.html", "content": "b"},
        ],
    })
    assert duplicate.status_code == 422


@pytest.mark.asyncio(loop_scope="session")
async def test_project_download_is_a_safe_zip(client, clean_test_users):
    token = await _register_and_login(client, "project-export")
    headers = {"Authorization": f"Bearer {token}"}
    created = await client.post("/api/v1/projects", headers=headers, json={
        "name": "Export test",
        "files": [
            {"path": "index.html", "content": "<h1>Exported</h1>"},
            {"path": "src/main.js", "content": "console.log('export');"},
        ],
    })
    assert created.status_code == 201, created.text
    project_id = created.json()["id"]
    response = await client.get(f"/api/v1/projects/{project_id}/download", headers=headers)
    assert response.status_code == 200, response.text
    assert response.headers.get("content-type", "").startswith("application/zip")
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        assert set(archive.namelist()) == {"index.html", "src/main.js"}
        assert archive.read("index.html").decode() == "<h1>Exported</h1>"
