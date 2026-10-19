from uuid import uuid4

import pytest
from psycopg import errors as pg_errors
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.db import user_transaction
from tests.partners import Partner, make_couple


@pytest.fixture
def couple():
    return make_couple()


def new_category(partner: Partner, **overrides):
    body = {"kind": "expense", "name": "חיות מחמד", "color": "amber", "icon": "paw-print"}
    return partner.post("/api/categories", {**body, **overrides})


def test_new_household_gets_default_categories(couple):
    owner, _ = couple
    categories = owner.ok("get", "/api/categories")

    expense = [c["name"] for c in categories if c["kind"] == "expense"]
    income = [c["name"] for c in categories if c["kind"] == "income"]
    assert len(expense) == 14
    assert {"מזון", "מסעדות", "דיור", "ביטוחים", "שונות"} <= set(expense)
    assert set(income) == {"משכורת", "עסק", "הכנסה נוספת", "החזרים"}
    assert not any(c["archived"] for c in categories)


def test_household_created_in_english_gets_english_categories():
    owner = Partner()
    assert owner.create_household(name="Our home", language="en").status_code == 201
    categories = owner.ok("get", "/api/categories")

    expense = [c["name"] for c in categories if c["kind"] == "expense"]
    income = [c["name"] for c in categories if c["kind"] == "income"]
    assert len(expense) == 14
    assert {"Groceries", "Eating out", "Housing", "Insurance", "Other"} <= set(expense)
    assert set(income) == {"Salary", "Business", "Extra income", "Refunds"}


def test_unknown_household_language_is_rejected():
    assert Partner().create_household(language="fr").status_code == 422


def test_both_partners_manage_the_same_categories(couple):
    owner, partner = couple
    created = new_category(partner).json()

    owner.ok("patch", f"/api/categories/{created['id']}", {"name": "כלב", "color": "rose"})

    seen_by_partner = partner.category_id("כלב")
    assert seen_by_partner == created["id"]


def test_create_category_trims_name(couple):
    owner, _ = couple
    response = new_category(owner, name="  ספרים  ", icon="book-open")

    assert response.status_code == 201
    assert response.json()["name"] == "ספרים"
    assert response.json()["kind"] == "expense"


@pytest.mark.parametrize("name", ["מזון", " מזון ", "מזון"])
def test_duplicate_name_in_same_kind_is_rejected(couple, name):
    owner, _ = couple
    response = new_category(owner, name=name)

    assert response.status_code == 409
    assert response.json() == {"detail": "category_exists"}


def test_duplicate_check_ignores_case(couple):
    owner, _ = couple
    assert new_category(owner, name="Netflix").status_code == 201
    assert new_category(owner, name="netflix").status_code == 409


def test_same_name_is_allowed_in_other_kind(couple):
    owner, _ = couple
    assert new_category(owner, kind="income", name="מזון").status_code == 201


def test_rename_to_existing_name_is_rejected(couple):
    owner, _ = couple
    food = owner.category_id("מזון")

    response = owner.patch(f"/api/categories/{food}", {"name": "מסעדות"})

    assert response.status_code == 409


@pytest.mark.parametrize(
    "overrides",
    [
        {"name": ""},
        {"name": "   "},
        {"name": "א" * 31},
        {"color": "#ff0000"},
        {"icon": "skull"},
        {"kind": "transfer"},
    ],
)
def test_create_validates_input(couple, overrides):
    owner, _ = couple
    assert new_category(owner, **overrides).status_code == 422


def test_unused_category_is_deleted(couple):
    owner, _ = couple
    created = new_category(owner).json()

    response = owner.delete(f"/api/categories/{created['id']}")

    assert response.json() == {"result": "deleted"}
    assert all(c["id"] != created["id"] for c in owner.ok("get", "/api/categories"))


def test_other_household_cannot_touch_categories(couple):
    owner, _ = couple
    food = owner.category_id("מזון")
    stranger = Partner()
    assert stranger.create_household().status_code == 201

    assert food not in {c["id"] for c in stranger.ok("get", "/api/categories")}
    assert stranger.patch(f"/api/categories/{food}", {"name": "שלי"}).status_code == 404
    assert stranger.delete(f"/api/categories/{food}").status_code == 404
    assert owner.category_id("מזון") == food


def test_categories_require_household():
    response = Partner().get("/api/categories")

    assert response.status_code == 409
    assert response.json() == {"detail": "no_household"}


def test_rls_blocks_writes_into_other_household(couple):
    owner, _ = couple
    stranger = Partner()
    assert stranger.create_household().status_code == 201
    owner_household = owner.ok("get", "/api/household")["household"]["id"]

    with pytest.raises(DBAPIError) as error, user_transaction(stranger.id) as session:
        session.execute(
            text(
                "INSERT INTO categories (household_id, kind, name, color, icon)"
                " VALUES (:household_id, 'expense', 'חדירה', 'red', 'zap')"
            ),
            {"household_id": owner_household},
        )
    assert isinstance(error.value.orig, pg_errors.InsufficientPrivilege)


@pytest.mark.parametrize("column", ["kind = 'income'", f"household_id = '{uuid4()}'"])
def test_kind_and_household_cannot_be_updated(couple, column):
    owner, _ = couple
    with pytest.raises(DBAPIError) as error, user_transaction(owner.id) as session:
        session.execute(text(f"UPDATE categories SET {column}"))
    assert isinstance(error.value.orig, pg_errors.InsufficientPrivilege)
