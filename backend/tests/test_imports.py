import pytest

from tests.partners import Partner, make_couple


@pytest.fixture
def couple():
    return make_couple()


def row(day="2026-10-05", amount="45.90", kind="expense", description="שופרסל"):
    return {"occurred_on": day, "amount": amount, "kind": kind, "description": description}


def preview(partner: Partner, *rows, source="cal"):
    return partner.ok("post", "/api/imports/preview", {"source": source, "rows": list(rows)})


def commit(partner: Partner, *rows, include_duplicates=False):
    return partner.ok(
        "post",
        "/api/imports/commit",
        {"source": "max", "rows": list(rows), "include_duplicates": include_duplicates},
    )


def test_preview_suggests_category_from_history(couple):
    owner, partner = couple
    food = owner.category_id("מזון")
    owner.ok("post", "/api/transactions", {**row(day="2026-09-01", amount="10"),
             "status": "completed", "category_id": food})  # fmt: skip

    [suggested, unknown] = preview(partner, row(description=" שופרסל "), row(description="חדש"))

    assert suggested["suggested_category_id"] == food
    assert unknown["suggested_category_id"] is None
    assert suggested["possible_duplicate"] is False


def test_commit_creates_completed_transactions(couple):
    owner, partner = couple
    food = owner.category_id("מזון")
    salary = owner.category_id("משכורת")

    result = commit(
        owner,
        {**row(), "category_id": food},
        {**row(amount="12000", kind="income", description="משכורת"), "category_id": salary},
    )

    assert result == {"created": 2, "skipped_duplicates": 0}
    summary = partner.ok("get", "/api/summary", params={"month": "2026-10"})
    assert (summary["expense"]["actual"], summary["income"]["actual"]) == ("45.90", "12000.00")


def test_duplicates_are_flagged_and_skipped(couple):
    owner, _ = couple
    food = owner.category_id("מזון")
    commit(owner, {**row(), "category_id": food})

    [flagged] = preview(owner, row())
    assert flagged["possible_duplicate"] is True
    assert commit(owner, {**row(), "category_id": food}) == {"created": 0, "skipped_duplicates": 1}
    assert commit(owner, {**row(), "category_id": food}, include_duplicates=True)["created"] == 1


def test_two_equal_rows_against_one_existing(couple):
    owner, _ = couple
    food = owner.category_id("מזון")
    commit(owner, {**row(), "category_id": food})  # one coffee already recorded

    flags = [r["possible_duplicate"] for r in preview(owner, row(), row())]
    assert flags == [True, False]
    result = commit(owner, {**row(), "category_id": food}, {**row(), "category_id": food})
    assert result == {"created": 1, "skipped_duplicates": 1}


def test_commit_is_all_or_nothing(couple):
    owner, _ = couple
    food = owner.category_id("מזון")
    salary = owner.category_id("משכורת")
    response = owner.post(
        "/api/imports/commit",
        {"source": "bank", "rows": [{**row(), "category_id": food},
                                    {**row(amount="5"), "category_id": salary}]},
    )  # fmt: skip
    assert response.status_code == 422  # income category on an expense
    summary = owner.ok("get", "/api/summary", params={"month": "2026-10"})
    assert summary["expense"]["actual"] == "0.00"


@pytest.mark.parametrize(
    "body",
    [
        {"source": "cal", "rows": []},
        {"source": "unknown", "rows": [row()]},
        {"source": "cal", "rows": [row(amount="-5")]},
        {"source": "cal", "rows": [row(day="1800-01-01")]},
        {"source": "cal", "rows": [row()] * 501},
    ],
)
def test_input_is_validated(couple, body):
    owner, _ = couple
    assert owner.post("/api/imports/preview", body).status_code == 422


def test_cannot_use_other_households_category(couple):
    owner, _ = couple
    stranger = Partner()
    stranger.create_household()
    response = stranger.post(
        "/api/imports/commit",
        {"source": "cal", "rows": [{**row(), "category_id": owner.category_id("מזון")}]},
    )
    assert response.status_code == 422


def test_preview_ignores_other_households_history(couple):
    owner, _ = couple
    commit(owner, {**row(), "category_id": owner.category_id("מזון")})
    stranger = Partner()
    stranger.create_household()

    [result] = preview(stranger, row())

    assert result["suggested_category_id"] is None
    assert result["possible_duplicate"] is False


def test_commit_records_who_paid(couple):
    owner, partner = couple
    rows = [{**row(), "category_id": owner.category_id("מזון")}]

    owner.ok("post", "/api/imports/commit", {"source": "cal", "rows": rows,
             "party_user_id": str(partner.id)})  # fmt: skip

    [transaction] = owner.ok("get", "/api/transactions", params={"month": "2026-10"})["items"]
    assert transaction["party_user_id"] == str(partner.id)


def test_commit_rejects_a_payer_outside_the_household(couple):
    owner, _ = couple
    rows = [{**row(), "category_id": owner.category_id("מזון")}]
    response = owner.post(
        "/api/imports/commit", {"source": "cal", "rows": rows, "party_user_id": str(Partner().id)}
    )
    assert response.status_code == 422
