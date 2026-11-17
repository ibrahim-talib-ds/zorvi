"""ZORVI — authentication endpoints (register, login, refresh, logout)."""
import secrets
from urllib.parse import urlencode

import httpx
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from pydantic import BaseModel
from app.schemas.auth import (
    MessageResponse,
    RefreshRequest,
    TokenPair,
    UserLogin,
    UserRegister,
)
from app.schemas.user import UserRead
from app.core.deps import get_current_user
from typing import Annotated

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


async def _issue_token_pair(db: AsyncSession, user: User) -> TokenPair:
    access_token, _, _ = create_access_token(user.id)
    refresh_token, jti, expires_at = create_refresh_token(user.id)
    db.add(RefreshToken(user_id=user.id, jti=jti, expires_at=expires_at))
    await db.commit()
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new student account",
)
async def register(
    payload: UserRegister, db: AsyncSession = Depends(get_db)
) -> UserRead:
    existing = await db.execute(
        select(User).where(
            func.lower(User.email) == payload.email.lower(),
            User.deleted_at.is_(None),
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="email already registered",
        )

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


@router.post("/login", response_model=TokenPair, summary="Login and receive tokens")
async def login(
    payload: UserLogin, db: AsyncSession = Depends(get_db)
) -> TokenPair:
    print(f"DEBUG LOGIN PAYLOAD: {payload.model_dump()}")
    result = await db.execute(
        select(User).where(
            func.lower(User.email) == payload.email.lower(),
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="inactive user")

    user.last_login_at = datetime.now(timezone.utc)
    return await _issue_token_pair(db, user)


@router.post(
    "/refresh",
    response_model=TokenPair,
    summary="Exchange a refresh token for a new pair (rotation)",
)
async def refresh(
    payload: RefreshRequest, db: AsyncSession = Depends(get_db)
) -> TokenPair:
    try:
        claims = decode_token(payload.refresh_token, "refresh")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.jti == claims["jti"])
    )
    token_row = result.scalar_one_or_none()
    if token_row is None or token_row.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="refresh token revoked or unknown",
        )
    if token_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh token expired"
        )

    user = await db.get(User, token_row.user_id)
    if user is None or not user.is_active or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="user not found or inactive",
        )

    # Rotate: revoke old, issue new (single atomic commit)
    token_row.revoked_at = datetime.now(timezone.utc)
    return await _issue_token_pair(db, user)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Revoke a refresh token (idempotent)",
)
async def logout(
    payload: RefreshRequest, db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    try:
        claims = decode_token(payload.refresh_token, "refresh")
    except ValueError:
        return MessageResponse(message="logged out")

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.jti == claims["jti"])
    )
    token_row = result.scalar_one_or_none()
    if token_row is not None and token_row.revoked_at is None:
        token_row.revoked_at = datetime.now(timezone.utc)
        await db.commit()
    return MessageResponse(message="logged out")

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password for authenticated user",
)
async def change_password(
    payload: ChangePasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    current_user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return MessageResponse(message="Password changed successfully")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


async def _find_or_create_oauth_user(
    db: AsyncSession, *, provider: str, oauth_id: str, email: str, full_name: str | None
) -> User:
    result = await db.execute(
        select(User).where(
            User.oauth_provider == provider,
            User.oauth_id == oauth_id,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    if user is not None:
        return user

    result = await db.execute(
        select(User).where(
            func.lower(User.email) == email.lower(),
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    if user is not None:
        if user.oauth_provider is None:
            user.oauth_provider = provider
            user.oauth_id = oauth_id
            await db.commit()
        return user

    user = User(
        email=email.lower(),
        password_hash=hash_password(secrets.token_urlsafe(32)),
        full_name=full_name,
        is_verified=True,
        oauth_provider=provider,
        oauth_id=oauth_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def _oauth_redirect(tokens: TokenPair) -> RedirectResponse:
    return RedirectResponse(
        f"{settings.FRONTEND_URL}/auth/callback"
        f"?access_token={tokens.access_token}&refresh_token={tokens.refresh_token}"
    )


@router.get("/google", summary="Start Google OAuth")
async def google_login():
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "prompt": "select_account",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback", summary="Google OAuth callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient(timeout=10) as client:
        token_res = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code != 200:
            return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=google_auth_failed")
        access_token = token_res.json()["access_token"]

        info_res = await client.get(
            GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}
        )
        if info_res.status_code != 200:
            return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=google_auth_failed")
        info = info_res.json()

    email = info.get("email")
    if not email:
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=no_email")

    user = await _find_or_create_oauth_user(
        db, provider="google", oauth_id=info["sub"], email=email, full_name=info.get("name")
    )
    user.last_login_at = datetime.now(timezone.utc)
    return _oauth_redirect(await _issue_token_pair(db, user))


@router.get("/github", summary="Start GitHub OAuth")
async def github_login():
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": "read:user user:email",
    }
    return RedirectResponse(f"{GITHUB_AUTH_URL}?{urlencode(params)}")


@router.get("/github/callback", summary="GitHub OAuth callback")
async def github_callback(code: str, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient(timeout=10) as client:
        token_res = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )
        token_json = token_res.json() if token_res.status_code == 200 else {}
        if "access_token" not in token_json:
            return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=github_auth_failed")
        access_token = token_json["access_token"]

        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
        user_res = await client.get(GITHUB_USER_URL, headers=headers)
        if user_res.status_code != 200:
            return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=github_auth_failed")
        gh_user = user_res.json()

        email = gh_user.get("email")
        if not email:
            emails_res = await client.get(GITHUB_EMAILS_URL, headers=headers)
            if emails_res.status_code == 200:
                primary = next(
                    (e for e in emails_res.json() if e.get("primary") and e.get("verified")), None
                )
                email = primary["email"] if primary else None

    if not email:
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=no_email")

    user = await _find_or_create_oauth_user(
        db, provider="github", oauth_id=str(gh_user["id"]), email=email, full_name=gh_user.get("name")
    )
    user.last_login_at = datetime.now(timezone.utc)
    return _oauth_redirect(await _issue_token_pair(db, user))

