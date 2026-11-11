"""ZORVI — Certificate endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.certificate import Certificate
from app.models.course import Course
from app.models.user import User
from app.schemas.certificate import CertificateListItem, CertificateRead

router = APIRouter(prefix="/certificates", tags=["certificates"])
my_router = APIRouter(prefix="/my-certificates", tags=["certificates"])


@my_router.get("", response_model=list[CertificateListItem])
async def list_my_certificates(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[CertificateListItem]:
    """List all certificates earned by current user."""
    result = await db.execute(
        select(Certificate, Course)
        .join(Course, Certificate.course_id == Course.id)
        .where(Certificate.user_id == user.id)
        .order_by(Certificate.issued_at.desc())
    )
    rows = result.all()

    return [
        CertificateListItem(
            id=cert.id,
            certificate_code=cert.certificate_code,
            course_id=course.id,
            course_title=course.title,
            course_slug=course.slug,
            issued_at=cert.issued_at,
        )
        for cert, course in rows
    ]


@router.get("/{code}", response_model=CertificateRead)
async def get_certificate(
    code: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CertificateRead:
    """Public certificate verification endpoint (accessible by anyone with the code)."""
    result = await db.execute(
        select(Certificate, Course, User)
        .join(Course, Certificate.course_id == Course.id)
        .join(User, Certificate.user_id == User.id)
        .where(Certificate.certificate_code == code)
    )
    row = result.first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="certificate not found",
        )
    cert, course, user = row

    display_name = user.full_name or user.email.split("@")[0]

    return CertificateRead(
        id=cert.id,
        certificate_code=cert.certificate_code,
        course_id=course.id,
        course_title=course.title,
        course_slug=course.slug,
        issued_at=cert.issued_at,
        student_name=display_name,
        student_email=user.email,
    )
