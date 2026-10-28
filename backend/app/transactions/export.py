"""Transactions as a CSV file for spreadsheets (Excel, Google Sheets)."""

import csv
import io
from uuid import UUID

from sqlalchemy import text

from app.households.schemas import Language
from app.scope import HouseholdScope
from app.transactions.schemas import SortOrder, Transaction
from app.transactions.service import TransactionFilters, list_all_transactions

# Labels match the app's wording (frontend/src/transactions/labels.ts).
LABELS: dict[Language, dict[str, str]] = {
    "he": {
        "date": "תאריך",
        "kind": "סוג",
        "category": "קטגוריה",
        "description": "תיאור",
        "amount": "סכום",
        "status": "סטטוס",
        "party": "מי שילם / קיבל",
        "source": "מקור",
        "expense": "הוצאה",
        "income": "הכנסה",
        "expense_completed": "שולם",
        "expense_planned": "עוד לא שולם",
        "income_completed": "התקבל",
        "income_planned": "עוד לא התקבל",
        "joint": "משותף",
        "former_member": "מי שעזב את הבית",
        "recurring": "הוראת קבע",
        "installment": "תשלום {n} מתוך {count}",
    },
    "en": {
        "date": "Date",
        "kind": "Type",
        "category": "Category",
        "description": "Description",
        "amount": "Amount",
        "status": "Status",
        "party": "Paid / received by",
        "source": "Source",
        "expense": "Expense",
        "income": "Income",
        "expense_completed": "Paid",
        "expense_planned": "Not paid yet",
        "income_completed": "Received",
        "income_planned": "Not received yet",
        "joint": "Joint",
        "former_member": "Former member",
        "recurring": "Recurring",
        "installment": "Installment {n} of {count}",
    },
}

COLUMNS = ["date", "kind", "category", "description", "amount", "status", "party", "source"]

# A cell starting with one of these is run as a formula by spreadsheet apps.
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _safe(value: str) -> str:
    """Keeps user text (descriptions, names) from being read as a spreadsheet formula."""
    return f"'{value}" if value.startswith(FORMULA_PREFIXES) else value


def _member_names(scope: HouseholdScope) -> dict[UUID, str]:
    rows = scope.session.execute(
        text("SELECT user_id, display_name FROM household_members WHERE household_id = :id"),
        {"id": scope.household_id},
    ).all()
    return {row.user_id: row.display_name for row in rows}


def _row(transaction: Transaction, labels: dict[str, str], names: dict[UUID, str]) -> list[str]:
    if transaction.party_user_id is None:
        party = labels["joint"]
    else:
        party = names.get(transaction.party_user_id, labels["former_member"])
    schedule = transaction.schedule
    if schedule is None:
        source = ""
    elif schedule.type == "installments":
        source = labels["installment"].format(
            n=schedule.sequence_no, count=schedule.installments_count
        )
    else:
        source = labels["recurring"]
    return [
        transaction.occurred_on.isoformat(),
        labels[transaction.kind],
        _safe(transaction.category.name),
        _safe(transaction.description),
        f"{transaction.amount:.2f}",
        labels[f"{transaction.kind}_{transaction.status}"],
        _safe(party),
        source,
    ]


def export_csv(
    scope: HouseholdScope, filters: TransactionFilters, sort: SortOrder, language: Language
) -> str:
    """The CSV text, starting with a byte order mark so Excel reads Hebrew as UTF-8."""
    labels = LABELS[language]
    names = _member_names(scope)
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow([labels[column] for column in COLUMNS])
    for transaction in list_all_transactions(scope, filters, sort):
        writer.writerow(_row(transaction, labels, names))
    return "﻿" + output.getvalue()
