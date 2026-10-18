from datetime import timedelta

from sqlalchemy import text

from app.budgets.service import effective_budget
from app.ledger import ZERO, ledger_totals, usage
from app.periods import Month
from app.schedules.service import future_occurrences
from app.scope import HouseholdScope
from app.summary.schemas import (
    BudgetUsage,
    CategorySpending,
    Flow,
    MonthSummary,
    UpcomingItem,
)
from app.transactions.service import SELECT_TRANSACTION, to_transaction

RECENT_COUNT = 5
UPCOMING_COUNT = 8


def _upcoming(scope: HouseholdScope, month: Month) -> list[UpcomingItem]:
    """Planned items of the month after today, soonest first. Today's and earlier planned
    items are due and already listed as pending confirmation."""
    start = max(month.first_day, scope.today + timedelta(days=1))
    if start > month.last_day:
        return []
    rows = scope.session.execute(
        text(
            f"{SELECT_TRANSACTION} WHERE t.status = 'planned'"
            " AND t.occurred_on BETWEEN :start AND :end ORDER BY t.occurred_on"
        ),
        {"start": start, "end": month.last_day},
    ).all()
    items = [
        UpcomingItem(
            source="transaction",
            transaction_id=row.id,
            schedule_id=row.schedule_id,
            schedule_type=row.schedule_type,
            sequence_no=row.sequence_no,
            installments_count=row.installments_count,
            kind=row.kind,
            occurred_on=row.occurred_on,
            amount=row.amount,
            category=to_transaction(row).category,
            description=row.description,
        )
        for row in rows
    ]
    items += [
        UpcomingItem(
            source="schedule",
            transaction_id=None,
            schedule_id=o.schedule_id,
            schedule_type=o.type,
            sequence_no=o.sequence_no,
            installments_count=o.installments_count,
            kind=o.kind,
            occurred_on=o.occurred_on,
            amount=o.amount,
            category=o.category,
            description=o.description,
        )
        for o in future_occurrences(scope, start, month.last_day)
    ]
    items.sort(key=lambda item: item.occurred_on)
    return items[:UPCOMING_COUNT]


def month_summary(scope: HouseholdScope, month: Month) -> MonthSummary:
    totals = ledger_totals(scope, month.first_day, month.last_day)
    income = Flow(actual=totals.completed_total("income"), planned=totals.planned_total("income"))
    expense = Flow(
        actual=totals.completed_total("expense"), planned=totals.planned_total("expense")
    )
    balance = income.actual - expense.actual

    budget = None
    budget_amount = effective_budget(scope, month)
    if budget_amount is not None:
        percent, status = usage(expense.actual, budget_amount)
        assert percent is not None and status is not None
        budget = BudgetUsage(
            budget=budget_amount,
            actual=expense.actual,
            remaining=budget_amount - expense.actual,
            percent=percent,
            status=status,
        )

    spent = totals.completed["expense"]
    planned = totals.planned["expense"]
    by_category = [
        CategorySpending(
            category=totals.categories[category_id],
            actual=spent.get(category_id, ZERO),
            planned=planned.get(category_id, ZERO),
        )
        for category_id in set(spent) | set(planned)
    ]
    by_category.sort(key=lambda c: (-c.actual, -c.planned, c.category.name))

    recent_rows = scope.session.execute(
        text(
            f"{SELECT_TRANSACTION} WHERE t.occurred_on BETWEEN :start AND :end"
            " ORDER BY t.occurred_on DESC, t.created_at DESC LIMIT :limit"
        ),
        {"start": month.first_day, "end": month.last_day, "limit": RECENT_COUNT},
    ).all()

    return MonthSummary(
        month=str(month),
        income=income,
        expense=expense,
        balance=balance,
        projected_balance=balance + income.planned - expense.planned,
        budget=budget,
        expense_by_category=by_category,
        recent=[to_transaction(row) for row in recent_rows],
        upcoming=_upcoming(scope, month),
    )
