import os
from sqlalchemy import create_engine, text
from app.models.base import Base
import app.models

local_engine = create_engine(os.environ['LOCAL_DATABASE_URL'])
cloud_engine = create_engine(os.environ['DATABASE_URL_SYNC'])

print("1. Creating all tables in Neon...")
with cloud_engine.begin() as conn:
    conn.execute(text("SET search_path TO public;"))
    Base.metadata.create_all(conn)
print("   Tables created!")

print("2. Copying data from Local to Neon...")
with local_engine.connect() as local_conn:
    for table in Base.metadata.sorted_tables:
        rows = local_conn.execute(table.select()).fetchall()
        if not rows:
            continue
        with cloud_engine.begin() as cloud_conn:
            cloud_conn.execute(text("SET search_path TO public;"))
            cloud_conn.execute(table.insert(), [dict(r._mapping) for r in rows])
        print(f"   Copied {len(rows)} rows to {table.name}")

print("SUCCESS! Your local data is now live in Neon.")
