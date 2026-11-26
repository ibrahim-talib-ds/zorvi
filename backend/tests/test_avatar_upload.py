"""Regression coverage for authenticated local avatar persistence."""
from io import BytesIO
import uuid

import pytest
from fastapi import Request, UploadFile
from sqlalchemy import delete
from starlette.datastructures import Headers

from app.api.v1 import users as user_api
from app.models.user import User


@pytest.mark.asyncio(loop_scope="session")
async def test_avatar_upload_persists_and_returns_public_url(async_session, monkeypatch):
    db = async_session
    monkeypatch.setattr(user_api, "supabase_client", None)
    user = User(
        email=f"avatar-upload-{uuid.uuid4().hex}@zorvi.local",
        password_hash="test-only-hash",
        full_name="Avatar Upload Test",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    user_id = user.id
    filename = None

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/api/v1/users/me/avatar",
        "raw_path": b"/api/v1/users/me/avatar",
        "query_string": b"",
        "root_path": "",
        "headers": [],
        "server": ("testserver", 8000),
        "client": ("127.0.0.1", 12345),
    }
    request = Request(scope)
    upload = UploadFile(
        filename="profile.png",
        file=BytesIO(b"test-avatar-bytes"),
        headers=Headers({"content-type": "image/png"}),
    )

    try:
        result = await user_api.upload_avatar(request, user, db, upload)
        assert result.avatar_url.startswith("http://testserver:8000/api/v1/users/avatars/")
        filename = result.avatar_url.rsplit("/", 1)[-1]
        saved_file = user_api.AVATAR_DIR / filename
        assert saved_file.is_file()
        assert saved_file.read_bytes() == b"test-avatar-bytes"
    finally:
        await db.rollback()
        await db.execute(delete(User).where(User.id == user_id))
        await db.commit()
        if filename:
            (user_api.AVATAR_DIR / filename).unlink(missing_ok=True)
