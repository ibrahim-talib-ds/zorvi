# ZORVI

**Learn. Create. Launch.**

ZORVI is a full-stack project-based learning platform and a professional
software marketplace. It teaches complete, real-world applications built
with **Flutter**, **FastAPI**, **Python**, and **PostgreSQL** — and it also
showcases and sells finished project packages.

| Layer | Technology |
| --- | --- |
| Frontend | Flutter Web |
| Backend | FastAPI |
| Database | PostgreSQL |
| Auth | JWT + Argon2 |
| ORM | SQLAlchemy 2.x |
| Migrations | Alembic |

## Local architecture

- **ZORVI Postgres** — Docker container `zorvi_postgres`, host port **5434**
- **ZORVI backend** — FastAPI on host port **8010**
- **ZORVI Flutter Web** — port **5174** (added in a later phase)

These ports are deliberately different from other projects on this machine
(`langloop` on 5433/6380, `~/Databases/post…` on 5432, `ZanNe…` on 8000).

## Documentation author

**Ibrahim Talib**

## Status

See `documentation/DEVELOPMENT_STATUS.md`.
