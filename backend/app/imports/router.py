from fastapi import APIRouter, status

from app.imports import service
from app.imports.schemas import CommitRequest, CommitResult, PreviewRequest, PreviewRow
from app.scope import Scope

router = APIRouter(prefix="/api/imports", tags=["imports"])


@router.post("/preview")
def preview_import(body: PreviewRequest, scope: Scope) -> list[PreviewRow]:
    return service.preview(scope, body)


@router.post("/commit", status_code=status.HTTP_201_CREATED)
def commit_import(body: CommitRequest, scope: Scope) -> CommitResult:
    return service.commit(scope, body)
