from datetime import date

import pytest

from app.main import app
from app.scope import get_today
from tests.partners import Partner, make_couple

OCTOBER = {"month": "2026-10"}


@pytest.fixture
def couple():
    app.dependency_overrides[get_today] = lambda: date(2026, 10, 14)
    return make_couple()


def add(partner: Partner, category: str, amount: str, day: str, kind="expense", status="completed"):
    return partner.ok(
        "post",
        "/api/transactions",
        {"kind": kind, "amount": amount, "occurred_on": day, "status": status,
         "category_id": partner.category_id(category), "description": category},
    )  # fmt: skip


@pytest.fixture
def october(couple):
    owner, partner = couple
    add(owner, "משכורת", "12000", "2026-10-01", kind="income")
    add(partner, "משכורת", "9000.50", "2026-10-02", kind="income")
    add(owner, "מזון", "350.40", "2026-10-03")
    add(partner, "מזון", "149.60", "2026-10-09")
    add(owner, "מסעדות", "120", "2026-10-12")
    add(owner, "דיור", "5200", "2026-10-10", status="planned")  # due, not confirmed
    add(owner, "חשבונות", "400", "2026-10-20", status="planned")
    add(owner, "החזרים", "75", "2026-10-25", kind="income", status="planned")
    add(owner, "מזון", "999", "2026-09-30")  # another month
    owner.ok(
        "post",
        "/api/schedules",
        {"type": "installments", "category_id": owner.category_id("קניות"),
         "description": "ספה", "start_date": "2026-10-28", "total_amount": "3000",
         "installments_count": 10},
    )  # fmt: skip
    return owner, partner


def test_actual_and_planned_totals_are_separate(october):
    owner, _ = october
    summary = owner.ok("get", "/api/summary", params=OCTOBER)

    assert summary["income"] == {"actual": "21000.50", "planned": "75.00"}
    assert summary["expense"] == {"actual": "620.00", "planned": "5900.00"}
    assert summary["balance"] == "20380.50"
    assert summary["projected_balance"] == "14555.50"


def test_both_partners_see_the_same_summary(october):
    owner, partner = october
    assert owner.ok("get", "/api/summary", params=OCTOBER) == partner.ok(
        "get", "/api/summary", params=OCTOBER
    )


def test_confirming_moves_money_from_planned_to_actual(october):
    owner, _ = october
    rent = owner.ok("get", "/api/transactions", params={"status": "planned", "q": "דיור"})
    owner.ok("post", "/api/transactions/confirm", {"ids": [rent["items"][0]["id"]]})

    summary = owner.ok("get", "/api/summary", params=OCTOBER)
    assert summary["expense"] == {"actual": "5820.00", "planned": "700.00"}


def test_expense_by_category(october):
    owner, _ = october
    rows = owner.ok("get", "/api/summary", params=OCTOBER)["expense_by_category"]
    assert [(r["category"]["name"], r["actual"], r["planned"]) for r in rows] == [
        ("מזון", "500.00", "0.00"),
        ("מסעדות", "120.00", "0.00"),
        ("דיור", "0.00", "5200.00"),
        ("חשבונות", "0.00", "400.00"),
        ("קניות", "0.00", "300.00"),
    ]


def test_budget_usage(october):
    owner, _ = october
    assert owner.ok("get", "/api/summary", params=OCTOBER)["budget"] is None
    owner.put("/api/budgets", {"total": "700"}, params=OCTOBER)

    budget = owner.ok("get", "/api/summary", params=OCTOBER)["budget"]
    assert budget == {
        "budget": "700.00",
        "actual": "620.00",
        "remaining": "80.00",
        "percent": 89,
        "status": "near",
    }


def test_recent_transactions_of_the_month(october):
    owner, _ = october
    recent = owner.ok("get", "/api/summary", params=OCTOBER)["recent"]
    assert [t["occurred_on"] for t in recent] == [
        "2026-10-25",
        "2026-10-20",
        "2026-10-12",
        "2026-10-10",
        "2026-10-09",
    ]


def test_upcoming_lists_planned_items_after_today(october):
    owner, _ = october
    add(owner, "חשבונות", "60", "2026-10-14", status="planned")  # due today: pending, not upcoming
    upcoming = owner.ok("get", "/api/summary", params=OCTOBER)["upcoming"]
    assert [(u["occurred_on"], u["source"], u["amount"]) for u in upcoming] == [
        ("2026-10-20", "transaction", "400.00"),
        ("2026-10-25", "transaction", "75.00"),
        ("2026-10-28", "schedule", "300.00"),
    ]
    assert upcoming[2]["sequence_no"] == 1 and upcoming[2]["installments_count"] == 10


def test_past_month_has_no_upcoming_and_future_month_has_occurrences(october):
    owner, _ = october
    assert owner.ok("get", "/api/summary", params={"month": "2026-09"})["upcoming"] == []
    november = owner.ok("get", "/api/summary", params={"month": "2026-11"})
    assert november["expense"] == {"actual": "0.00", "planned": "300.00"}
    assert [u["occurred_on"] for u in november["upcoming"]] == ["2026-11-28"]


def test_empty_month(couple):
    owner, _ = couple
    summary = owner.ok("get", "/api/summary", params={"month": "1990-01"})
    assert summary["balance"] == "0.00" and summary["recent"] == []
    assert summary["expense_by_category"] == []


def test_summary_is_isolated(october):
    stranger = Partner()
    stranger.create_household()
    summary = stranger.ok("get", "/api/summary", params=OCTOBER)
    assert summary["income"] == {"actual": "0.00", "planned": "0.00"}
    assert summary["recent"] == [] and summary["upcoming"] == []


def test_summary_requires_valid_month(couple):
    owner, _ = couple
    assert owner.get("/api/summary", params={"month": "2026-00"}).status_code == 422
    assert owner.get("/api/summary").status_code == 422
