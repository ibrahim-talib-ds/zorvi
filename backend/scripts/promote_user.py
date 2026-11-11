"""ZORVI — grant a role to a user by email.

Usage:
    .venv/bin/python scripts/promote_user.py <email> <role_name>
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import asyncio
from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.models.role import Role, UserRole
from app.models.user import User


async def main(email: str, role_name: str) -> None:
    async with AsyncSessionLocal() as db:
        user_row = await db.execute(
            select(User).where(
                func.lower(User.email) == email.lower(),
                User.deleted_at.is_(None),
            )
        )
        user = user_row.scalar_one_or_none()
        if user is None:
            print(f"  ERROR: user '{email}' not found")
            sys.exit(1)
        role_row = await db.execute(select(Role).where(Role.name == role_name))
        role = role_row.scalar_one_or_none()
        if role is None:
            print(f"  ERROR: role '{role_name}' not found — run scripts/seed_roles.py first")
            sys.exit(1)
        existing = await db.execute(
            select(UserRole).where(
                UserRole.user_id == user.id, UserRole.role_id == role.id
            )
        )
        if existing.scalar_one_or_none() is not None:
            print(f"  user {email} already has role {role_name}")
            return
        db.add(UserRole(user_id=user.id, role_id=role.id))
        await db.commit()
        print(f"  granted role '{role_name}' to {email}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: python scripts/promote_user.py <email> <role_name>")
        sys.exit(2)
    asyncio.run(main(sys.argv[1], sys.argv[2]))
