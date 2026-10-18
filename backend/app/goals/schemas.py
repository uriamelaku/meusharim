from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, StringConstraints

from app.money import Amount, LedgerDate, Money

GoalName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class GoalCreate(BaseModel):
    name: GoalName
    target_amount: Amount
    target_date: LedgerDate | None = None


class GoalUpdate(BaseModel):
    """Partial update. Sending `target_date: null` removes the date."""

    name: GoalName | None = None
    target_amount: Amount | None = None
    target_date: LedgerDate | None = None


class Goal(BaseModel):
    id: UUID
    name: str
    target_amount: Money
    target_date: date | None
    # Completed deposits only.
    saved: Money
    remaining: Money
    percent: int
    # To reach the target by its date: the amount per month from this month on.
    monthly_needed: Money | None
    # Behind a straight line from the goal's creation to its date.
    behind: bool
    reached: bool


class DepositCreate(BaseModel):
    amount: Amount
    occurred_on: LedgerDate | None = None
    party_user_id: UUID | None = None
    request_id: UUID | None = None


class GoalDeleted(BaseModel):
    result: Literal["deleted", "archived"]
