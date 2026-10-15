import threading
from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from app.db import user_transaction
from app.main import app
from app.schedules.service import record_due_occurrences
from app.scope import HouseholdScope, get_today
from tests.partners import Partner, make_couple


def set_today(day: date) -> None:
    app.dependency_overrides[get_today] = lambda: day


@pytest.fixture
def couple():
    set_today(date(2026, 10, 14))
    return make_couple()


def create(partner: Partner, **overrides) -> dict:
    body = {
        "type": "recurring",
        "kind": "expense",
        "category_id": partner.category_id("דיור"),
        "description": "שכר דירה",
        "frequency": "monthly",
        "start_date": "2026-08-31",
        "amount": "5200",
        **overrides,
    }
    return partner.ok("post", "/api/schedules", body)


def installments(partner: Partner, **overrides) -> dict:
    body = {
        "type": "installments",
        "category_id": partner.category_id("קניות"),
        "description": "מקרר",
        "start_date": "2026-08-10",
        "total_amount": "1000",
        "installments_count": 12,
        **overrides,
    }
    return partner.ok("post", "/api/schedules", body)


def recorded(partner: Partner, schedule_id: str) -> list[dict]:
    items = partner.ok("get", "/api/transactions", params={"sort": "date_asc", "limit": 100})[
        "items"
    ]
    return [t for t in items if t["schedule"] and t["schedule"]["id"] == schedule_id]


def test_due_occurrences_are_recorded_as_planned(couple):
    owner, _ = couple
    schedule = create(owner)

    rows = recorded(owner, schedule["id"])
    assert [(t["occurred_on"], t["status"], t["amount"]) for t in rows] == [
        ("2026-08-31", "planned", "5200.00"),
        ("2026-09-30", "planned", "5200.00"),  # month end
    ]
    assert [t["schedule"]["sequence_no"] for t in rows] == [1, 2]
    assert schedule["next_occurrence"]["occurred_on"] == "2026-10-31"
    assert schedule["recorded_count"] == 2 and schedule["completed_count"] == 0


def test_auto_confirm_records_completed(couple):
    owner, _ = couple
    schedule = create(owner, auto_confirm=True)
    assert {t["status"] for t in recorded(owner, schedule["id"])} == {"completed"}


def test_occurrences_are_recorded_once_as_time_passes(couple):
    owner, partner = couple
    schedule = create(owner)
    for _ in range(3):
        owner.ok("get", "/api/transactions")
    assert len(recorded(owner, schedule["id"])) == 2

    set_today(date(2026, 12, 31))
    rows = recorded(partner, schedule["id"])
    assert [t["occurred_on"] for t in rows][-2:] == ["2026-11-30", "2026-12-31"]
    assert len(rows) == 5


def test_recorded_rows_belong_to_schedule_creator(couple):
    owner, partner = couple
    schedule = create(owner, start_date="2026-10-20")
    set_today(date(2026, 10, 20))
    # The partner's request writes the occurrence, but the owner created the schedule.
    assert recorded(partner, schedule["id"])[0]["created_by"] == str(owner.id)


def test_deleted_occurrence_is_not_recreated(couple):
    owner, _ = couple
    schedule = create(owner)
    first = recorded(owner, schedule["id"])[0]
    assert owner.delete(f"/api/transactions/{first['id']}").status_code == 204

    set_today(date(2026, 10, 31))
    assert [t["schedule"]["sequence_no"] for t in recorded(owner, schedule["id"])] == [2, 3]


def test_confirming_an_occurrence_completes_it(couple):
    owner, partner = couple
    schedule = create(owner)
    ids = [t["id"] for t in recorded(owner, schedule["id"])]

    partner.ok("post", "/api/transactions/confirm", {"ids": ids[:1]})

    assert [t["status"] for t in recorded(owner, schedule["id"])] == ["completed", "planned"]
    detail = owner.ok("get", f"/api/schedules/{schedule['id']}")
    assert detail["completed_count"] == 1 and detail["completed_amount"] == "5200.00"


