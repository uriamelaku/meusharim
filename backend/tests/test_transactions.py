import pytest
from psycopg import errors as pg_errors
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.db import user_transaction
from tests.partners import Partner, make_couple


@pytest.fixture
def couple():
    return make_couple()


def add(partner: Partner, **overrides) -> dict:
    body = {
        "kind": "expense",
        "amount": "100.00",
        "occurred_on": "2026-10-10",
        "category_id": partner.category_id("מזון"),
        "status": "completed",
        **overrides,
    }
    return partner.ok("post", "/api/transactions", body)


def listing(partner: Partner, **params) -> dict:
    return partner.ok("get", "/api/transactions", params=params)


def test_create_transaction_records_creator_and_details(couple):
    owner, partner = couple
    created = add(
        owner,
        amount="1234.56",
        description="  סופר שבועי  ",
        party_user_id=str(partner.id),
        created_by=str(partner.id),  # ignored: always the caller
    )

    assert created["amount"] == "1234.56"
    assert created["description"] == "סופר שבועי"
    assert created["created_by"] == str(owner.id)
    assert created["party_user_id"] == str(partner.id)
    assert created["category"]["name"] == "מזון"
    assert created["status"] == "completed"


def test_joint_account_is_null_party(couple):
    owner, _ = couple
    assert add(owner)["party_user_id"] is None


@pytest.mark.parametrize("amount", ["0.01", "0.1", "9999999999.99", 12.5])
def test_valid_amounts_are_stored_exactly(couple, amount):
    owner, _ = couple
    created = add(owner, amount=amount)
    assert float(created["amount"]) == float(amount)
    assert created["amount"].count(".") == 1 and len(created["amount"].split(".")[1]) == 2


@pytest.mark.parametrize("amount", ["0", "-5", "0.001", "10000000000.00", "abc", None])
def test_invalid_amounts_are_rejected(couple, amount):
    owner, _ = couple
    body = {
        "kind": "expense",
        "amount": amount,
        "occurred_on": "2026-10-10",
        "category_id": owner.category_id("מזון"),
        "status": "completed",
    }
    assert owner.post("/api/transactions", body).status_code == 422


@pytest.mark.parametrize(
    "field,value",
    [
        ("occurred_on", "1899-12-31"),
        ("status", "done"),
        ("description", "א" * 121),
        ("kind", "transfer"),
    ],
)
def test_invalid_fields_are_rejected(couple, field, value):
    owner, _ = couple
    body = {
        "kind": "expense",
        "amount": "10",
        "occurred_on": "2026-10-10",
        "category_id": owner.category_id("מזון"),
        "status": "completed",
        field: value,
    }
    assert owner.post("/api/transactions", body).status_code == 422


def test_category_must_match_kind(couple):
    owner, _ = couple
    response = owner.post(
        "/api/transactions",
        {
            "kind": "income",
            "amount": "10",
            "occurred_on": "2026-10-10",
            "category_id": owner.category_id("מזון"),
            "status": "completed",
        },
    )
    assert response.status_code == 422
    assert response.json() == {"detail": "category_kind_mismatch"}


def test_other_households_category_and_member_are_rejected(couple):
    owner, _ = couple
    stranger = Partner()
    stranger.create_household()
    foreign_category = stranger.category_id("מזון")

    response = owner.post(
        "/api/transactions",
        {
            "kind": "expense",
            "amount": "10",
            "occurred_on": "2026-10-10",
            "category_id": foreign_category,
            "status": "completed",
        },
    )
    assert response.json() == {"detail": "category_not_found"}

    response = owner.post(
        "/api/transactions",
        {
            "kind": "expense",
            "amount": "10",
            "occurred_on": "2026-10-10",
            "category_id": owner.category_id("מזון"),
            "status": "completed",
            "party_user_id": str(stranger.id),
        },
    )
    assert response.json() == {"detail": "invalid_member"}


def test_partners_share_transactions(couple):
    owner, partner = couple
    created = add(owner)

    assert [t["id"] for t in listing(partner)["items"]] == [created["id"]]
    updated = partner.ok("patch", f"/api/transactions/{created['id']}", {"amount": "80.50"})
    assert updated["amount"] == "80.50"
    assert updated["created_by"] == str(owner.id)
    assert updated["updated_at"] > created["updated_at"]

    assert partner.delete(f"/api/transactions/{created['id']}").status_code == 204
    assert listing(owner)["total"] == 0


