from collections import defaultdict
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import text

from app.budgets.service import effective_budget
from app.errors import InvalidError
from app.ledger import ZERO, ledger_totals
from app.periods import Month
from app.reports.schemas import (
    CategoryChange,
    CategoryRow,
    Forecast,
    MonthInsights,
    MonthRow,
    Report,
    YearRow,
    YearSavings,
)
from app.schedules.service import future_occurrences
from app.scope import HouseholdScope

MAX_MONTHS = 60


def percent_change(current: Decimal, previous: Decimal) -> int | None:
    if previous == 0:
        return None
    return int(((current - previous) * 100 / previous).quantize(Decimal(1), ROUND_HALF_UP))


def _share(part: Decimal, whole: Decimal) -> int:
    if whole == 0:
        return 0
    return int((part * 100 / whole).quantize(Decimal(1), ROUND_HALF_UP))


def _monthly_sums(
    scope: HouseholdScope, date_from: date, date_to: date
) -> dict[tuple[str, str, str], Decimal]:
    """(month, kind, status) → sum of transactions."""
    rows = scope.session.execute(
        text(
            "SELECT to_char(occurred_on, 'YYYY-MM') AS month, kind, status, sum(amount) AS amount"
            " FROM transactions WHERE occurred_on BETWEEN :date_from AND :date_to"
            " GROUP BY 1, 2, 3"
        ),
        {"date_from": date_from, "date_to": date_to},
    ).all()
    sums: dict[tuple[str, str, str], Decimal] = defaultdict(Decimal)
    for row in rows:
        sums[(row.month, row.kind, row.status)] = row.amount
    return sums


def _yearly_actuals(scope: HouseholdScope, first_year: int, last_year: int) -> dict:
    rows = scope.session.execute(
        text(
            "SELECT extract(year FROM occurred_on)::int AS year, kind, sum(amount) AS amount"
            " FROM transactions WHERE status = 'completed'"
            " AND occurred_on BETWEEN :date_from AND :date_to GROUP BY 1, 2"
        ),
        {"date_from": date(first_year, 1, 1), "date_to": date(last_year, 12, 31)},
    ).all()
    sums: dict[tuple[int, str], Decimal] = defaultdict(Decimal)
    for row in rows:
        sums[(row.year, row.kind)] = row.amount
    return sums


def build_report(scope: HouseholdScope, first: Month, last: Month) -> Report:
    if last < first:
        raise InvalidError("invalid_range")
    months = [
        first.shift(i) for i in range((last.year - first.year) * 12 + last.month - first.month + 1)
    ]
    if len(months) > MAX_MONTHS:
        raise InvalidError("range_too_long")

    # One month earlier, so the first month also gets a change against its predecessor.
    sums = _monthly_sums(scope, first.shift(-1).first_day, last.last_day)
    for occurrence in future_occurrences(scope, first.first_day, last.last_day):
        key = (str(Month.of(occurrence.occurred_on)), occurrence.kind, "planned")
        sums[key] += occurrence.amount

    month_rows = []
    for month in months:
        key = str(month)
        income = sums.get((key, "income", "completed"), ZERO)
        expense = sums.get((key, "expense", "completed"), ZERO)
        previous_expense = sums.get((str(month.shift(-1)), "expense", "completed"), ZERO)
        month_rows.append(
            MonthRow(
                month=key,
                income=income,
                expense=expense,
                balance=income - expense,
                income_planned=sums.get((key, "income", "planned"), ZERO),
                expense_planned=sums.get((key, "expense", "planned"), ZERO),
                expense_change_percent=percent_change(expense, previous_expense),
            )
        )

    totals = ledger_totals(scope, first.first_day, last.last_day)
    expense_total = totals.completed_total("expense")
    spent, planned = totals.completed["expense"], totals.planned["expense"]
    categories = [
        CategoryRow(
            category=totals.categories[category_id],
            actual=spent.get(category_id, ZERO),
            planned=planned.get(category_id, ZERO),
            share_percent=_share(spent.get(category_id, ZERO), expense_total),
        )
        for category_id in set(spent) | set(planned)
    ]
    categories.sort(key=lambda c: (-c.actual, -c.planned, c.category.name))

    yearly = _yearly_actuals(scope, first.year - 1, last.year)
    years = []
    for year in range(first.year, last.year + 1):
        income, expense = yearly[(year, "income")], yearly[(year, "expense")]
        previous_income, previous_expense = (
            yearly[(year - 1, "income")],
            yearly[(year - 1, "expense")],
        )
        years.append(
            YearRow(
                year=year,
                income=income,
                expense=expense,
                balance=income - expense,
                previous_income=previous_income,
                previous_expense=previous_expense,
                income_change_percent=percent_change(income, previous_income),
                expense_change_percent=percent_change(expense, previous_expense),
            )
        )

    income_total = totals.completed_total("income")
    return Report(
        date_from=str(first),
        date_to=str(last),
        income=income_total,
        expense=expense_total,
        balance=income_total - expense_total,
        income_planned=totals.planned_total("income"),
        expense_planned=totals.planned_total("expense"),
        average_monthly_expense=(expense_total / len(months)).quantize(
            Decimal("0.01"), ROUND_HALF_UP
        ),
        months=month_rows,
        categories=categories,
        years=years,
    )


