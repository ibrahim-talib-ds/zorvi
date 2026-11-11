"""ZORVI — idempotent role seeder."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import asyncio
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.role import Role

ROLES = [
    ("super_admin", "Full system access"),
    ("admin", "Administrative access"),
    ("instructor", "Create and manage courses"),
    ("student", "Enroll in and learn from courses"),
    ("customer", "Purchase and download marketplace products"),
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for name, desc in ROLES:
            existing = await db.execute(select(Role).where(Role.name == name))
            if existing.scalar_one_or_none() is None:
                db.add(Role(name=name, description=desc))
                print(f"  created role: {name}")
            else:
                print(f"  exists: {name}")
        await db.commit()
    print("  done")


if __name__ == "__main__":
    asyncio.run(main())
