"""Date and amount rules for schedule occurrences. Pure functions, no database."""

import calendar
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Literal

Frequency = Literal["weekly", "monthly", "yearly"]

AGORA = Decimal("0.01")


def _add_months(start: date, months: int) -> date:
    """Same day of month, clamped to the month's last day (Jan 31 + 1 month = Feb 28/29)."""
    month_index = start.month - 1 + months
    year, month = start.year + month_index // 12, month_index % 12 + 1
    return date(year, month, min(start.day, calendar.monthrange(year, month)[1]))


def occurrence_date(start: date, frequency: Frequency, sequence_no: int) -> date:
    """The date of occurrence `sequence_no` (1 = the start date).

    Always computed from the start date, never from the previous occurrence, so a
    schedule on the 31st returns to the 31st after a short month.
    """
    steps = sequence_no - 1
    if frequency == "weekly":
        return start + timedelta(weeks=steps)
    if frequency == "monthly":
        return _add_months(start, steps)
    return _add_months(start, 12 * steps)


def installment_amount(total: Decimal, count: int, sequence_no: int) -> Decimal:
    """Splits `total` into `count` payments in whole agorot.

    Every payment gets the same base amount; the leftover agorot go to the first
    payment, so the payments always add up exactly to the total.
    """
    total_agorot = int(total / AGORA)
    base, remainder = divmod(total_agorot, count)
    agorot = base + remainder if sequence_no == 1 else base
    return Decimal(agorot) * AGORA


@dataclass(frozen=True)
class ScheduleRule:
    type: Literal["recurring", "installments"]
    frequency: Frequency
    start_date: date
    end_date: date | None
    amount: Decimal | None
    total_amount: Decimal | None
    installments_count: int | None

    def has_occurrence(self, sequence_no: int) -> bool:
        if self.type == "installments":
            assert self.installments_count is not None
            return sequence_no <= self.installments_count
        return self.end_date is None or self.date_of(sequence_no) <= self.end_date

    def date_of(self, sequence_no: int) -> date:
        return occurrence_date(self.start_date, self.frequency, sequence_no)

    def amount_of(self, sequence_no: int) -> Decimal:
        if self.type == "installments":
            assert self.total_amount is not None and self.installments_count is not None
            return installment_amount(self.total_amount, self.installments_count, sequence_no)
        assert self.amount is not None
        return self.amount

    def occurrences(self, first_sequence: int, until: date) -> Iterator[tuple[int, date]]:
        """(sequence_no, date) from `first_sequence` up to and including `until`."""
        sequence_no = first_sequence
        while self.has_occurrence(sequence_no) and (day := self.date_of(sequence_no)) <= until:
            yield sequence_no, day
            sequence_no += 1

    def first_sequence_on_or_after(self, first_sequence: int, day: date) -> int:
        """The first occurrence from `first_sequence` whose date is not before `day`."""
        sequence_no = first_sequence
        while self.has_occurrence(sequence_no) and self.date_of(sequence_no) < day:
            sequence_no += 1
        return sequence_no
