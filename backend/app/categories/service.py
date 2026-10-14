from uuid import UUID

from psycopg import errors as pg_errors
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.categories.schemas import Category, CategoryCreate, CategoryUpdate
from app.errors import AppError, NotFoundError
from app.scope import HouseholdScope

SELECT_CATEGORY = """
SELECT id, kind, name, color, icon, archived_at IS NOT NULL AS archived, created_at
FROM categories
"""


def _is_unique_violation(error: DBAPIError) -> bool:
    return isinstance(error.orig, pg_errors.UniqueViolation)


def list_categories(scope: HouseholdScope) -> list[Category]:
    rows = scope.session.execute(text(f"{SELECT_CATEGORY} ORDER BY kind, created_at, name")).all()
    return [Category.model_validate(row, from_attributes=True) for row in rows]


def get_category(scope: HouseholdScope, category_id: UUID) -> Category:
    row = scope.session.execute(
        text(f"{SELECT_CATEGORY} WHERE id = :id"), {"id": category_id}
    ).one_or_none()
    if row is None:
        raise NotFoundError("category_not_found")
    return Category.model_validate(row, from_attributes=True)


def create_category(scope: HouseholdScope, body: CategoryCreate) -> Category:
    try:
        category_id = scope.session.execute(
            text(
                "INSERT INTO categories (household_id, kind, name, color, icon)"
                " VALUES (:household_id, :kind, :name, :color, :icon) RETURNING id"
            ),
            {"household_id": scope.household_id, **body.model_dump()},
        ).scalar_one()
    except DBAPIError as error:
        if _is_unique_violation(error):
            raise AppError("category_exists") from error
        raise
    return get_category(scope, category_id)


def update_category(scope: HouseholdScope, category_id: UUID, body: CategoryUpdate) -> Category:
    changes = body.model_dump(exclude_none=True)
    if changes:
        assignments = ", ".join(f"{column} = :{column}" for column in changes)
        try:
            updated = scope.session.execute(
                text(
                    f"UPDATE categories SET {assignments}"
                    " WHERE id = :id AND archived_at IS NULL RETURNING id"
                ),
                {"id": category_id, **changes},
            ).one_or_none()
        except DBAPIError as error:
            if _is_unique_violation(error):
                raise AppError("category_exists") from error
            raise
        if updated is None:
            raise NotFoundError("category_not_found")
    return get_category(scope, category_id)


def delete_category(scope: HouseholdScope, category_id: UUID) -> str:
    """Deletes an unused category; archives one that transactions, schedules or budgets use."""
    get_category(scope, category_id)
    try:
        with scope.session.begin_nested():
            scope.session.execute(
                text("DELETE FROM categories WHERE id = :id"), {"id": category_id}
            )
        return "deleted"
    except DBAPIError as error:
        if not isinstance(error.orig, pg_errors.ForeignKeyViolation):
            raise
    scope.session.execute(
        text("UPDATE categories SET archived_at = coalesce(archived_at, now()) WHERE id = :id"),
        {"id": category_id},
    )
    return "archived"