def test_other_household_cannot_see_or_change_transactions(couple):
    owner, _ = couple
    created = add(owner)
    stranger = Partner()
    stranger.create_household()

    assert listing(stranger)["total"] == 0
    path = f"/api/transactions/{created['id']}"
    assert stranger.get(path).status_code == 404
    assert stranger.patch(path, {"amount": "1"}).status_code == 404
    assert stranger.delete(path).status_code == 404
    assert stranger.ok("post", "/api/transactions/confirm", {"ids": [created["id"]]}) == {
        "confirmed": 0
    }
    assert owner.ok("get", path)["amount"] == "100.00"


def test_update_changes_kind_and_category_together(couple):
    owner, _ = couple
    created = add(owner)
    path = f"/api/transactions/{created['id']}"

    assert owner.patch(path, {"kind": "income"}).json() == {"detail": "category_kind_mismatch"}
    updated = owner.ok(
        "patch", path, {"kind": "income", "category_id": owner.category_id("משכורת")}
    )
    assert updated["kind"] == "income"
    assert updated["category"]["name"] == "משכורת"


def test_update_party_to_joint_and_back(couple):
    owner, partner = couple
    path = f"/api/transactions/{add(owner, party_user_id=str(partner.id))['id']}"

    assert owner.ok("patch", path, {"party_user_id": None})["party_user_id"] is None
    assert owner.ok("patch", path, {"party_user_id": str(owner.id)})["party_user_id"] == str(
        owner.id
    )
    # Omitting the field leaves it unchanged.
    assert owner.ok("patch", path, {"description": "x"})["party_user_id"] == str(owner.id)


def test_deleting_used_category_archives_it_and_keeps_history(couple):
    owner, _ = couple
    food = owner.category_id("מזון")
    created = add(owner)

    assert owner.ok("delete", f"/api/categories/{food}") == {"result": "archived"}

    kept = owner.ok("get", f"/api/transactions/{created['id']}")
    assert kept["category"] == {**kept["category"], "name": "מזון", "archived": True}
    # Archived categories cannot be chosen again, but old transactions keep theirs.
    response = owner.post(
        "/api/transactions",
        {
            "kind": "expense",
            "amount": "5",
            "occurred_on": "2026-10-10",
            "category_id": food,
            "status": "completed",
        },
    )
    assert response.json() == {"detail": "category_archived"}
    assert (
        owner.ok("patch", f"/api/transactions/{created['id']}", {"amount": "7"})["amount"] == "7.00"
    )
    # A new category with the archived name is allowed.
    assert (
        owner.post(
            "/api/categories", {"kind": "expense", "name": "מזון", "color": "green", "icon": "zap"}
        ).status_code
        == 201
    )


def test_status_is_never_changed_by_date(couple):
    owner, _ = couple
    past_planned = add(owner, occurred_on="2020-01-01", status="planned")
    future_completed = add(owner, occurred_on="2099-01-01", status="completed")

    assert owner.ok("get", f"/api/transactions/{past_planned['id']}")["status"] == "planned"
    assert owner.ok("get", f"/api/transactions/{future_completed['id']}")["status"] == "completed"


def test_confirm_completes_only_planned(couple):
    owner, partner = couple
    first = add(owner, status="planned")
    second = add(owner, status="planned")
    done = add(owner)

    result = partner.ok(
        "post", "/api/transactions/confirm", {"ids": [first["id"], second["id"], done["id"]]}
    )

    assert result == {"confirmed": 2}
    assert {t["status"] for t in listing(owner)["items"]} == {"completed"}


def test_confirm_requires_ids(couple):
    owner, _ = couple
    assert owner.post("/api/transactions/confirm", {"ids": []}).status_code == 422


