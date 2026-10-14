from datetime import date
from decimal import Decimal

import pytest

from app.schedules.engine import ScheduleRule, installment_amount, occurrence_date


@pytest.mark.parametrize(
    "start,frequency,sequence_no,expected",
    [
        (date(2026, 1, 31), "monthly", 1, date(2026, 1, 31)),
        (date(2026, 1, 31), "monthly", 2, date(2026, 2, 28)),
        (date(2026, 1, 31), "monthly", 3, date(2026, 3, 31)),  # back to the 31st
        (date(2026, 1, 31), "monthly", 4, date(2026, 4, 30)),
        (date(2028, 1, 30), "monthly", 2, date(2028, 2, 29)),  # leap year
        (date(2026, 11, 15), "monthly", 3, date(2027, 1, 15)),  # across a year
        (date(2026, 12, 31), "monthly", 2, date(2027, 1, 31)),
        (date(2028, 2, 29), "yearly", 2, date(2029, 2, 28)),
        (date(2028, 2, 29), "yearly", 5, date(2032, 2, 29)),
        (date(2026, 12, 28), "weekly", 2, date(2027, 1, 4)),
        (date(2026, 10, 14), "weekly", 53, date(2027, 10, 13)),
    ],
)
def test_occurrence_dates(start, frequency, sequence_no, expected):
    assert occurrence_date(start, frequency, sequence_no) == expected


@pytest.mark.parametrize(
    "total,count,first,rest",
    [
        ("100.00", 3, "33.34", "33.33"),
        ("1000.00", 12, "83.37", "83.33"),
        ("0.05", 3, "0.03", "0.01"),
        ("99.99", 2, "50.00", "49.99"),
        ("1200.00", 12, "100.00", "100.00"),
        ("0.02", 2, "0.01", "0.01"),
    ],
)
def test_installments_split_into_exact_agorot(total, count, first, rest):
    payments = [installment_amount(Decimal(total), count, n) for n in range(1, count + 1)]
    assert payments[0] == Decimal(first)
    assert all(payment == Decimal(rest) for payment in payments[1:])
    assert sum(payments) == Decimal(total)


@pytest.mark.parametrize("count", [2, 3, 7, 12, 36, 360])
def test_installments_always_sum_to_total(count):
    total = Decimal("12345.67")
    assert sum(installment_amount(total, count, n) for n in range(1, count + 1)) == total


def recurring(start, frequency="monthly", end=None, amount="10"):
    return ScheduleRule("recurring", frequency, start, end, Decimal(amount), None, None)


def test_recurring_occurrences_stop_at_end_date():
    rule = recurring(date(2026, 1, 15), end=date(2026, 4, 15))
    assert [d for _, d in rule.occurrences(1, date(2030, 1, 1))] == [
        date(2026, 1, 15),
        date(2026, 2, 15),
        date(2026, 3, 15),
        date(2026, 4, 15),
    ]


def test_occurrences_until_date_and_from_sequence():
    rule = recurring(date(2026, 1, 1))
    assert list(rule.occurrences(3, date(2026, 4, 30))) == [
        (3, date(2026, 3, 1)),
        (4, date(2026, 4, 1)),
    ]
    assert list(rule.occurrences(1, date(2025, 12, 31))) == []


def test_installment_occurrences_stop_after_count():
    rule = ScheduleRule("installments", "monthly", date(2026, 1, 10), None, None, Decimal("300"), 3)
    assert [n for n, _ in rule.occurrences(1, date(2040, 1, 1))] == [1, 2, 3]
    assert rule.amount_of(1) == Decimal("100.00")


def test_first_sequence_on_or_after_skips_past_dates():
    rule = recurring(date(2026, 1, 5))
    assert rule.first_sequence_on_or_after(1, date(2026, 3, 5)) == 3
    assert rule.first_sequence_on_or_after(1, date(2026, 3, 6)) == 4
    assert rule.first_sequence_on_or_after(5, date(2026, 1, 1)) == 5