def _forecast(scope: HouseholdScope, month: Month) -> Forecast | None:
    """Expected end of the current month: what is recorded, what is planned, and the rest
    of the month's day-to-day spending at its pace so far. Fixed payments (schedules) and
    goal deposits are not extrapolated."""
    today = scope.today
    if Month.of(today) != month:
        return None
    totals = ledger_totals(scope, month.first_day, month.last_day)
    day_to_day = scope.session.scalar(
        text(
            "SELECT coalesce(sum(amount), 0) FROM transactions"
            " WHERE kind = 'expense' AND status = 'completed'"
            " AND schedule_id IS NULL AND goal_id IS NULL"
            " AND occurred_on BETWEEN :date_from AND :date_to"
        ),
        {"date_from": month.first_day, "date_to": today},
    )
    days_left = (month.last_day - today).days
    pace_rest = day_to_day * days_left / today.day
    expense = (
        totals.completed_total("expense") + totals.planned_total("expense") + pace_rest
    ).quantize(Decimal("0.01"), ROUND_HALF_UP)
    income = totals.completed_total("income") + totals.planned_total("income")
    budget = effective_budget(scope, month)
    return Forecast(
        expense=expense,
        income=income,
        balance=income - expense,
        budget=budget,
        over_budget=budget is not None and expense > budget,
    )


def _year_savings(scope: HouseholdScope, month: Month) -> YearSavings:
    date_from, date_to = date(month.year, 1, 1), month.last_day
    rows = scope.session.execute(
        text(
            "SELECT kind, coalesce(sum(amount), 0) AS amount,"
            " coalesce(sum(amount) FILTER (WHERE goal_id IS NOT NULL), 0) AS to_goals"
            " FROM transactions WHERE status = 'completed'"
            " AND occurred_on BETWEEN :date_from AND :date_to GROUP BY kind"
        ),
        {"date_from": date_from, "date_to": date_to},
    ).all()
    sums = {row.kind: row for row in rows}
    income = sums["income"].amount if "income" in sums else ZERO
    expense = sums["expense"].amount if "expense" in sums else ZERO
    to_goals = sums["expense"].to_goals if "expense" in sums else ZERO
    balance = income - expense
    return YearSavings(
        year=month.year,
        income=income,
        expense=expense,
        balance=balance,
        saved_to_goals=to_goals,
        total_saved=balance + to_goals,
    )


def month_insights(scope: HouseholdScope, month: Month, months_back: int = 1) -> MonthInsights:
    """One month against an earlier one (by default the one before), the forecast for the
    current month and the year's savings so far."""
    previous = month.shift(-months_back)
    current = ledger_totals(scope, month.first_day, month.last_day)
    before = ledger_totals(scope, previous.first_day, previous.last_day)
    spent, spent_before = current.completed["expense"], before.completed["expense"]
    refs = {**before.categories, **current.categories}
    changes = [
        CategoryChange(
            category=refs[category_id],
            actual=spent.get(category_id, ZERO),
            previous=spent_before.get(category_id, ZERO),
            difference=spent.get(category_id, ZERO) - spent_before.get(category_id, ZERO),
            change_percent=percent_change(
                spent.get(category_id, ZERO), spent_before.get(category_id, ZERO)
            ),
        )
        for category_id in set(spent) | set(spent_before)
    ]
    changes.sort(key=lambda c: (-c.difference, c.category.name))
    income, expense = current.completed_total("income"), current.completed_total("expense")
    previous_expense = before.completed_total("expense")
    return MonthInsights(
        month=str(month),
        previous_month=str(previous),
        income=income,
        expense=expense,
        balance=income - expense,
        previous_expense=previous_expense,
        expense_change_percent=percent_change(expense, previous_expense),
        categories=changes,
        forecast=_forecast(scope, month),
        year=_year_savings(scope, month),
    )