@pytest.fixture
def ledger(couple):
    owner, partner = couple
    rows = {
        "salary": add(
            owner,
            kind="income",
            amount="12000",
            occurred_on="2026-09-30",
            category_id=owner.category_id("משכורת"),
            party_user_id=str(owner.id),
        ),
        "food": add(owner, amount="350.40", occurred_on="2026-10-01", description="שופרסל"),
        "cafe": add(
            partner,
            amount="42",
            occurred_on="2026-10-05",
            category_id=owner.category_id("מסעדות"),
            description="קפה 100%",
            party_user_id=str(partner.id),
        ),
        "rent": add(
            owner,
            amount="5200",
            occurred_on="2026-10-31",
            category_id=owner.category_id("דיור"),
            status="planned",
        ),
    }
    return owner, partner, rows


def ids(page: dict) -> list[str]:
    return [t["id"] for t in page["items"]]


def test_default_order_is_newest_first(ledger):
    owner, _, rows = ledger
    assert ids(listing(owner)) == [rows[k]["id"] for k in ["rent", "cafe", "food", "salary"]]


def test_sort_by_amount(ledger):
    owner, _, rows = ledger
    assert ids(listing(owner, sort="amount_desc"))[0] == rows["salary"]["id"]
    assert ids(listing(owner, sort="amount_asc"))[0] == rows["cafe"]["id"]
    assert ids(listing(owner, sort="date_asc"))[0] == rows["salary"]["id"]


def test_filter_by_period_kind_status_category_and_party(ledger):
    owner, partner, rows = ledger
    october = listing(owner, **{"from": "2026-10-01", "to": "2026-10-31"})
    assert set(ids(october)) == {rows[k]["id"] for k in ["food", "cafe", "rent"]}
    assert ids(listing(owner, kind="income")) == [rows["salary"]["id"]]
    assert ids(listing(owner, status="planned")) == [rows["rent"]["id"]]
    assert ids(listing(owner, category_id=owner.category_id("מסעדות"))) == [rows["cafe"]["id"]]
    assert ids(listing(owner, party=str(partner.id))) == [rows["cafe"]["id"]]
    assert set(ids(listing(owner, party="joint"))) == {rows["food"]["id"], rows["rent"]["id"]}


def test_search_matches_description_and_category_name(ledger):
    owner, _, rows = ledger
    assert ids(listing(owner, q="שופר")) == [rows["food"]["id"]]
    assert ids(listing(owner, q="מסעד")) == [rows["cafe"]["id"]]
    # LIKE wildcards are matched literally.
    assert ids(listing(owner, q="%")) == [rows["cafe"]["id"]]
    assert listing(owner, q="_")["total"] == 0


def test_pagination_reports_total(ledger):
    owner, _, _ = ledger
    first = listing(owner, limit=3)
    second = listing(owner, limit=3, offset=3)
    assert first["total"] == second["total"] == 4
    assert len(first["items"]) == 3 and len(second["items"]) == 1


@pytest.mark.parametrize(
    "params",
    [
        {"limit": 0},
        {"limit": 101},
        {"sort": "random"},
        {"party": "everyone"},
        {"from": "not-a-date"},
    ],
)
def test_invalid_list_params(couple, params):
    owner, _ = couple
    assert owner.get("/api/transactions", params=params).status_code == 422


def test_created_by_cannot_be_forged_in_database(couple):
    owner, partner = couple
    household_id = owner.ok("get", "/api/household")["household"]["id"]
    with pytest.raises(DBAPIError) as error, user_transaction(owner.id) as session:
        session.execute(
            text(
                "INSERT INTO transactions (household_id, kind, amount, occurred_on, category_id,"
                " status, created_by) VALUES (:h, 'expense', 1, '2026-10-10', :c, 'completed', :u)"
            ),
            {"h": household_id, "c": owner.category_id("מזון"), "u": partner.id},
        )
    assert isinstance(error.value.orig, pg_errors.InsufficientPrivilege)


def test_rls_hides_other_households_transactions(couple):
    owner, _ = couple
    add(owner)
    stranger = Partner()
    stranger.create_household()
    with user_transaction(stranger.id) as session:
        assert session.scalar(text("SELECT count(*) FROM transactions")) == 0
        updated = session.execute(text("UPDATE transactions SET amount = 1 RETURNING id")).all()
        assert updated == []
