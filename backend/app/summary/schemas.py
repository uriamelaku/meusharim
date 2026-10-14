from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.categories.schemas import Kind
from app.ledger import UsageStatus
from app.money import Money
from app.transactions.schemas import CategoryRef, Transaction


class Flow(BaseModel):
    """Completed (actual) and planned amounts, always kept apart."""

    actual: Money
    planned: Money


class BudgetUsage(BaseModel):
    budget: Money
    actual: Money
    remaining: Money
    percent: int
    status: UsageStatus


class CategorySpending(BaseModel):
    category: CategoryRef
    actual: Money
    planned: Money


class UpcomingItem(BaseModel):
    """Planned money still to come: a planned transaction or a schedule occurrence."""

    source: Literal["transaction", "schedule"]
    transaction_id: UUID | None
    schedule_id: UUID | None
    schedule_type: Literal["recurring", "installments"] | None
    sequence_no: int | None
    installments_count: int | None
    kind: Kind
    occurred_on: date
    amount: Money
    category: CategoryRef
    description: str


class MonthSummary(BaseModel):
    month: str
    income: Flow
    expense: Flow
    # Completed income minus completed expenses.
    balance: Money
    # The balance if every planned item of the month happens as planned.
    projected_balance: Money
    budget: BudgetUsage | None
    expense_by_category: list[CategorySpending]
    recent: list[Transaction]
    upcoming: list[UpcomingItem]
