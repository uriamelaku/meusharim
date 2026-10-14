from pydantic import BaseModel

from app.money import Money
from app.transactions.schemas import CategoryRef


class MonthRow(BaseModel):
    month: str
    income: Money
    expense: Money
    balance: Money
    # Planned money of the month (planned transactions and future schedule occurrences).
    income_planned: Money
    expense_planned: Money
    # Change of actual expenses against the previous month, in percent (None without a base).
    expense_change_percent: int | None


class CategoryRow(BaseModel):
    category: CategoryRef
    actual: Money
    planned: Money
    # Share of all actual expenses in the range, in percent.
    share_percent: int


class YearRow(BaseModel):
    """Actual totals of a whole calendar year, with the year before for comparison."""

    year: int
    income: Money
    expense: Money
    balance: Money
    previous_income: Money
    previous_expense: Money
    income_change_percent: int | None
    expense_change_percent: int | None


class Report(BaseModel):
    date_from: str
    date_to: str
    income: Money
    expense: Money
    balance: Money
    income_planned: Money
    expense_planned: Money
    average_monthly_expense: Money
    months: list[MonthRow]
    categories: list[CategoryRow]
    years: list[YearRow]
