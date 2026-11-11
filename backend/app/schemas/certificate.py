"""ZORVI — Certificate schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CertificateListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    certificate_code: str
    course_id: uuid.UUID
    course_title: str
    course_slug: str
    issued_at: datetime


class CertificateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    certificate_code: str
    course_id: uuid.UUID
    course_title: str
    course_slug: str
    issued_at: datetime
    student_name: str
    student_email: str