def test_pause_skips_occurrences_and_resume_continues(couple):
    owner, _ = couple
    schedule = create(owner, start_date="2026-10-01")
    path = f"/api/schedules/{schedule['id']}"
    paused = owner.ok("post", f"{path}/pause")
    assert paused["status"] == "paused" and paused["next_occurrence"] is None

    set_today(date(2027, 1, 1))
    assert len(recorded(owner, schedule["id"])) == 1  # nothing during the pause

    resumed = owner.ok("post", f"{path}/resume")
    # Nov and Dec are skipped; Jan 1 (today) is recorded on resume.
    assert [t["occurred_on"] for t in recorded(owner, schedule["id"])] == [
        "2026-10-01",
        "2027-01-01",
    ]
    assert resumed["next_occurrence"]["occurred_on"] == "2027-02-01"


def test_cancel_keeps_history_and_stops_future(couple):
    owner, _ = couple
    schedule = create(owner)
    path = f"/api/schedules/{schedule['id']}"

    cancelled = owner.ok("post", f"{path}/cancel")
    set_today(date(2027, 6, 1))

    assert cancelled["status"] == "cancelled"
    assert len(recorded(owner, schedule["id"])) == 2
    assert owner.patch(path, {"amount": "1"}).json() == {"detail": "schedule_cancelled"}
    assert owner.post(f"{path}/resume").status_code == 409
    assert (
        owner.ok(
            "get", "/api/schedules/occurrences", params={"from": "2027-06-01", "to": "2027-12-31"}
        )
        == []
    )


def test_amount_change_applies_only_to_future(couple):
    owner, _ = couple
    schedule = create(owner)
    updated = owner.ok("patch", f"/api/schedules/{schedule['id']}", {"amount": "5400"})

    assert updated["id"] == schedule["id"]
    assert updated["next_occurrence"]["amount"] == "5400.00"
    assert {t["amount"] for t in recorded(owner, schedule["id"])} == {"5200.00"}
    set_today(date(2026, 10, 31))
    assert recorded(owner, schedule["id"])[-1]["amount"] == "5400.00"


def test_timing_change_after_start_continues_in_new_schedule(couple):
    owner, _ = couple
    schedule = create(owner)
    old_path = f"/api/schedules/{schedule['id']}"

    new = owner.ok("patch", old_path, {"start_date": "2026-11-10", "amount": "5300"})

    assert new["id"] != schedule["id"]
    assert new["start_date"] == "2026-11-10" and new["amount"] == "5300.00"
    old = owner.ok("get", old_path)
    assert old["end_date"] == "2026-11-09"
    # The old schedule still owes its October 31 occurrence, then it is finished.
    assert [o["occurred_on"] for o in old["upcoming"]] == ["2026-10-31"]
    assert len(recorded(owner, schedule["id"])) == 2


def test_timing_change_cannot_rewrite_recorded_dates(couple):
    owner, _ = couple
    schedule = create(owner)
    response = owner.patch(f"/api/schedules/{schedule['id']}", {"start_date": "2026-09-15"})
    assert response.json() == {"detail": "start_before_last_occurrence"}


def test_timing_change_before_start_is_in_place(couple):
    owner, _ = couple
    schedule = create(owner, start_date="2026-12-01")
    updated = owner.ok(
        "patch",
        f"/api/schedules/{schedule['id']}",
        {"frequency": "weekly", "start_date": "2026-11-02"},
    )
    assert updated["id"] == schedule["id"]
    assert [o["occurred_on"] for o in updated["upcoming"][:2]] == ["2026-11-02", "2026-11-09"]


def test_end_date_finishes_the_schedule(couple):
    owner, _ = couple
    schedule = create(owner, start_date="2026-09-01", end_date="2026-10-01")
    assert schedule["finished"] is True and schedule["next_occurrence"] is None
    assert len(recorded(owner, schedule["id"])) == 2
    # Removing the end date brings future occurrences back.
    reopened = owner.ok("patch", f"/api/schedules/{schedule['id']}", {"end_date": None})
    assert reopened["next_occurrence"]["occurred_on"] == "2026-11-01"


