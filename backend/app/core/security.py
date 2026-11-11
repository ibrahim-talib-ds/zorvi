"""ZORVI — password hashing (Argon2id) and JWT signing/verification."""
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()

# Argon2id with OWASP 2024 parameters (~100 ms per hash on modern CPU).
_ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MiB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(plain: str) -> str:
    """Hash a plaintext password with Argon2id."""
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Constant-time verify a plaintext password against an Argon2 hash."""
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def _create_token(
    user_id: UUID,
    token_type: str,
    expires_delta: timedelta,
) -> tuple[str, str, datetime]:
    """Sign a JWT. Returns (token, jti, expires_at_utc)."""
    jti = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = now + expires_delta
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, jti, expires_at


def create_access_token(user_id: UUID) -> tuple[str, str, datetime]:
    return _create_token(
        user_id, "access",
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: UUID) -> tuple[str, str, datetime]:
    return _create_token(
        user_id, "refresh",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str, expected_type: str) -> dict:
    """Decode + validate a JWT. Raises ValueError with a safe message on failure."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError as exc:
        raise ValueError("invalid or expired token") from exc
    if payload.get("type") != expected_type:
        raise ValueError(f"expected {expected_type} token")
    if "sub" not in payload or "jti" not in payload:
        raise ValueError("missing claims")
    return payload
