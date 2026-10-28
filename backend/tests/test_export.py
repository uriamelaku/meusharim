import csv
import io

import pytest

from tests.partners import Partner, client, make_couple


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


def export(partner: Partner, **params):
    response = partner.get("/api/transactions/export", params=params)
    assert response.status_code == 200, response.text
    return response


def rows(partner: Partner, **params) -> list[list[str]]:
    body = export(partner, **params).content.decode("utf-8")
    assert body.startswith("﻿")  # Excel needs it to read Hebrew as UTF-8.
    return list(csv.reader(io.StringIO(body[1:])))


def test_export_is_a_csv_attachment(couple):
    owner, _ = couple
    response = export(owner)
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert response.headers["content-disposition"].startswith("attachment;")


def test_export_writes_hebrew_labels_and_exact_amounts(couple):
    owner, partner = couple
    add(owner, amount="1234.5", description="סופר", party_user_id=str(partner.id))
    add(
        owner,
        kind="income",
        amount="8000",
        category_id=owner.category_id("משכורת"),
        status="planned",
        occurred_on="2026-10-01",
    )

    header, *data = rows(owner)

    assert header == ["תאריך", "סוג", "קטגוריה", "תיאור", "סכום", "סטטוס", "מי שילם / קיבל", "מקור"]
    assert data == [
        ["2026-10-10", "הוצאה", "מזון", "סופר", "1234.50", "שולם", "נועה", ""],
        ["2026-10-01", "הכנסה", "משכורת", "", "8000.00", "עוד לא התקבל", "משותף", ""],
    ]


def test_export_in_english(couple):
    owner, _ = couple
    add(owner, status="planned")
    header, row = rows(owner, lang="en")
    assert header[0] == "Date"
    assert row[1:2] + row[5:7] == ["Expense", "Not paid yet", "Joint"]


def test_export_applies_the_list_filters_and_sort(couple):
    owner, _ = couple
    add(owner, amount="10", occurred_on="2026-09-30")
    add(owner, amount="20", occurred_on="2026-10-05", description="חלב")
    add(owner, amount="30", occurred_on="2026-10-20")

    october = rows(owner, **{"from": "2026-10-01", "to": "2026-10-31", "sort": "amount_asc"})
    assert [row[4] for row in october[1:]] == ["20.00", "30.00"]
    assert [row[4] for row in rows(owner, q="חלב")[1:]] == ["20.00"]


def test_export_names_schedule_rows(couple):
    owner, _ = couple
    owner.ok(
        "post",
        "/api/schedules",
        {
            "type": "installments",
            "category_id": owner.category_id("מזון"),
            "start_date": "2026-01-15",
            "total_amount": "300",
            "installments_count": 3,
        },
    )
    sources = [row[7] for row in rows(owner, sort="date_asc")[1:]]
    assert sources == ["תשלום 1 מתוך 3", "תשלום 2 מתוך 3", "תשלום 3 מתוך 3"]


@pytest.mark.parametrize("text", ["=1+1", "+972", "-5", "@SUM(A1)"])
def test_export_neutralizes_spreadsheet_formulas(couple, text):
    owner, _ = couple
    add(owner, description=text)
    assert rows(owner)[1][3] == f"'{text}"


def test_export_contains_only_the_callers_household():
    owner, _ = make_couple()
    other, _ = make_couple()
    add(owner, description="שלנו")
    add(other, description="של השכנים")

    assert [row[3] for row in rows(owner)[1:]] == ["שלנו"]


def test_export_requires_a_household():
    assert Partner().get("/api/transactions/export").status_code == 409


@pytest.mark.parametrize("params", [{"lang": "fr"}, {"from": "2026-13-01"}, {"sort": "random"}])
def test_export_rejects_invalid_parameters(couple, params):
    owner, _ = couple
    assert owner.get("/api/transactions/export", params=params).status_code == 422


def test_export_requires_sign_in():
    assert client.get("/api/transactions/export").status_code == 401
