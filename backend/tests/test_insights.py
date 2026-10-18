from datetime import date

import pytest

from app.main import app
from app.scope import get_today
from tests.partners import Partner, make_couple


@pytest.fixture
def couple():
    app.dependency_overrides[get_today] = lambda: date(2026, 10, 10)
    return make_couple()


def add(partner: Partner, category: str, amount: str, day: str, kind="expense", status="completed"):
    partner.ok(
        "post",
        "/api/transactions",
        {"kind": kind, "amount": amount, "occurred_on": day, "status": status,
         "category_id": partner.category_id(category)},
    )  # fmt: skip


def insights(partner: Partner, month="2026-10") -> dict:
    return partner.ok("get", "/api/reports/insights", params={"month": month})


def test_compare_with_previous_month_by_category(couple):
    owner, partner = couple
    add(owner, "מזון", "100", "2026-09-05")
    add(owner, "מזון", "150", "2026-10-05")
    add(partner, "דיור", "1000", "2026-09-01")
    add(partner, "דיור", "1000", "2026-10-01")
    add(owner, "מסעדות", "80", "2026-09-20")

    result = insights(partner)

    fields = ("actual", "previous", "difference", "change_percent")
    rows = [(c["category"]["name"], *(c[f] for f in fields)) for c in result["categories"]]
    assert rows == [
        ("מזון", "150.00", "100.00", "50.00", 50),
        ("דיור", "1000.00", "1000.00", "0.00", 0),
        ("מסעדות", "0.00", "80.00", "-80.00", -100),
    ]
    assert (result["expense"], result["previous_expense"]) == ("1150.00", "1180.00")
    assert result["expense_change_percent"] == -3
    assert result["previous_month"] == "2026-09"


def test_planned_money_is_not_compared(couple):
    owner, _ = couple
    add(owner, "מזון", "500", "2026-10-25", status="planned")
    assert insights(owner)["categories"] == []


def test_forecast_extends_day_to_day_spending_and_adds_planned(couple):
    owner, _ = couple
    add(owner, "מזון", "300", "2026-10-04")
    add(owner, "חשבונות", "500", "2026-10-25", status="planned")
    add(owner, "משכורת", "10000", "2026-10-01", kind="income")
    owner.put("/api/budgets", {"total": "2000", "categories": []}, params={"month": "2026-10"})

    forecast = insights(owner)["forecast"]

    # 300 so far + 500 planned + 300 / 10 days × 21 days left.
    assert forecast == {
        "expense": "1430.00",
        "income": "10000.00",
        "balance": "8570.00",
        "budget": "2000.00",
        "over_budget": False,
    }


def test_forecast_warns_over_budget_and_does_not_extend_goal_deposits(couple):
    owner, _ = couple
    add(owner, "מזון", "300", "2026-10-04")
    goal = owner.ok("post", "/api/goals", {"name": "חופשה", "target_amount": "5000"})
    owner.post(f"/api/goals/{goal['id']}/deposits", {"amount": "200", "occurred_on": "2026-10-05"})
    owner.put("/api/budgets", {"total": "1000", "categories": []}, params={"month": "2026-10"})

    forecast = insights(owner)["forecast"]

    assert forecast["expense"] == "1130.00"  # 300 + 200 + 630, the deposit not repeated
    assert forecast["over_budget"] is True


def test_no_forecast_for_other_months(couple):
    owner, _ = couple
    assert insights(owner, "2026-09")["forecast"] is None
    assert insights(owner, "2026-11")["forecast"] is None


def test_year_savings_up_to_the_month(couple):
    owner, _ = couple
    add(owner, "משכורת", "5000", "2026-01-10", kind="income")
    add(owner, "מזון", "2500", "2026-03-10")
    goal = owner.ok("post", "/api/goals", {"name": "חופשה", "target_amount": "5000"})
    owner.post(f"/api/goals/{goal['id']}/deposits", {"amount": "500", "occurred_on": "2026-06-01"})
    add(owner, "מזון", "999", "2025-12-31")  # last year
    add(owner, "מזון", "999", "2026-11-01", status="planned")  # after the month

    year = insights(owner)["year"]

    assert year == {
        "year": 2026,
        "income": "5000.00",
        "expense": "3000.00",
        "balance": "2000.00",
        "saved_to_goals": "500.00",
        "total_saved": "2500.00",
    }


def test_insights_are_per_household(couple):
    owner, _ = couple
    add(owner, "מזון", "100", "2026-10-05")
    stranger = Partner()
    stranger.create_household()
    assert insights(stranger)["expense"] == "0.00"


def test_invalid_month(couple):
    owner, _ = couple
    assert owner.get("/api/reports/insights", params={"month": "2026-13"}).status_code == 422
