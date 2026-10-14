from decimal import Decimal
from uuid import UUID

from sqlalchemy import text

from app.budgets.schemas import BudgetInput, BudgetMonth, CategoryBudget
from app.errors import AppError, InvalidError
from app.ledger import ZERO, ledger_totals, usage
from app.periods import Month
from app.scope import HouseholdScope
from app.transactions.schemas import CategoryRef


def _budget_rows(scope: HouseholdScope, month: Month) -> dict[UUID | None, Decimal]:
    rows = scope.session.execute(
        text("SELECT category_id, amount FROM budgets WHERE month = :month"),
        {"month": month.first_day},
    ).all()
    return {row.category_id: row.amount for row in rows}


def _category_refs(scope: HouseholdScope, ids: set[UUID]) -> dict[UUID, CategoryRef]:
    if not ids:
        return {}
    rows = scope.session.execute(
        text(
            "SELECT id, name, color, icon, archived_at IS NOT NULL AS archived"
            " FROM categories WHERE id = ANY(:ids)"
        ),
        {"ids": list(ids)},
    ).all()
    return {row.id: CategoryRef.model_validate(row, from_attributes=True) for row in rows}


def effective_budget(scope: HouseholdScope, month: Month) -> Decimal | None:
    """The overall budget of the month, or the sum of its category budgets."""
    budgets = _budget_rows(scope, month)
    total = budgets.pop(None, None)
    return total if total is not None else (sum(budgets.values()) or None)


def get_budget(scope: HouseholdScope, month: Month) -> BudgetMonth:
    budgets = _budget_rows(scope, month)
    total_budget = budgets.pop(None, None)
    totals = ledger_totals(scope, month.first_day, month.last_day)
    actual_by_category = totals.completed["expense"]
    planned_by_category = totals.planned["expense"]

    category_ids = set(budgets) | set(actual_by_category) | set(planned_by_category)
    refs = {**_category_refs(scope, set(budgets)), **totals.categories}

    categories = []
    for category_id in category_ids:
        budget = budgets.get(category_id)
        actual = actual_by_category.get(category_id, ZERO)
        percent, status = usage(actual, budget)
        categories.append(
            CategoryBudget(
                category=refs[category_id],
                budget=budget,
                actual=actual,
                planned=planned_by_category.get(category_id, ZERO),
                remaining=None if budget is None else budget - actual,
                percent=percent,
                status=status,
            )
        )
    # Budgeted categories first (largest first), then unbudgeted spending.
    categories.sort(key=lambda c: (c.budget is None, -(c.budget or c.actual), c.category.name))

    effective = total_budget if total_budget is not None else (sum(budgets.values()) or None)
    actual = totals.completed_total("expense")
    percent, status = usage(actual, effective)
    previous = scope.session.scalar(
        text("SELECT EXISTS (SELECT 1 FROM budgets WHERE month = :month)"),
        {"month": month.shift(-1).first_day},
    )
    return BudgetMonth(
        month=str(month),
        total_budget=total_budget,
        effective_budget=effective,
        actual=actual,
        planned=totals.planned_total("expense"),
        remaining=None if effective is None else effective - actual,
        percent=percent,
        status=status,
        categories=categories,
        previous_month_has_budget=bool(previous),
    )


def _check_categories(scope: HouseholdScope, ids: list[UUID], existing: set[UUID]) -> None:
    if len(set(ids)) != len(ids):
        raise InvalidError("duplicate_category")
    rows = scope.session.execute(
        text(
            "SELECT id, kind, archived_at IS NOT NULL AS archived"
            " FROM categories WHERE id = ANY(:ids)"
        ),
        {"ids": ids},
    ).all()
    found = {row.id: row for row in rows}
    for category_id in ids:
        row = found.get(category_id)
        if row is None:
            raise InvalidError("category_not_found")
        if row.kind != "expense":
            raise InvalidError("category_kind_mismatch")
        # A budget kept from before the category was deleted may stay; a new one may not.
        if row.archived and category_id not in existing:
            raise InvalidError("category_archived")


def _replace(scope: HouseholdScope, month: Month, rows: dict[UUID | None, Decimal]) -> None:
    scope.session.execute(
        text("DELETE FROM budgets WHERE month = :month"), {"month": month.first_day}
    )
    for category_id, amount in rows.items():
        scope.session.execute(
            text(
                "INSERT INTO budgets (household_id, month, category_id, amount)"
                " VALUES (:household_id, :month, :category_id, :amount)"
            ),
            {
                "household_id": scope.household_id,
                "month": month.first_day,
                "category_id": category_id,
                "amount": amount,
            },
        )


def _lock_household(scope: HouseholdScope) -> None:
    # Serializes budget saves of the same household, so two partners saving at once
    # cannot interleave their delete-and-insert.
    scope.session.execute(
        text("SELECT pg_advisory_xact_lock(hashtext('budgets'), hashtext(:household_id))"),
        {"household_id": str(scope.household_id)},
    )


def save_budget(scope: HouseholdScope, month: Month, body: BudgetInput) -> BudgetMonth:
    _lock_household(scope)
    existing = {k for k in _budget_rows(scope, month) if k is not None}
    _check_categories(scope, [c.category_id for c in body.categories], existing)
    rows: dict[UUID | None, Decimal] = {c.category_id: c.amount for c in body.categories}
    if body.total is not None:
        rows[None] = body.total
    _replace(scope, month, rows)
    return get_budget(scope, month)


def copy_previous_budget(scope: HouseholdScope, month: Month) -> BudgetMonth:
    """Replaces the month's budget with the previous month's (without archived categories)."""
    _lock_household(scope)
    previous = scope.session.execute(
        text(
            "SELECT b.category_id, b.amount FROM budgets b"
            " LEFT JOIN categories c ON c.id = b.category_id"
            " WHERE b.month = :month AND (b.category_id IS NULL OR c.archived_at IS NULL)"
        ),
        {"month": month.shift(-1).first_day},
    ).all()
    if not previous:
        raise AppError("no_previous_budget")
    _replace(scope, month, {row.category_id: row.amount for row in previous})
    return get_budget(scope, month)
