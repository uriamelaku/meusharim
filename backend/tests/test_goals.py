from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from app.goals.service import goal_progress
from app.main import app
from app.scope import get_today
from tests.partners import Partner, make_couple

TODAY = date(2026, 10, 18)


@pytest.fixture
def couple():
    app.dependency_overrides[get_today] = lambda: TODAY
    return make_couple()


def create_goal(partner: Partner, name="חופשה", target="5000", target_date="2027-07-31"):
    return partner.ok(
        "post", "/api/goals", {"name": name, "target_amount": target, "target_date": target_date}
    )


def deposit(partner: Partner, goal_id: str, amount: str, **extra):
    return partner.post(f"/api/goals/{goal_id}/deposits", {"amount": amount, **extra})


def savings_categories(partner: Partner) -> list[dict]:
    return [c for c in partner.ok("get", "/api/categories") if c["name"] == "חיסכון"]


def test_goal_starts_empty_with_monthly_amount_to_target(couple):
    owner, partner = couple
    goal = create_goal(owner)

    assert (goal["saved"], goal["remaining"], goal["percent"]) == ("0.00", "5000.00", 0)
    # October 2026 to July 2027 inclusive: 10 months.
    assert goal["monthly_needed"] == "500.00"
    assert goal["reached"] is False
    assert partner.ok("get", "/api/goals")[0]["id"] == goal["id"]


def test_first_goal_creates_one_savings_category(couple):
    owner, partner = couple
    create_goal(owner)
    create_goal(partner, name="רכב חדש")
    [category] = savings_categories(owner)
    assert category["kind"] == "expense" and category["icon"] == "piggy-bank"


def test_savings_category_follows_household_language():
    owner = Partner()
    owner.create_household(name="Our home", language="en")
    create_goal(owner)
    names = [c["name"] for c in owner.ok("get", "/api/categories") if c["icon"] == "piggy-bank"]
    assert names == ["Savings"]


def test_deposits_are_completed_expenses_and_fill_the_goal(couple):
    owner, partner = couple
    goal = create_goal(owner, target="1000", target_date=None)

    created = deposit(partner, goal["id"], "250.50")

    assert created.status_code == 201
    tx = created.json()
    assert (tx["kind"], tx["status"], tx["category"]["name"]) == ("expense", "completed", "חיסכון")
    assert tx["occurred_on"] == "2026-10-18" and tx["description"] == "חופשה"
    goal = owner.ok("get", "/api/goals")[0]
    assert (goal["saved"], goal["remaining"], goal["percent"]) == ("250.50", "749.50", 25)
    assert goal["monthly_needed"] is None  # no date, no monthly amount
    summary = owner.ok("get", "/api/summary", params={"month": "2026-10"})
    assert summary["expense"]["actual"] == "250.50"


def test_reached_goal(couple):
    owner, _ = couple
    goal = create_goal(owner, target="100")
    deposit(owner, goal["id"], "120")
    goal = owner.ok("get", "/api/goals")[0]
    assert goal["reached"] is True and goal["remaining"] == "0.00" and goal["percent"] == 120
    assert goal["monthly_needed"] is None and goal["behind"] is False


def test_planned_deposit_edits_do_not_count_until_completed(couple):
    owner, _ = couple
    goal = create_goal(owner, target="1000")
    tx = deposit(owner, goal["id"], "300").json()
    owner.ok("patch", f"/api/transactions/{tx['id']}", {"status": "planned"})
    assert owner.ok("get", "/api/goals")[0]["saved"] == "0.00"


def test_repeated_deposit_request_is_recorded_once(couple):
    owner, _ = couple
    goal = create_goal(owner)
    request_id = str(uuid4())
    first = deposit(owner, goal["id"], "100", request_id=request_id).json()
    second = deposit(owner, goal["id"], "100", request_id=request_id).json()
    assert first["id"] == second["id"]
    assert owner.ok("get", "/api/goals")[0]["saved"] == "100.00"