def test_future_occurrences_endpoint(couple):
    owner, _ = couple
    create(owner)  # monthly on the 31st, next 2026-10-31
    weekly = create(
        owner,
        frequency="weekly",
        start_date="2026-10-20",
        amount="100",
        category_id=owner.category_id("מזון"),
    )
    salary = create(
        owner,
        kind="income",
        category_id=owner.category_id("משכורת"),
        start_date="2026-11-01",
        amount="12000",
    )
    owner.ok("post", f"/api/schedules/{salary['id']}/pause")

    occurrences = owner.ok(
        "get", "/api/schedules/occurrences", params={"from": "2026-10-01", "to": "2026-11-05"}
    )
    assert [(o["occurred_on"], o["amount"]) for o in occurrences] == [
        ("2026-10-20", "100.00"),
        ("2026-10-27", "100.00"),
        ("2026-10-31", "5200.00"),
        ("2026-11-03", "100.00"),
    ]
    assert all(o["schedule_id"] != salary["id"] for o in occurrences)
    assert occurrences[0]["schedule_id"] == weekly["id"]
    expense_only = owner.ok(
        "get",
        "/api/schedules/occurrences",
        params={"from": "2026-10-01", "to": "2026-12-31", "kind": "income"},
    )
    assert expense_only == []


@pytest.mark.parametrize(
    "params",
    [{"from": "2026-10-10", "to": "2026-10-01"}, {"from": "2020-01-01", "to": "2030-01-01"}],
)
def test_occurrences_range_is_validated(couple, params):
    owner, _ = couple
    assert owner.get("/api/schedules/occurrences", params=params).status_code == 422


@pytest.mark.parametrize(
    "overrides",
    [
        {"amount": "0"},
        {"frequency": "daily"},
        {"end_date": "2026-08-01"},
        {"kind": "income"},  # category is an expense category
    ],
)
def test_recurring_validation(couple, overrides):
    owner, _ = couple
    body = {
        "type": "recurring", "kind": "expense", "category_id": owner.category_id("דיור"),
        "frequency": "monthly", "start_date": "2026-08-31", "amount": "10", **overrides,
    }  # fmt: skip
    assert owner.post("/api/schedules", body).status_code == 422


def test_other_household_cannot_see_or_change_schedules(couple):
    owner, _ = couple
    schedule = create(owner)
    stranger = Partner()
    stranger.create_household()
    path = f"/api/schedules/{schedule['id']}"

    assert stranger.ok("get", "/api/schedules") == []
    assert stranger.get(path).status_code == 404
    assert stranger.patch(path, {"amount": "1"}).status_code == 404
    for action in ("pause", "resume", "cancel"):
        assert stranger.post(f"{path}/{action}").status_code == 404
    assert owner.ok("get", path)["status"] == "active"


def test_concurrent_requests_record_each_occurrence_once(couple):
    owner, partner = couple
    schedule = create(owner, start_date="2026-10-20")
    household_id = owner.ok("get", "/api/household")["household"]["id"]
    barrier = threading.Barrier(4)

    def record(user_id):
        with user_transaction(user_id) as session:
            barrier.wait()
            scope = HouseholdScope(
                session=session, household_id=household_id, today=date(2027, 3, 1)
            )
            record_due_occurrences(scope)

    threads = [threading.Thread(target=record, args=(u,)) for u in [owner.id, partner.id] * 2]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    rows = recorded(owner, schedule["id"])
    assert [t["schedule"]["sequence_no"] for t in rows] == [1, 2, 3, 4, 5]


# --- Installments ------------------------------------------------------------


def test_installments_split_and_record_with_auto_confirm(couple):
    owner, _ = couple
    plan = installments(owner)

    rows = recorded(owner, plan["id"])
    assert [(t["occurred_on"], t["amount"], t["status"]) for t in rows] == [
        ("2026-08-10", "83.37", "completed"),
        ("2026-09-10", "83.33", "completed"),
        ("2026-10-10", "83.33", "completed"),
    ]
    assert rows[0]["schedule"]["installments_count"] == 12
    assert plan["completed_count"] == 3
    assert plan["remaining_amount"] == "749.97"
    assert plan["next_occurrence"]["sequence_no"] == 4
    assert len(plan["upcoming"]) == 9


