"""ZORVI — role-based access control dependency factory."""
from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.core.deps import get_current_user
from app.models.user import User


def require_role(*role_names: str):
    """Return a FastAPI dependency requiring the current user to have
    at least one of the given roles.

    Usage:
        @router.post("/admin/x", dependencies=[Depends(require_role("admin"))])
        async def x(...): ...

        async def x(user: Annotated[User, Depends(require_role("admin"))]): ...
    """
    if not role_names:
        raise ValueError("require_role needs at least one role name")
    allowed = frozenset(role_names)

    async def _check(user: Annotated[User, Depends(get_current_user)]) -> User:
        user_role_names = {r.name for r in user.roles}
        if not (user_role_names & allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"requires one of roles: {', '.join(sorted(allowed))}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    return _check
