from collections import defaultdict
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import text

from app.errors import InvalidError
from app.ledger import ZERO, ledger_totals
from app.periods import Month
from app.reports.schemas import CategoryRow, MonthRow, Report, YearRow
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
