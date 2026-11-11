from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.rbac import require_role
from app.models.instructor_application import InstructorApplication
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(
    prefix="/admin/instructor-applications",
    tags=["admin-instructor"],
    dependencies=[Depends(require_role("admin", "super_admin"))],
)

class ApplicationUpdate(BaseModel):
    status: str  # approved or rejected

@router.get("")
async def list_applications(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(InstructorApplication, User)
        .join(User, InstructorApplication.user_id == User.id)
        .order_by(InstructorApplication.created_at.desc())
    )
    
    apps = []
    for app, user in result.all():
        apps.append({
            "id": str(app.id),
            "user_id": str(app.user_id),
            "user_name": user.full_name,
            "user_email": user.email,
            "topic": app.topic,
            "description": app.description,
            "is_paid": app.is_paid,
            "status": app.status,
            "created_at": app.created_at.isoformat(),
        })
    return apps

@router.patch("/{app_id}")
async def update_application(
    app_id: str,
    data: ApplicationUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(InstructorApplication).where(InstructorApplication.id == app_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if data.status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    app.status = data.status
    await db.commit()
    return {"status": "ok", "message": f"Application {data.status}"}
