"""ZORVI — FastAPI application entrypoint."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.admin.categories import router as admin_categories_router
from app.api.v1.admin.settings import router as admin_settings_router
from app.api.v1.admin.courses import router as admin_courses_router
from app.api.v1.admin.marketplace import router as admin_marketplace_router
from app.api.v1.admin.orders import router as admin_orders_router
from app.api.v1.auth import router as auth_router
from app.api.v1.certificates import my_router as my_certificates_router, router as certificates_router
from app.api.v1.courses import my_router, router as courses_router
from app.api.v1.downloads import router as downloads_router
from app.api.v1.health import router as health_router
from app.api.v1.marketplace import router as marketplace_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.admin.notifications import router as admin_notifications_router
from app.api.v1.admin.users import router as admin_users_router
from app.api.v1.orders import router as orders_router
from app.api.v1.users import router as users_router
from app.core.config import get_settings
from app.core.database import engine
from fastapi.staticfiles import StaticFiles
from pathlib import Path as PathLib

settings = get_settings()

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s %(levelname)-8s %(name)s | %(message)s",
)
log = logging.getLogger("zorvi")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("ZORVI API starting (env=%s)", settings.ENVIRONMENT)
    yield
    log.info("ZORVI API shutting down")
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=f"{settings.PROJECT_NAME} API",
        description=settings.PROJECT_TAGLINE,
        version="0.4.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/", tags=["root"])
    async def root() -> dict:
        return {
            "service": settings.PROJECT_NAME,
            "tagline": settings.PROJECT_TAGLINE,
            "docs": "/docs",
            "health": "/health",
            "auth": "/api/v1/auth",
            "marketplace": "/api/v1/marketplace",
            "orders": "/api/v1/orders",
        }

    app.include_router(health_router)
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(users_router, prefix="/api/v1")
    app.include_router(marketplace_router, prefix="/api/v1")
    app.include_router(notifications_router, prefix="/api/v1")
    app.include_router(admin_notifications_router, prefix="/api/v1")
    app.include_router(admin_users_router, prefix="/api/v1")
    app.include_router(orders_router, prefix="/api/v1")
    app.include_router(downloads_router, prefix="/api/v1")
    app.include_router(courses_router, prefix="/api/v1")
    app.include_router(my_router, prefix="/api/v1")
    app.include_router(my_certificates_router, prefix="/api/v1")
    app.include_router(certificates_router, prefix="/api/v1")
    app.include_router(admin_categories_router, prefix="/api/v1")
    app.include_router(admin_courses_router, prefix="/api/v1")
    app.include_router(admin_settings_router, prefix="/api/v1")
    app.include_router(admin_marketplace_router, prefix="/api/v1")
    app.include_router(admin_orders_router, prefix="/api/v1")



    # Serve product gallery images
    product_images_dir = PathLib("storage/product_images")
    product_images_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/api/v1/products/images", StaticFiles(directory=str(product_images_dir)), name="product_images")

    return app


app = create_app()
