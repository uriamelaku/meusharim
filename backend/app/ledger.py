"""Sums over the ledger, shared by the budget, the dashboard and the reports.

Actual money is completed transactions only. Planned money is planned transactions
plus schedule occurrences that are not recorded yet; the two are never added up.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal
from uuid import UUID

from sqlalchemy import text

from app.schedules.service import future_occurrences
from app.scope import HouseholdScope
from app.transactions.schemas import CategoryRef

ZERO = Decimal("0.00")
NEAR_LIMIT_PERCENT = 80

UsageStatus = Literal["ok", "near", "over"]


@dataclass
class Totals:
    """Per kind, per category: completed and planned sums for one date range."""

    completed: dict[str, dict[UUID, Decimal]] = field(
        default_factory=lambda: {"income": defaultdict(Decimal), "expense": defaultdict(Decimal)}
    )
    planned: dict[str, dict[UUID, Decimal]] = field(
        default_factory=lambda: {"income": defaultdict(Decimal), "expense": defaultdict(Decimal)}
    )
    categories: dict[UUID, CategoryRef] = field(default_factory=dict)

    def completed_total(self, kind: str) -> Decimal:
        return sum(self.completed[kind].values(), ZERO)

    def planned_total(self, kind: str) -> Decimal:
        return sum(self.planned[kind].values(), ZERO)


def ledger_totals(scope: HouseholdScope, date_from: date, date_to: date) -> Totals:
    totals = Totals()
    rows = scope.session.execute(
        text(
            "SELECT t.kind, t.status, t.category_id, sum(t.amount) AS amount,"
            " c.name, c.color, c.icon, c.archived_at IS NOT NULL AS archived"
            " FROM transactions t JOIN categories c ON c.id = t.category_id"
            " WHERE t.occurred_on BETWEEN :date_from AND :date_to"
            " GROUP BY t.kind, t.status, t.category_id, c.id"
        ),
        {"date_from": date_from, "date_to": date_to},
    ).all()
    for row in rows:
        target = totals.completed if row.status == "completed" else totals.planned
        target[row.kind][row.category_id] += row.amount
        totals.categories[row.category_id] = CategoryRef(
            id=row.category_id, name=row.name, color=row.color, icon=row.icon, archived=row.archived
        )
    for occurrence in future_occurrences(scope, date_from, date_to):
        totals.planned[occurrence.kind][occurrence.category.id] += occurrence.amount
        totals.categories[occurrence.category.id] = occurrence.category
    return totals


def usage(actual: Decimal, budget: Decimal | None) -> tuple[int | None, UsageStatus | None]:
    """Percent of the budget used (rounded) and whether it is near or over the limit."""
    if budget is None:
        return None, None
    percent = int((actual * 100 / budget).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    if actual > budget:
        return percent, "over"
    return percent, "near" if percent >= NEAR_LIMIT_PERCENT else "ok"
