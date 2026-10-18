from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.categories.schemas import Kind
from app.money import Amount, LedgerDate, Money
from app.transactions.schemas import Description

# Where the rows came from. Per-source file parsers are added later; they all produce
# these normalized rows.
Source = Literal["cal", "max", "isracard", "bank", "other"]
MAX_ROWS = 500


class ImportRow(BaseModel):
    occurred_on: LedgerDate
    amount: Amount
    kind: Kind
    description: Description = ""


class PreviewRequest(BaseModel):
    source: Source
    rows: list[ImportRow] = Field(min_length=1, max_length=MAX_ROWS)


class PreviewRow(BaseModel):
    occurred_on: date
    amount: Money
    kind: Kind
    description: str
    # From the latest transaction with the same description and kind, if any.
    suggested_category_id: UUID | None
    # A transaction with the same date, amount and kind already exists.
    possible_duplicate: bool


class CommitRow(ImportRow):
    category_id: UUID


class CommitRequest(BaseModel):
    source: Source
    rows: list[CommitRow] = Field(min_length=1, max_length=MAX_ROWS)
    # Rows that look like duplicates are skipped unless this is set.
    include_duplicates: bool = False


class CommitResult(BaseModel):
    created: int
    skipped_duplicates: int
