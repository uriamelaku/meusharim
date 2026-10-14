import calendar
import re
from dataclasses import dataclass
from datetime import date
from typing import Annotated

from fastapi import Query

from app.errors import InvalidError

MIN_YEAR, MAX_YEAR = 1900, 2100


@dataclass(frozen=True, order=True)
class Month:
    year: int
    month: int

    @property
    def first_day(self) -> date:
        return date(self.year, self.month, 1)

    @property
    def last_day(self) -> date:
        return date(self.year, self.month, calendar.monthrange(self.year, self.month)[1])

    def shift(self, months: int) -> "Month":
        index = self.year * 12 + self.month - 1 + months
        return Month(index // 12, index % 12 + 1)

    def __str__(self) -> str:
        return f"{self.year:04d}-{self.month:02d}"

    @classmethod
    def of(cls, day: date) -> "Month":
        return cls(day.year, day.month)


def parse_month(value: str) -> Month:
    """Parses "2026-10". Raises InvalidError for anything else."""
    match = re.fullmatch(r"(\d{4})-(\d{2})", value)
    if not match:
        raise InvalidError("invalid_month")
    month = Month(int(match[1]), int(match[2]))
    if not (1 <= month.month <= 12 and MIN_YEAR <= month.year <= MAX_YEAR):
        raise InvalidError("invalid_month")
    return month


MonthParam = Annotated[str, Query(pattern=r"^\d{4}-\d{2}$", examples=["2026-10"])]
