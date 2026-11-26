import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    auth,
    users,
    marketplace,
    orders,
    courses,
    notifications,
    certificates,
    downloads,
    instructor_applications,
    health,
    messages as public_messages,
    projects,
    ai_build,
)
from app.api.v1.admin import (
    categories as admin_categories,
    courses as admin_courses,
    marketplace as admin_marketplace,
    orders as admin_orders,
    settings as admin_settings,
    notifications as admin_notifications,
    users as admin_users,
    messages as admin_messages,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Resume persisted build tasks after an API process restart."""
    try:
        recovered = await ai_build.recover_interrupted_build_tasks()
        if recovered:
            logger.info("Queued %s interrupted AI build task(s) for recovery", recovered)
    except Exception:
        # A database outage should not prevent the API from starting. The next
        # startup can recover these durable tasks once the database is available.
        logger.exception("Could not recover interrupted AI build tasks during startup")
    yield


app = FastAPI(title="Zorvi API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public Routes
app.include_router(health.router, tags=["health"])  # Root health check for monitoring
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(marketplace.router, prefix="/api/v1", tags=["marketplace"])
app.include_router(orders.router, prefix="/api/v1", tags=["orders"])
from app.translation.router import router as translate_router
app.include_router(translate_router)
app.include_router(courses.router, prefix="/api/v1", tags=["courses"])
app.include_router(courses.my_router, prefix="/api/v1", tags=["my-courses"])
app.include_router(notifications.router, prefix="/api/v1", tags=["notifications"])
app.include_router(certificates.router, prefix="/api/v1", tags=["certificates"])
app.include_router(certificates.my_router, prefix="/api/v1", tags=["my-certificates"])
app.include_router(downloads.router, prefix="/api/v1", tags=["downloads"])
app.include_router(instructor_applications.router, prefix="/api/v1", tags=["instructor-applications"])
app.include_router(public_messages.router, prefix="/api/v1", tags=["messages"])
app.include_router(projects.router, prefix="/api/v1", tags=["build-projects"])
app.include_router(ai_build.router, prefix="/api/v1", tags=["ai-build"])

# Admin Routes
app.include_router(admin_categories.router, prefix="/api/v1", tags=["admin:categories"])
app.include_router(admin_courses.router, prefix="/api/v1", tags=["admin:courses"])
app.include_router(admin_marketplace.router, prefix="/api/v1", tags=["admin:marketplace"])
app.include_router(admin_orders.router, prefix="/api/v1", tags=["admin:orders"])
app.include_router(admin_settings.router, prefix="/api/v1", tags=["admin:settings"])
app.include_router(admin_notifications.router, prefix="/api/v1", tags=["admin:notifications"])
app.include_router(admin_users.router, prefix="/api/v1", tags=["admin:users"])
app.include_router(admin_messages.router, prefix="/api/v1", tags=["admin:messages"])

@app.get("/")
async def root():
    return {"message": "ZORVI API", "docs": "/docs"}