def test_installments_sum_exactly_to_total_when_finished(couple):
    owner, _ = couple
    plan = installments(owner, total_amount="999.99", installments_count=7)
    set_today(date(2027, 12, 31))
    amounts = [Decimal(t["amount"]) for t in recorded(owner, plan["id"])]
    assert len(amounts) == 7 and sum(amounts) == Decimal("999.99")
    done = owner.ok("get", f"/api/schedules/{plan['id']}")
    assert done["finished"] is True and done["remaining_amount"] == "0.00"


def test_installment_plan_is_locked_after_first_payment(couple):
    owner, _ = couple
    plan = installments(owner)
    path = f"/api/schedules/{plan['id']}"

    for change in (
        {"total_amount": "1200"},
        {"installments_count": 10},
        {"start_date": "2026-11-01"},
    ):
        assert owner.patch(path, change).json() == {"detail": "installments_started"}
    updated = owner.ok(
        "patch", path, {"description": "מקרר חדש", "category_id": owner.category_id("שונות")}
    )
    assert updated["description"] == "מקרר חדש"
    # Recorded payments keep their original category.
    assert {t["category"]["name"] for t in recorded(owner, plan["id"])} == {"קניות"}


def test_installment_plan_is_editable_before_first_payment(couple):
    owner, _ = couple
    plan = installments(owner, start_date="2026-11-01")
    updated = owner.ok(
        "patch", f"/api/schedules/{plan['id']}", {"total_amount": "300", "installments_count": 3}
    )
    assert [o["amount"] for o in updated["upcoming"]] == ["100.00", "100.00", "100.00"]


def test_cancelled_installments_keep_paid_history(couple):
    owner, _ = couple
    plan = installments(owner)
    cancelled = owner.ok("post", f"/api/schedules/{plan['id']}/cancel")
    set_today(date(2027, 12, 31))
    assert len(recorded(owner, plan["id"])) == 3
    assert cancelled["remaining_amount"] == "749.97"


@pytest.mark.parametrize(
    "overrides",
    [
        {"installments_count": 1},
        {"installments_count": 361},
        {"total_amount": "0.05", "installments_count": 6},
    ],
)
def test_installments_validation(couple, overrides):
    owner, _ = couple
    body = {
        "type": "installments", "category_id": owner.category_id("קניות"),
        "start_date": "2026-08-10", "total_amount": "1000", "installments_count": 12, **overrides,
    }  # fmt: skip
    assert owner.post("/api/schedules", body).status_code == 422


def test_category_used_only_by_schedule_is_archived_not_deleted(couple):
    owner, _ = couple
    category = owner.ok(
        "post",
        "/api/categories",
        {"kind": "expense", "name": "גן", "color": "amber", "icon": "baby"},
    )
    create(owner, category_id=category["id"], start_date="2027-01-01")
    assert owner.ok("delete", f"/api/categories/{category['id']}") == {"result": "archived"}


def test_repeated_request_id_creates_one_schedule(couple):
    owner, _ = couple
    request_id = str(uuid4())
    first = create(owner, request_id=request_id)
    again = create(owner, request_id=request_id)
    plan_request = str(uuid4())
    plan = installments(owner, request_id=str(uuid4()))
    plan_again = installments(owner, request_id=plan_request)
    plan_repeat = installments(owner, request_id=plan_request)

    assert again["id"] == first["id"]
    assert plan_again["id"] == plan_repeat["id"] != plan["id"]
    assert len(owner.ok("get", "/api/schedules")) == 3
    assert len(recorded(owner, first["id"])) == 2  # Aug 31 and Sep 30, each once


def test_schedule_request_id_is_scoped_to_household(couple):
    owner, _ = couple
    request_id = str(uuid4())
    mine = create(owner, request_id=request_id)
    stranger = Partner()
    stranger.create_household()
    theirs = create(stranger, request_id=request_id)

    assert theirs["id"] != mine["id"]
    assert [s["id"] for s in owner.ok("get", "/api/schedules")] == [mine["id"]]
