from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.instructor_application import InstructorApplication
from app.schemas.instructor_application import InstructorApplicationCreate

router = APIRouter(prefix="/instructor-applications", tags=["instructor"])

@router.post("")
async def apply_to_teach(
    data: InstructorApplicationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    app = InstructorApplication(
        user_id=current_user.id,
        topic=data.topic,
        description=data.description,
        is_paid=data.is_paid,
    )
    db.add(app)
    await db.commit()
    return {"status": "ok", "message": "Application submitted successfully"}
