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


class CategoryChange(BaseModel):
    category: CategoryRef
    actual: Money
    previous: Money
    # actual − previous; positive means more was spent this month.
    difference: Money
    change_percent: int | None


class Forecast(BaseModel):
    """Where the current month is heading, from what is recorded so far."""

    expense: Money
    income: Money
    balance: Money
    budget: Money | None
    over_budget: bool


class YearSavings(BaseModel):
    """The calendar year up to the end of the month: what was left over and set aside."""

    year: int
    income: Money
    expense: Money
    # Income minus expenses (deposits to goals are expenses, so they are not in here).
    balance: Money
    saved_to_goals: Money
    # balance + saved_to_goals: everything not spent on living.
    total_saved: Money


class MonthInsights(BaseModel):
    month: str
    # The month compared against: the one before, or the same month a year earlier.
    previous_month: str
    income: Money
    expense: Money
    balance: Money
    previous_expense: Money
    expense_change_percent: int | None
    # Categories with spending in either month, biggest increase first.
    categories: list[CategoryChange]
    # Only for the current month.
    forecast: Forecast | None
    year: YearSavings