def test_goal_names_are_unique_per_household(couple):
    owner, partner = couple
    create_goal(owner)
    assert partner.post("/api/goals", {"name": " חופשה ", "target_amount": "10"}).status_code == 409


@pytest.mark.parametrize(
    "body",
    [
        {"name": "", "target_amount": "10"},
        {"name": "x", "target_amount": "0"},
        {"name": "x", "target_amount": "10.001"},
        {"name": "x" * 41, "target_amount": "10"},
    ],
)
def test_goal_input_is_validated(couple, body):
    owner, _ = couple
    assert owner.post("/api/goals", body).status_code == 422


def test_update_can_clear_the_date(couple):
    owner, _ = couple
    goal = create_goal(owner)
    updated = owner.ok("patch", f"/api/goals/{goal['id']}", {"target_date": None, "name": "טיול"})
    assert updated["target_date"] is None and updated["name"] == "טיול"
    assert updated["target_amount"] == "5000.00"


def test_delete_goal_without_deposits_removes_it(couple):
    owner, _ = couple
    goal = create_goal(owner)
    assert owner.ok("delete", f"/api/goals/{goal['id']}") == {"result": "deleted"}
    assert owner.ok("get", "/api/goals") == []


def test_delete_goal_with_deposits_keeps_the_money_history(couple):
    owner, _ = couple
    goal = create_goal(owner)
    tx = deposit(owner, goal["id"], "80").json()
    assert owner.ok("delete", f"/api/goals/{goal['id']}") == {"result": "archived"}
    assert owner.ok("get", "/api/goals") == []
    assert owner.ok("get", f"/api/transactions/{tx['id']}")["amount"] == "80.00"
    # The name is free again for a new goal.
    create_goal(owner)


def test_deposit_after_savings_category_was_deleted(couple):
    owner, _ = couple
    goal = create_goal(owner)
    deposit(owner, goal["id"], "10")
    [category] = savings_categories(owner)
    owner.ok("delete", f"/api/categories/{category['id']}")  # archived: it has a deposit

    tx = deposit(owner, goal["id"], "20").json()

    assert tx["category"]["id"] != category["id"] and tx["category"]["archived"] is False
    assert owner.ok("get", "/api/goals")[0]["saved"] == "30.00"


def test_other_household_cannot_see_or_use_goals(couple):
    owner, _ = couple
    goal = create_goal(owner)
    stranger = Partner()
    stranger.create_household()
    assert stranger.ok("get", "/api/goals") == []
    assert deposit(stranger, goal["id"], "10").status_code == 404
    assert stranger.patch(f"/api/goals/{goal['id']}", {"name": "x"}).status_code == 404
    assert stranger.delete(f"/api/goals/{goal['id']}").status_code == 404
    assert owner.ok("get", "/api/goals")[0]["saved"] == "0.00"


def test_deposit_party_must_be_a_member(couple):
    owner, _ = couple
    goal = create_goal(owner)
    response = deposit(owner, goal["id"], "10", party_user_id=str(uuid4()))
    assert response.status_code == 422


@pytest.mark.parametrize(
    ("saved", "target_date", "monthly", "behind"),
    [
        # Created 2026-01-01, due 2026-12-31, checked 2026-10-18: ~79% of the time passed.
        ("8000", date(2026, 12, 31), Decimal("666.67"), False),
        ("5000", date(2026, 12, 31), Decimal("1666.67"), True),
        # Overdue: everything that is left, now.
        ("4000", date(2026, 9, 30), Decimal("6000.00"), True),
        ("0", None, None, False),
    ],
)
def test_goal_progress(saved, target_date, monthly, behind):
    remaining, percent, needed, is_behind = goal_progress(
        Decimal("10000"), Decimal(saved), target_date, date(2026, 1, 1), TODAY
    )
    assert remaining == Decimal("10000") - Decimal(saved)
    assert percent == int(Decimal(saved) / 100)
    assert (needed, is_behind) == (monthly, behind)
