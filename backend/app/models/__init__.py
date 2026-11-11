"""ZORVI — model exports. Importing this module populates `Base.metadata`."""
from app.models.base import (
    Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin,
)
from app.models.download_token import DownloadToken
from app.models.course import Course, CourseDifficulty, CourseStatus
from app.models.course_module import CourseModule
from app.models.lesson import Lesson, VideoProvider
from app.models.enrollment import Enrollment
from app.models.lesson_progress import LessonProgress
from app.models.certificate import Certificate
from app.models.marketplace import (
    LicenseType,
    MarketplaceCategory,
    MarketplacePackage,
    MarketplaceProduct,
    MarketplaceProductFile,
    ProductDifficulty,
    ProductStatus,
)
from app.models.order import (
    Order,
    OrderItem,
    OrderStatus,
    PaymentMethod,
)
from app.models.refresh_token import RefreshToken
from app.models.platform_setting import PlatformSetting
from app.models.role import Role, UserRole
from app.models.user import User

__all__ = [
    "Base", "SoftDeleteMixin", "TimestampMixin", "UUIDPrimaryKeyMixin",
    "User", "Role", "UserRole", "RefreshToken",
    "LicenseType", "MarketplaceCategory", "MarketplacePackage",
    "MarketplaceProduct", "MarketplaceProductFile",
    "ProductDifficulty", "ProductStatus",
    "Course", "CourseStatus", "CourseDifficulty",
    "CourseModule", "Lesson", "VideoProvider",
    "Enrollment", "LessonProgress", "Certificate", "PlatformSetting",
    "Order", "OrderItem", "OrderStatus", "PaymentMethod",
    "DownloadToken",
]
from app.models.instructor_application import InstructorApplication
from app.models.product_image import ProductImage
from app.models.notification import Notification
