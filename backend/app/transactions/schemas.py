from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints

from app.categories.schemas import Kind
from app.money import Amount, LedgerDate

Status = Literal["planned", "completed"]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]
SortOrder = Literal["date_desc", "date_asc", "amount_desc", "amount_asc"]


class TransactionCreate(BaseModel):
    kind: Kind
    amount: Amount
    occurred_on: LedgerDate
    category_id: UUID
    description: Description = ""
    status: Status
    party_user_id: UUID | None = None


class TransactionUpdate(BaseModel):
    """Partial update. Sending `party_user_id: null` sets the joint account."""

    kind: Kind | None = None
    amount: Amount | None = None
    occurred_on: LedgerDate | None = None
    category_id: UUID | None = None
    description: Description | None = None
    status: Status | None = None
    party_user_id: UUID | None = None


class CategoryRef(BaseModel):
    id: UUID
    name: str
    color: str
    icon: str
    archived: bool


class ScheduleRef(BaseModel):
    id: UUID
    type: Literal["recurring", "installments"]
    sequence_no: int
    installments_count: int | None


class Transaction(BaseModel):
    id: UUID
    kind: Kind
    amount: Decimal
    occurred_on: date
    category: CategoryRef
    description: str
    status: Status
    party_user_id: UUID | None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    schedule: ScheduleRef | None = None


class TransactionPage(BaseModel):
    items: list[Transaction]
    total: int


class ConfirmRequest(BaseModel):
    ids: list[UUID] = Field(min_length=1, max_length=200)


class ConfirmResult(BaseModel):
    confirmed: int
