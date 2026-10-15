from datetime import date
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.categories.schemas import Kind
from app.money import Amount, LedgerDate, Money
from app.schedules.engine import Frequency
from app.transactions.schemas import CategoryRef, Description

ScheduleType = Literal["recurring", "installments"]
ScheduleStatus = Literal["active", "paused", "cancelled"]
InstallmentsCount = Annotated[int, Field(ge=2, le=360)]


class RecurringCreate(BaseModel):
    type: Literal["recurring"]
    kind: Kind
    category_id: UUID
    description: Description = ""
    party_user_id: UUID | None = None
    frequency: Frequency
    start_date: LedgerDate
    end_date: LedgerDate | None = None
    amount: Amount
    auto_confirm: bool = False
    # New per create attempt; a repeat with the same id returns the schedule it created.
    request_id: UUID | None = None

    @model_validator(mode="after")
    def end_after_start(self) -> "RecurringCreate":
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date must not be before start_date")
        return self


class InstallmentsCreate(BaseModel):
    type: Literal["installments"]
    kind: Kind = "expense"
    category_id: UUID
    description: Description = ""
    party_user_id: UUID | None = None
    start_date: LedgerDate
    total_amount: Amount
    installments_count: InstallmentsCount
    # Card installments are charged for sure, so they complete on their date by default.
    auto_confirm: bool = True
    request_id: UUID | None = None

    @model_validator(mode="after")
    def at_least_an_agora_per_payment(self) -> "InstallmentsCreate":
        if self.total_amount * 100 < self.installments_count:
            raise ValueError("total_amount is too small for the number of installments")
        return self


ScheduleCreate = Annotated[RecurringCreate | InstallmentsCreate, Field(discriminator="type")]


class ScheduleUpdate(BaseModel):
    """Changes apply to occurrences that were not written yet; past ones stay as they are.

    `end_date: null` removes the end date.
    """

    category_id: UUID | None = None
    description: Description | None = None
    party_user_id: UUID | None = None
    auto_confirm: bool | None = None
    frequency: Frequency | None = None
    start_date: LedgerDate | None = None
    end_date: LedgerDate | None = None
    amount: Amount | None = None
    total_amount: Amount | None = None
    installments_count: InstallmentsCount | None = None


class Occurrence(BaseModel):
    """A future occurrence, computed from the schedule and not stored anywhere."""

    schedule_id: UUID
    type: ScheduleType
    kind: Kind
    sequence_no: int
    installments_count: int | None
    occurred_on: date
    amount: Decimal
    category: CategoryRef
    description: str
    party_user_id: UUID | None


class Schedule(BaseModel):
    id: UUID
    type: ScheduleType
    kind: Kind
    category: CategoryRef
    description: str
    party_user_id: UUID | None
    frequency: Frequency
    start_date: date
    end_date: date | None
    amount: Decimal | None
    total_amount: Decimal | None
    installments_count: int | None
    status: ScheduleStatus
    auto_confirm: bool
    created_by: UUID
    # Occurrences already written to transactions, and how many of them are completed.
    recorded_count: int
    completed_count: int
    completed_amount: Money
    # Total minus completed payments (installments only).
    remaining_amount: Money | None
    next_occurrence: Occurrence | None
    # True when no more occurrences will ever be created (end date or last payment reached).
    finished: bool


class ScheduleDetail(Schedule):
    upcoming: list[Occurrence]
