from uuid import UUID

from fastapi import APIRouter, status

from app.categories import service
from app.categories.schemas import Category, CategoryCreate, CategoryDeleted, CategoryUpdate
from app.scope import Scope

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("")
def list_categories(scope: Scope) -> list[Category]:
    return service.list_categories(scope)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_category(body: CategoryCreate, scope: Scope) -> Category:
    return service.create_category(scope, body)


@router.patch("/{category_id}")
def update_category(category_id: UUID, body: CategoryUpdate, scope: Scope) -> Category:
    return service.update_category(scope, category_id, body)


@router.delete("/{category_id}")
def delete_category(category_id: UUID, scope: Scope) -> CategoryDeleted:
    return CategoryDeleted(result=service.delete_category(scope, category_id))
