from uuid import UUID

from pydantic import BaseModel, Field

from app.ledger import UsageStatus
from app.money import Amount, Money
from app.transactions.schemas import CategoryRef


class CategoryBudgetInput(BaseModel):
    category_id: UUID
    amount: Amount


class BudgetInput(BaseModel):
    """The whole budget of a month. Categories left out have no budget."""

    total: Amount | None = None
    categories: list[CategoryBudgetInput] = Field(default_factory=list, max_length=200)


class CategoryBudget(BaseModel):
    category: CategoryRef
    budget: Money | None
    # Completed expenses only; planned expenses are reported separately.
    actual: Money
    planned: Money
    remaining: Money | None
    percent: int | None
    status: UsageStatus | None


class BudgetMonth(BaseModel):
    month: str
    # The overall amount the couple set, if any.
    total_budget: Money | None
    # The overall budget used for the summary: total_budget, or the sum of category budgets.
    effective_budget: Money | None
    actual: Money
    planned: Money
    remaining: Money | None
    percent: int | None
    status: UsageStatus | None
    categories: list[CategoryBudget]
    previous_month_has_budget: bool
