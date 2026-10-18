from datetime import date
from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal
from uuid import UUID

from psycopg import errors as pg_errors
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.errors import AppError, NotFoundError
from app.goals.schemas import DepositCreate, Goal, GoalCreate, GoalUpdate
from app.ledger import ZERO
from app.scope import HouseholdScope
from app.transactions import service as transactions
from app.transactions.schemas import Transaction, TransactionCreate

SAVINGS_CATEGORY = {"name": "חיסכון", "color": "teal", "icon": "piggy-bank"}
AGORA = Decimal("0.01")

SELECT_GOALS = """
SELECT g.id, g.name, g.target_amount, g.target_date, g.category_id,
       g.created_at::date AS created_on,
       coalesce(sum(t.amount) FILTER (WHERE t.status = 'completed'), 0) AS saved
FROM savings_goals g
LEFT JOIN transactions t ON t.goal_id = g.id
WHERE g.archived_at IS NULL
"""


def _months_until(today: date, target: date) -> int:
    """Months left including the current one; 0 once the target month has passed."""
    return max(0, (target.year - today.year) * 12 + target.month - today.month + 1)


def goal_progress(
    target: Decimal, saved: Decimal, target_date: date | None, created_on: date, today: date
) -> tuple[Decimal, int, Decimal | None, bool]:
    """Remaining amount, percent saved, monthly amount needed and whether it is behind."""
    remaining = max(target - saved, ZERO)
    percent = int((saved * 100 / target).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    if target_date is None or remaining == ZERO:
        return remaining, percent, None, False
    months = _months_until(today, target_date)
    # Rounded up to the agora, so paying it every month reaches the target.
    monthly = (remaining / max(months, 1)).quantize(AGORA, rounding=ROUND_CEILING)
    total_days = (target_date - created_on).days
    if total_days <= 0:
        expected = target
    else:
        elapsed = min(max((today - created_on).days, 0), total_days)
        expected = target * elapsed / total_days
    return remaining, percent, monthly, saved < expected


def _to_goal(row, today: date) -> Goal:
    remaining, percent, monthly, behind = goal_progress(
        row.target_amount, row.saved, row.target_date, row.created_on, today
    )
    return Goal(
        id=row.id,
        name=row.name,
        target_amount=row.target_amount,
        target_date=row.target_date,
        saved=row.saved,
        remaining=remaining,
        percent=percent,
        monthly_needed=monthly,
        behind=behind,
        reached=remaining == ZERO,
    )


def list_goals(scope: HouseholdScope) -> list[Goal]:
    rows = scope.session.execute(
        text(f"{SELECT_GOALS} GROUP BY g.id ORDER BY g.target_date NULLS LAST, g.created_at")
    ).all()
    return [_to_goal(row, scope.today) for row in rows]


def get_goal(scope: HouseholdScope, goal_id: UUID) -> Goal:
    row = _goal_row(scope, goal_id)
    return _to_goal(row, scope.today)


def _goal_row(scope: HouseholdScope, goal_id: UUID):
    row = scope.session.execute(
        text(f"{SELECT_GOALS} AND g.id = :id GROUP BY g.id"), {"id": goal_id}
    ).one_or_none()
    if row is None:
        raise NotFoundError("goal_not_found")
    return row


def _savings_category(scope: HouseholdScope) -> UUID:
    """The household's active savings category, created on first use."""
    params = {"household_id": scope.household_id, **SAVINGS_CATEGORY}
    find = text(
        "SELECT id FROM categories WHERE kind = 'expense' AND archived_at IS NULL"
        " AND lower(name) = lower(:name)"
    )
    category_id = scope.session.scalar(find, params)
    if category_id is None:
        category_id = scope.session.scalar(
            text(
                "INSERT INTO categories (household_id, kind, name, color, icon)"
                " VALUES (:household_id, 'expense', :name, :color, :icon)"
                " ON CONFLICT DO NOTHING RETURNING id"
            ),
            params,
        ) or scope.session.scalar(find, params)  # created meanwhile by the partner
    return category_id


def _write(scope: HouseholdScope, sql: str, params: dict) -> UUID | None:
    try:
        return scope.session.scalar(text(sql), params)
    except DBAPIError as error:
        if isinstance(error.orig, pg_errors.UniqueViolation):
            raise AppError("goal_exists") from error
        raise


def create_goal(scope: HouseholdScope, body: GoalCreate) -> Goal:
    goal_id = _write(
        scope,
        "INSERT INTO savings_goals (household_id, name, target_amount, target_date, category_id)"
        " VALUES (:household_id, :name, :target_amount, :target_date, :category_id)"
        " RETURNING id",
        {
            "household_id": scope.household_id,
            "category_id": _savings_category(scope),
            **body.model_dump(),
        },
    )
    return get_goal(scope, goal_id)


def update_goal(scope: HouseholdScope, goal_id: UUID, body: GoalUpdate) -> Goal:
    changes = body.model_dump(exclude_unset=True)
    # Only target_date may be cleared; other nulls mean "unchanged".
    changes = {k: v for k, v in changes.items() if v is not None or k == "target_date"}
    if changes:
        assignments = ", ".join(f"{column} = :{column}" for column in changes)
        updated = _write(
            scope,
            f"UPDATE savings_goals SET {assignments}"
            " WHERE id = :id AND archived_at IS NULL RETURNING id",
            {"id": goal_id, **changes},
        )
        if updated is None:
            raise NotFoundError("goal_not_found")
    return get_goal(scope, goal_id)


def delete_goal(scope: HouseholdScope, goal_id: UUID) -> str:
    """Deletes a goal without deposits; archives one that has them (deposits stay)."""
    _goal_row(scope, goal_id)
    has_deposits = scope.session.scalar(
        text("SELECT EXISTS (SELECT 1 FROM transactions WHERE goal_id = :id)"), {"id": goal_id}
    )
    if has_deposits:
        scope.session.execute(
            text("UPDATE savings_goals SET archived_at = now() WHERE id = :id"), {"id": goal_id}
        )
        return "archived"
    scope.session.execute(text("DELETE FROM savings_goals WHERE id = :id"), {"id": goal_id})
    return "deleted"


def deposit(scope: HouseholdScope, goal_id: UUID, body: DepositCreate) -> Transaction:
    """Records money put aside for a goal: a completed expense in its savings category."""
    goal = _goal_row(scope, goal_id)
    category_id = goal.category_id
    archived = scope.session.scalar(
        text("SELECT archived_at IS NOT NULL FROM categories WHERE id = :id"), {"id": category_id}
    )
    if archived:
        # The savings category was deleted since; deposits move to an active one.
        category_id = _savings_category(scope)
        scope.session.execute(
            text("UPDATE savings_goals SET category_id = :category_id WHERE id = :id"),
            {"category_id": category_id, "id": goal_id},
        )
    return transactions.create_transaction(
        scope,
        TransactionCreate(
            kind="expense",
            amount=body.amount,
            occurred_on=body.occurred_on or scope.today,
            category_id=category_id,
            description=goal.name,
            status="completed",
            party_user_id=body.party_user_id,
            request_id=body.request_id,
        ),
        goal_id=goal_id,
    )
