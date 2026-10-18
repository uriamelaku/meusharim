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


def spend(partner: Partner, category: str, amount: str, day="2026-10-10", status="completed"):
    partner.ok(
        "post",
        "/api/transactions",
        {"kind": "expense", "amount": amount, "occurred_on": day, "status": status,
         "category_id": partner.category_id(category)},
    )  # fmt: skip


def save(partner: Partner, month="2026-10", total=None, **categories):
    body = {
        "total": total,
        "categories": [
            {"category_id": partner.category_id(name), "amount": amount}
            for name, amount in categories.items()
        ],
    }
    return partner.put("/api/budgets", body, params={"month": month})


def by_name(budget: dict) -> dict[str, dict]:
    return {c["category"]["name"]: c for c in budget["categories"]}


def test_month_without_budget_still_shows_spending(couple):
    owner, _ = couple
    spend(owner, "מזון", "120.50")

    budget = owner.ok("get", "/api/budgets", params=OCTOBER)

    assert budget["total_budget"] is None and budget["effective_budget"] is None
    assert budget["actual"] == "120.50"
    assert budget["percent"] is None and budget["status"] is None
    assert by_name(budget)["מזון"]["budget"] is None


def test_category_usage_and_status(couple):
    owner, partner = couple
    assert save(owner, מזון="1000", מסעדות="200", דיור="5000").status_code == 200
    spend(owner, "מזון", "799.99")
    spend(partner, "מסעדות", "200")
    spend(owner, "דיור", "5000.01")

    rows = by_name(partner.ok("get", "/api/budgets", params=OCTOBER))

    assert (rows["מזון"]["percent"], rows["מזון"]["status"], rows["מזון"]["remaining"]) == (
        80,
        "near",
        "200.01",
    )
    assert (rows["מסעדות"]["percent"], rows["מסעדות"]["status"]) == (100, "near")
    assert (rows["דיור"]["status"], rows["דיור"]["remaining"]) == ("over", "-0.01")


def test_below_near_limit_is_ok(couple):
    owner, _ = couple
    save(owner, מזון="1000")
    spend(owner, "מזון", "794.99")  # 79.499% rounds to 79
    row = by_name(owner.ok("get", "/api/budgets", params=OCTOBER))["מזון"]
    assert (row["percent"], row["status"]) == (79, "ok")


def test_effective_budget_is_total_or_sum_of_categories(couple):
    owner, _ = couple
    save(owner, מזון="1000.10", מסעדות="200.20")
    assert owner.ok("get", "/api/budgets", params=OCTOBER)["effective_budget"] == "1200.30"

    save(owner, total="9000", מזון="1000")
    budget = owner.ok("get", "/api/budgets", params=OCTOBER)
    assert budget["total_budget"] == budget["effective_budget"] == "9000.00"
    assert "מסעדות" not in by_name(budget)  # replaced, and no spending there


def test_planned_is_separate_from_actual(couple):
    owner, _ = couple
    save(owner, דיור="5000")
    spend(owner, "דיור", "5000", day="2026-10-01", status="planned")  # date passed, not confirmed
    owner.ok(
        "post",
        "/api/schedules",
        {"type": "recurring", "kind": "expense", "category_id": owner.category_id("חשבונות"),
         "frequency": "monthly", "start_date": "2026-10-25", "amount": "350"},
    )  # fmt: skip

    budget = owner.ok("get", "/api/budgets", params=OCTOBER)
    rows = by_name(budget)

    assert budget["actual"] == "0.00"
    assert budget["planned"] == "5350.00"
    assert (rows["דיור"]["actual"], rows["דיור"]["planned"], rows["דיור"]["percent"]) == (
        "0.00",
        "5000.00",
        0,
    )
    assert rows["חשבונות"]["planned"] == "350.00"


def test_agorot_add_up_exactly(couple):
    owner, _ = couple
    for _ in range(3):
        spend(owner, "מזון", "0.10")
    spend(owner, "מזון", "0.20")
    assert owner.ok("get", "/api/budgets", params=OCTOBER)["actual"] == "0.50"


def test_months_keep_their_own_budget(couple):
    owner, _ = couple
    save(owner, month="2026-09", מזון="900")
    save(owner, month="2026-10", מזון="1100")
    save(owner, month="2026-10", מזון="1200")

    september = owner.ok("get", "/api/budgets", params={"month": "2026-09"})
    assert by_name(september)["מזון"]["budget"] == "900.00"


def test_copy_previous_month(couple):
    owner, partner = couple
    save(owner, month="2026-09", total="8000", מזון="900", מסעדות="300")
    restaurants = owner.category_id("מסעדות")
    owner.ok("delete", f"/api/categories/{restaurants}")  # archived: has a budget

    copied = partner.ok("post", "/api/budgets/copy-previous", params=OCTOBER)

    assert copied["total_budget"] == "8000.00"
    assert {name: c["budget"] for name, c in by_name(copied).items()} == {"מזון": "900.00"}


