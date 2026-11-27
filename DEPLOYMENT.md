# Deployment

ZORVI/ibrant uses a separate Next.js frontend and FastAPI backend. Deploy the API first, apply database migrations, then build the frontend with the public API URL. The repository's `docker-compose.yml` is intentionally empty; local PostgreSQL currently runs natively.

## Backend

Build from the `backend/` context:

```sh
docker build -t zorvi-api ./backend
```

Configure the backend environment on the hosting platform. Required settings include `DATABASE_URL`, `DATABASE_URL_SYNC`, and a strong `SECRET_KEY`. Set `FRONTEND_URL` and `CORS_ORIGINS` to the deployed frontend origin(s). AI build uses server-only `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`, and `AI_REQUEST_TIMEOUT_SECONDS`; the Groq starting configuration is documented in `backend/AI_BUILD_SETUP.md`.

The backend startup script (`backend/start.sh`) runs `alembic upgrade head` against `DATABASE_URL_SYNC` before launching Uvicorn. The Docker image uses this script automatically. For a Render native-Python service with the Root Directory set to `backend`, set the Start Command to `sh ./start.sh`; this also works on the Free plan and does not require Dashboard Shell. Keep `DATABASE_URL_SYNC` pointed at the same production database used by the API. The migration command is safe to repeat: Alembic applies only revisions that are not yet recorded.

The API listens on the platform-provided `PORT` (default `8000`) and exposes `/health`. Do not put backend credentials in the frontend environment.

## Frontend

The frontend image uses Next.js standalone output. Build it with the publicly reachable API base, including `/api/v1`:

```sh
docker build \
  --build-arg NEXT_PUBLIC_API_BASE=https://api.example.com/api/v1 \
  -t zorvi-web ./frontend
```

Replace the example URL with the deployed API URL. `NEXT_PUBLIC_API_BASE` is compiled into the browser bundle, so changing it only at container runtime does not change the already-built client bundle. Optionally set server-only `API_INTERNAL_BASE` at runtime to an internal API address (for example `http://api:8000/api/v1`) when the frontend server and API share a private network.

The frontend container listens on port `8080`.

## Persistent user files

Uploaded product files and avatars must be stored on persistent deployment storage. The backend `.dockerignore` intentionally excludes uploaded avatar files and the user-uploaded `storage/products/products/` tree from the image; these files are not safe to treat as source code. Before deploying, back up and migrate existing uploads into persistent storage mounted at the corresponding application paths (`/app/storage` and `/app/app/storage`). Seed or migrate any existing product downloads before mounting an empty volume, otherwise the volume can hide files baked into the image.

## Production limitations

- The AI build worker currently uses FastAPI background tasks. Backend restarts interrupt active tasks; use a durable queue/worker before scaling or relying on long-running builds.
- AI autopilot writes source files only. It does not run generated code, install dependencies, apply migrations, or deploy projects.
- Keep `.env`, `.env.local`, API keys, database passwords, and signing secrets out of Git and container build contexts.
