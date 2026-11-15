from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.role import Role
from app.models.course import Course, CourseStatus, CourseDifficulty
from sqlalchemy import select
import asyncio

async def seed():
    async with AsyncSessionLocal() as db:
        admin_role = (await db.execute(select(Role).where(Role.name == 'super_admin'))).scalar_one_or_none()
        if not admin_role:
            admin_role = Role(name='super_admin', description='Super Administrator')
            db.add(admin_role)
            await db.commit()

        admin = (await db.execute(select(User).where(User.email == 'admin@zorvi.com'))).scalar_one_or_none()
        if not admin:
            admin = User(email='admin@zorvi.com', hashed_password=hash_password('password123'), full_name='Super Admin', is_active=True)
            await db.refresh(admin_role)
            admin.roles.append(admin_role)
            db.add(admin)
            await db.commit()
            print("Admin user created.")
        
        course = (await db.execute(select(Course).where(Course.title == 'Python Programming'))).scalar_one_or_none()
        if not course:
            course = Course(title='Python Programming', slug='python-programming', short_description='Master Python from scratch.', long_description='Learn Python step by step.', difficulty=CourseDifficulty.beginner, status=CourseStatus.published, estimated_hours=10, is_featured=True, instructor_id=admin.id)
            db.add(course)
            await db.commit()
            print("Course created.")
            
asyncio.run(seed())