def test_copy_without_previous_budget(couple):
    owner, _ = couple
    response = owner.post("/api/budgets/copy-previous", params=OCTOBER)
    assert response.status_code == 409
    assert response.json() == {"detail": "no_previous_budget"}
    assert owner.ok("get", "/api/budgets", params=OCTOBER)["previous_month_has_budget"] is False
    save(owner, month="2026-09", מזון="1")
    assert owner.ok("get", "/api/budgets", params=OCTOBER)["previous_month_has_budget"] is True


def test_copy_into_january_uses_december(couple):
    owner, _ = couple
    save(owner, month="2026-12", מזון="1500")
    copied = owner.ok("post", "/api/budgets/copy-previous", params={"month": "2027-01"})
    assert by_name(copied)["מזון"]["budget"] == "1500.00"


def test_kept_budget_of_archived_category_can_be_saved_again(couple):
    owner, _ = couple
    save(owner, מזון="900")
    food = owner.category_id("מזון")
    owner.ok("delete", f"/api/categories/{food}")
    body = {"categories": [{"category_id": food, "amount": "950"}]}
    assert owner.put("/api/budgets", body, params=OCTOBER).status_code == 200
    november = owner.put("/api/budgets", body, params={"month": "2026-11"})
    assert november.json() == {"detail": "category_archived"}


@pytest.mark.parametrize(
    "body,detail",
    [
        ({"categories": [{"category_id": "משכורת", "amount": "1"}]}, "category_kind_mismatch"),
        (
            {
                "categories": [
                    {"category_id": "מזון", "amount": "1"},
                    {"category_id": "מזון", "amount": "2"},
                ]
            },
            "duplicate_category",
        ),
    ],
)
def test_invalid_categories(couple, body, detail):
    owner, _ = couple
    for row in body["categories"]:
        row["category_id"] = owner.category_id(row["category_id"])
    response = owner.put("/api/budgets", body, params=OCTOBER)
    assert response.status_code == 422
    assert response.json() == {"detail": detail}


@pytest.mark.parametrize("month", ["2026-13", "1899-12", "2026-1", "october"])
def test_invalid_month(couple, month):
    owner, _ = couple
    assert owner.get("/api/budgets", params={"month": month}).status_code == 422


@pytest.mark.parametrize("amount", ["0", "-1", "1.001"])
def test_invalid_amounts(couple, amount):
    owner, _ = couple
    assert owner.put("/api/budgets", {"total": amount}, params=OCTOBER).status_code == 422


def test_budgets_are_isolated_between_households(couple):
    owner, _ = couple
    save(owner, total="5000", מזון="900")
    stranger = Partner()
    stranger.create_household()

    budget = stranger.ok("get", "/api/budgets", params=OCTOBER)
    assert budget["total_budget"] is None and budget["categories"] == []
    foreign = {"categories": [{"category_id": owner.category_id("מזון"), "amount": "1"}]}
    assert stranger.put("/api/budgets", foreign, params=OCTOBER).json() == {
        "detail": "category_not_found"
    }
    # The stranger's save of their own (empty) budget leaves the owner's untouched.
    stranger.put("/api/budgets", {"total": "1"}, params=OCTOBER)
    assert owner.ok("get", "/api/budgets", params=OCTOBER)["total_budget"] == "5000.00"


def test_total_is_a_ceiling_with_unallocated_part(couple):
    owner, partner = couple
    save(owner, total="9000", מזון="1000", ביטוחים="650.50")

    budget = partner.ok("get", "/api/budgets", params=OCTOBER)

    assert budget["total_budget"] == budget["effective_budget"] == "9000.00"
    assert budget["allocated"] == "1650.50"
    assert budget["unallocated"] == "7349.50"


def test_categories_may_fill_the_total_exactly(couple):
    owner, _ = couple
    assert save(owner, total="1500", מזון="1000", ביטוחים="500").status_code == 200
    budget = owner.ok("get", "/api/budgets", params=OCTOBER)
    assert budget["unallocated"] == "0.00"


def test_categories_above_total_are_rejected(couple):
    owner, _ = couple
    save(owner, total="5000", מזון="900")

    response = save(owner, total="1000", מזון="900", ביטוחים="100.01")

    assert response.status_code == 422
    assert response.json()["detail"] == "categories_exceed_total"
    budget = owner.ok("get", "/api/budgets", params=OCTOBER)
    assert budget["total_budget"] == "5000.00"  # the rejected save changed nothing


def test_without_total_allocated_is_the_budget(couple):
    owner, _ = couple
    save(owner, מזון="1000", ביטוחים="200")
    budget = owner.ok("get", "/api/budgets", params=OCTOBER)
    assert budget["allocated"] == budget["effective_budget"] == "1200.00"
    assert budget["unallocated"] is None
