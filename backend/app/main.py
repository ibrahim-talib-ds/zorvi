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
)
from app.api.v1.admin import (
    categories as admin_categories,
    courses as admin_courses,
    marketplace as admin_marketplace,
    orders as admin_orders,
    settings as admin_settings,
    notifications as admin_notifications,
    users as admin_users,
)

app = FastAPI(title="Zorvi API")

# CORS — allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ PUBLIC ROUTES ============
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(marketplace.router, prefix="/api/v1", tags=["marketplace"])
app.include_router(orders.router, prefix="/api/v1", tags=["orders"])
app.include_router(courses.router, prefix="/api/v1", tags=["courses"])
app.include_router(notifications.router, prefix="/api/v1", tags=["notifications"])
app.include_router(certificates.router, prefix="/api/v1", tags=["certificates"])
app.include_router(downloads.router, prefix="/api/v1", tags=["downloads"])
app.include_router(instructor_applications.router, prefix="/api/v1", tags=["instructor-applications"])

# ============ ADMIN ROUTES ============
app.include_router(admin_categories.router, prefix="/api/v1", tags=["admin:categories"])
app.include_router(admin_courses.router, prefix="/api/v1", tags=["admin:courses"])
app.include_router(admin_marketplace.router, prefix="/api/v1", tags=["admin:marketplace"])
app.include_router(admin_orders.router, prefix="/api/v1", tags=["admin:orders"])
app.include_router(admin_settings.router, prefix="/api/v1", tags=["admin:settings"])
app.include_router(admin_notifications.router, prefix="/api/v1", tags=["admin:notifications"])
app.include_router(admin_users.router, prefix="/api/v1", tags=["admin:users"])


@app.get("/")
async def root() -> dict:
    return {"message": "ZORVI API", "docs": "/docs"}
