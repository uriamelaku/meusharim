from datetime import date

import pytest

from app.main import app
from app.scope import get_today
from tests.partners import Partner, make_couple


@pytest.fixture
def couple():
    app.dependency_overrides[get_today] = lambda: date(2026, 10, 14)
    return make_couple()


def add(partner, category, amount, day, kind="expense", status="completed"):
    partner.ok(
        "post",
        "/api/transactions",
        {"kind": kind, "amount": amount, "occurred_on": day, "status": status,
         "category_id": partner.category_id(category)},
    )  # fmt: skip


def report(partner, date_from, date_to):
    return partner.ok("get", "/api/reports", params={"from": date_from, "to": date_to})


@pytest.fixture
def history(couple):
    owner, partner = couple
    add(owner, "משכורת", "10000", "2025-08-01", kind="income")
    add(owner, "מזון", "2000", "2025-08-05")
    add(owner, "משכורת", "10000", "2026-08-01", kind="income")
    add(owner, "מזון", "1000", "2026-08-05")
    add(partner, "מסעדות", "500", "2026-08-20")
    add(owner, "מזון", "1500", "2026-09-05")
    add(owner, "משכורת", "11000", "2026-09-01", kind="income")
    add(owner, "דיור", "4000", "2026-10-01", status="planned")
    owner.ok(
        "post",
        "/api/schedules",
        {"type": "installments", "category_id": owner.category_id("קניות"),
         "start_date": "2026-11-15", "total_amount": "1000", "installments_count": 4},
    )  # fmt: skip
    return owner, partner


def test_monthly_series_separates_actual_and_planned(history):
    owner, _ = history
    months = {m["month"]: m for m in report(owner, "2026-08", "2026-12")["months"]}

    assert list(months) == ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]
    assert (months["2026-08"]["income"], months["2026-08"]["expense"]) == ("10000.00", "1500.00")
    assert months["2026-08"]["balance"] == "8500.00"
    assert months["2026-09"]["expense_change_percent"] == 0
    assert (months["2026-10"]["expense"], months["2026-10"]["expense_planned"]) == (
        "0.00",
        "4000.00",
    )
    assert months["2026-11"]["expense_planned"] == "250.00"
    assert months["2026-12"]["expense_planned"] == "250.00"


def test_change_against_previous_month_outside_range(history):
    owner, _ = history
    months = report(owner, "2026-09", "2026-09")["months"]
    # September 1500 vs August 1500 (August is before the range).
    assert months[0]["expense_change_percent"] == 0
    first = report(owner, "2026-08", "2026-08")["months"][0]
    assert first["expense_change_percent"] is None  # nothing in July


def test_totals_and_average(history):
    owner, _ = history
    result = report(owner, "2026-08", "2026-10")
    assert (result["income"], result["expense"], result["balance"]) == (
        "21000.00",
        "3000.00",
        "18000.00",
    )
    assert result["expense_planned"] == "4000.00"
    assert result["average_monthly_expense"] == "1000.00"


def test_categories_ranked_with_share(history):
    owner, _ = history
    rows = report(owner, "2026-08", "2026-10")["categories"]
    assert [(r["category"]["name"], r["actual"], r["share_percent"]) for r in rows] == [
        ("מזון", "2500.00", 83),
        ("מסעדות", "500.00", 17),
        ("דיור", "0.00", 0),
    ]
    assert rows[2]["planned"] == "4000.00"


def test_yearly_summary_compares_with_previous_year(history):
    owner, _ = history
    years = report(owner, "2026-01", "2026-12")["years"]
    assert years == [
        {
            "year": 2026,
            "income": "21000.00",
            "expense": "3000.00",
            "balance": "18000.00",
            "previous_income": "10000.00",
            "previous_expense": "2000.00",
            "income_change_percent": 110,
            "expense_change_percent": 50,
        }
    ]


def test_range_across_years(history):
    owner, _ = history
    result = report(owner, "2025-11", "2026-02")
    assert [m["month"] for m in result["months"]] == ["2025-11", "2025-12", "2026-01", "2026-02"]
    assert [y["year"] for y in result["years"]] == [2025, 2026]


@pytest.mark.parametrize(
    "params,status",
    [
        ({"from": "2026-10", "to": "2026-01"}, 422),
        ({"from": "2020-01", "to": "2025-02"}, 422),  # 62 months
        ({"from": "2026-13", "to": "2026-12"}, 422),
        ({"from": "2026-1", "to": "2026-12"}, 422),
        ({"from": "2026-01"}, 422),
    ],
)
def test_invalid_ranges(couple, params, status):
    owner, _ = couple
    assert owner.get("/api/reports", params=params).status_code == status


def test_reports_are_isolated(history):
    stranger = Partner()
    stranger.create_household()
    result = report(stranger, "2025-01", "2026-12")
    assert result["income"] == "0.00" and result["categories"] == []
    assert all(y["income"] == "0.00" for y in result["years"])
