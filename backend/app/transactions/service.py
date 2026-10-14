from dataclasses import dataclass
from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Row

from app.errors import InvalidError, NotFoundError
from app.scope import HouseholdScope
from app.transactions.schemas import (
    CategoryRef,
    SortOrder,
    Transaction,
    TransactionCreate,
    TransactionPage,
    TransactionUpdate,
)

SELECT_TRANSACTION = """
SELECT t.id, t.kind, t.amount, t.occurred_on, t.description, t.status, t.party_user_id,
       t.created_by, t.created_at, t.updated_at,
       c.id AS category_id, c.name AS category_name, c.color AS category_color,
       c.icon AS category_icon, c.archived_at IS NOT NULL AS category_archived
FROM transactions t
JOIN categories c ON c.id = t.category_id
"""

ORDER_BY: dict[SortOrder, str] = {
    "date_desc": "t.occurred_on DESC, t.created_at DESC",
    "date_asc": "t.occurred_on ASC, t.created_at ASC",
    "amount_desc": "t.amount DESC, t.occurred_on DESC",
    "amount_asc": "t.amount ASC, t.occurred_on DESC",
}


def to_transaction(row: Row) -> Transaction:
    return Transaction(
        id=row.id,
        kind=row.kind,
        amount=row.amount,
        occurred_on=row.occurred_on,
        category=CategoryRef(
            id=row.category_id,
            name=row.category_name,
            color=row.category_color,
            icon=row.category_icon,
            archived=row.category_archived,
        ),
        description=row.description,
        status=row.status,
        party_user_id=row.party_user_id,
        created_by=row.created_by,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@dataclass(frozen=True)
class TransactionFilters:
    date_from: date | None = None
    date_to: date | None = None
    kind: str | None = None
    status: str | None = None
    category_id: UUID | None = None
    # A member's user id, or "joint" for the joint account.
    party: str | None = None
    query: str | None = None


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _where(filters: TransactionFilters) -> tuple[str, dict[str, Any]]:
    conditions: list[str] = []
    params: dict[str, Any] = {}
    if filters.date_from:
        conditions.append("t.occurred_on >= :date_from")
        params["date_from"] = filters.date_from
    if filters.date_to:
        conditions.append("t.occurred_on <= :date_to")
        params["date_to"] = filters.date_to
    if filters.kind:
        conditions.append("t.kind = :kind")
        params["kind"] = filters.kind
    if filters.status:
        conditions.append("t.status = :status")
        params["status"] = filters.status
    if filters.category_id:
        conditions.append("t.category_id = :category_id")
        params["category_id"] = filters.category_id
    if filters.party == "joint":
        conditions.append("t.party_user_id IS NULL")
    elif filters.party:
        conditions.append("t.party_user_id = :party")
        params["party"] = filters.party
    if filters.query and filters.query.strip():
        conditions.append("(t.description ILIKE :query OR c.name ILIKE :query)")
        params["query"] = f"%{_escape_like(filters.query.strip())}%"
    return (" WHERE " + " AND ".join(conditions)) if conditions else "", params


def list_transactions(
    scope: HouseholdScope,
    filters: TransactionFilters,
    sort: SortOrder,
    limit: int,
    offset: int,
) -> TransactionPage:
    where, params = _where(filters)
    total = scope.session.scalar(
        text(
            f"SELECT count(*) FROM transactions t JOIN categories c ON c.id = t.category_id{where}"
        ),
        params,
    )
    rows = scope.session.execute(
        text(f"{SELECT_TRANSACTION}{where} ORDER BY {ORDER_BY[sort]} LIMIT :limit OFFSET :offset"),
        {**params, "limit": limit, "offset": offset},
    ).all()
    return TransactionPage(items=[to_transaction(row) for row in rows], total=total or 0)


def get_transaction(scope: HouseholdScope, transaction_id: UUID) -> Transaction:
    row = scope.session.execute(
        text(f"{SELECT_TRANSACTION} WHERE t.id = :id"), {"id": transaction_id}
    ).one_or_none()
    if row is None:
        raise NotFoundError("transaction_not_found")
    return to_transaction(row)


def check_category(
    scope: HouseholdScope, category_id: UUID, kind: str, allow_archived: bool = False
) -> None:
    """The category must be one of the household's, of the same kind, and still active."""
    category = scope.session.execute(
        text("SELECT kind, archived_at IS NOT NULL AS archived FROM categories WHERE id = :id"),
        {"id": category_id},
    ).one_or_none()
    if category is None:
        raise InvalidError("category_not_found")
    if category.kind != kind:
        raise InvalidError("category_kind_mismatch")
    if category.archived and not allow_archived:
        raise InvalidError("category_archived")


def check_party(scope: HouseholdScope, party_user_id: UUID | None) -> None:
    if party_user_id is None:
        return
    is_member = scope.session.scalar(
        text(
            "SELECT EXISTS (SELECT 1 FROM household_members"
            " WHERE household_id = :household_id AND user_id = :user_id)"
        ),
        {"household_id": scope.household_id, "user_id": party_user_id},
    )
    if not is_member:
        raise InvalidError("invalid_member")


def create_transaction(scope: HouseholdScope, body: TransactionCreate) -> Transaction:
    check_category(scope, body.category_id, body.kind)
    check_party(scope, body.party_user_id)
    transaction_id = scope.session.execute(
        text(
            "INSERT INTO transactions (household_id, kind, amount, occurred_on, category_id,"
            " description, status, party_user_id)"
            " VALUES (:household_id, :kind, :amount, :occurred_on, :category_id,"
            " :description, :status, :party_user_id) RETURNING id"
        ),
        {"household_id": scope.household_id, **body.model_dump()},
    ).scalar_one()
    return get_transaction(scope, transaction_id)


def update_transaction(
    scope: HouseholdScope, transaction_id: UUID, body: TransactionUpdate
) -> Transaction:
    current = get_transaction(scope, transaction_id)
    changes = body.model_dump(exclude_unset=True)
    # Only party_user_id may be explicitly cleared (joint account); other nulls mean "unchanged".
    changes = {k: v for k, v in changes.items() if v is not None or k == "party_user_id"}
    if not changes:
        return current

    kind = changes.get("kind", current.kind)
    category_id = changes.get("category_id", current.category.id)
    if "kind" in changes or "category_id" in changes:
        # Keeping an archived category on an old transaction is fine; choosing one is not.
        check_category(scope, category_id, kind, allow_archived=category_id == current.category.id)
    if "party_user_id" in changes:
        check_party(scope, changes["party_user_id"])

    assignments = ", ".join(f"{column} = :{column}" for column in changes)
    scope.session.execute(
        text(f"UPDATE transactions SET {assignments} WHERE id = :id"),
        {"id": transaction_id, **changes},
    )
    return get_transaction(scope, transaction_id)


def delete_transaction(scope: HouseholdScope, transaction_id: UUID) -> None:
    deleted = scope.session.execute(
        text("DELETE FROM transactions WHERE id = :id RETURNING id"), {"id": transaction_id}
    ).one_or_none()
    if deleted is None:
        raise NotFoundError("transaction_not_found")


def confirm_transactions(scope: HouseholdScope, ids: list[UUID]) -> int:
    """Marks planned transactions as completed. Already completed ones are left as they are."""
    result = scope.session.execute(
        text(
            "UPDATE transactions SET status = 'completed'"
            " WHERE id = ANY(:ids) AND status = 'planned' RETURNING id"
        ),
        {"ids": ids},
    )
    return len(result.all())
