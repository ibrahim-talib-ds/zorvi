"""Authenticated CRUD for a user's persisted ibrant build projects."""
import io
import re
import uuid
import zipfile
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.user_project import UserProject
from app.schemas.user_project import ProjectCreate, ProjectFile, ProjectRead, ProjectSummary, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["build-projects"])
MAX_PROJECTS_PER_USER = 50
MAX_PROJECT_BYTES = 2 * 1024 * 1024


def _validate_files(files: list[ProjectFile]) -> list[dict[str, str]]:
    seen: set[str] = set()
    total_bytes = 0
    payload: list[dict[str, str]] = []
    for file in files:
        if file.path in seen:
            raise HTTPException(status_code=422, detail=f"Duplicate project file: {file.path}")
        seen.add(file.path)
        total_bytes += len(file.content.encode("utf-8"))
        if total_bytes > MAX_PROJECT_BYTES:
            raise HTTPException(status_code=413, detail="Project files exceed the 2 MB workspace limit.")
        payload.append({"path": file.path, "content": file.content})
    return payload


def _summary(project: UserProject) -> ProjectSummary:
    return ProjectSummary(
        id=project.id,
        name=project.name,
        description=project.description,
        template=project.template,
        file_count=len(project.files or []),
        created_at=project.created_at,
        updated_at=project.updated_at,
        last_opened_at=project.last_opened_at,
    )


async def _owned_project(project_id: uuid.UUID, user: User, db: AsyncSession) -> UserProject:
    result = await db.execute(
        select(UserProject).where(
            UserProject.id == project_id,
            UserProject.user_id == user.id,
        )
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.get("", response_model=list[ProjectSummary])
async def list_my_projects(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ProjectSummary]:
    result = await db.execute(
        select(UserProject)
        .where(UserProject.user_id == user.id)
        .order_by(UserProject.updated_at.desc())
        .limit(MAX_PROJECTS_PER_USER)
    )
    return [_summary(project) for project in result.scalars().all()]


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectRead:
    count = await db.scalar(
        select(func.count(UserProject.id)).where(UserProject.user_id == user.id)
    )
    if (count or 0) >= MAX_PROJECTS_PER_USER:
        raise HTTPException(status_code=409, detail=f"You can keep up to {MAX_PROJECTS_PER_USER} projects in your workspace.")

    project = UserProject(
        user_id=user.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        template=payload.template,
        files=_validate_files(payload.files),
    )
    if not project.name:
        raise HTTPException(status_code=422, detail="Project name is required.")
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ProjectRead(
        **_summary(project).model_dump(),
        files=[ProjectFile.model_validate(file) for file in project.files or []],
    )


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectRead:
    project = await _owned_project(project_id, user, db)
    project.last_opened_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    return ProjectRead(
        **_summary(project).model_dump(),
        files=[ProjectFile.model_validate(file) for file in project.files or []],
    )


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectRead:
    project = await _owned_project(project_id, user, db)
    changes = payload.model_dump(exclude_unset=True)
    if "name" in changes:
        name = (changes["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Project name is required.")
        project.name = name
    if "description" in changes:
        project.description = changes["description"].strip() if changes["description"] else None
    if "template" in changes and changes["template"] is not None:
        project.template = changes["template"]
    if "files" in changes and changes["files"] is not None:
        project.files = _validate_files([ProjectFile.model_validate(file) for file in changes["files"]])
    await db.commit()
    await db.refresh(project)
    return ProjectRead(
        **_summary(project).model_dump(),
        files=[ProjectFile.model_validate(file) for file in project.files or []],
    )


@router.get("/{project_id}/download")
async def download_project_archive(
    project_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    project = await _owned_project(project_id, user, db)
    output = io.BytesIO()
    with zipfile.ZipFile(output, mode="w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for raw_file in project.files or []:
            file = ProjectFile.model_validate(raw_file)
            archive.writestr(file.path, file.content)
    archive_bytes = output.getvalue()
    stem = re.sub(r"[^a-zA-Z0-9._-]+", "-", project.name).strip(".-_")[:80] or "ibrant-project"
    file_name = f"{stem}.zip"
    return StreamingResponse(
        io.BytesIO(archive_bytes),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{file_name}"',
            "Content-Length": str(len(archive_bytes)),
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    project = await _owned_project(project_id, user, db)
    await db.delete(project)
    await db.commit()
