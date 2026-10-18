"""Importing card and bank statements: normalized rows in, completed transactions out.

Reading each provider's file format (Cal, Max, Isracard, bank exports) is a separate,
later step; every parser hands this module the same normalized rows.
"""

from sqlalchemy import text

from app.imports.schemas import CommitRequest, CommitResult, ImportRow, PreviewRequest, PreviewRow
from app.scope import HouseholdScope
from app.transactions import service as transactions
from app.transactions.schemas import TransactionCreate

# Date, amount and kind: what makes two ledger rows look like the same charge.
Key = tuple


def _key(row: ImportRow) -> Key:
    return (row.occurred_on, row.amount, row.kind)


def _duplicate_flags(scope: HouseholdScope, rows: list[ImportRow]) -> list[bool]:
    """A row is a duplicate while the ledger already has unmatched transactions with the
    same date, amount and kind. Two equal rows in one file (two coffees on one day) count
    against two existing transactions, so the second is new if only one exists."""
    remaining: dict[Key, int] = {}
    flags = []
    for row in rows:
        key = _key(row)
        if key not in remaining:
            remaining[key] = scope.session.scalar(
                text(
                    "SELECT count(*) FROM transactions WHERE occurred_on = :occurred_on"
                    " AND amount = :amount AND kind = :kind"
                ),
                {"occurred_on": row.occurred_on, "amount": row.amount, "kind": row.kind},
            )
        flags.append(remaining[key] > 0)
        remaining[key] -= 1
    return flags


def _suggest_category(scope: HouseholdScope, row: ImportRow):
    if not row.description:
        return None
    return scope.session.scalar(
        text(
            "SELECT t.category_id FROM transactions t"
            " JOIN categories c ON c.id = t.category_id AND c.archived_at IS NULL"
            " WHERE t.kind = :kind AND lower(btrim(t.description)) = lower(:description)"
            " ORDER BY t.occurred_on DESC, t.created_at DESC LIMIT 1"
        ),
        {"kind": row.kind, "description": row.description},
    )


def preview(scope: HouseholdScope, body: PreviewRequest) -> list[PreviewRow]:
    """What the import would add: a category guess and a duplicate flag per row."""
    flags = _duplicate_flags(scope, body.rows)
    return [
        PreviewRow(
            **row.model_dump(),
            suggested_category_id=_suggest_category(scope, row),
            possible_duplicate=duplicate,
        )
        for row, duplicate in zip(body.rows, flags, strict=True)
    ]


def commit(scope: HouseholdScope, body: CommitRequest) -> CommitResult:
    """Records the approved rows as completed transactions, in one database transaction."""
    created = skipped = 0
    # Flags come from the ledger before this import, so rows added below never match.
    flags = _duplicate_flags(scope, body.rows)
    for row, duplicate in zip(body.rows, flags, strict=True):
        if duplicate and not body.include_duplicates:
            skipped += 1
            continue
        transactions.create_transaction(
            scope,
            TransactionCreate(
                kind=row.kind,
                amount=row.amount,
                occurred_on=row.occurred_on,
                category_id=row.category_id,
                description=row.description,
                status="completed",
            ),
        )
        created += 1
    return CommitResult(created=created, skipped_duplicates=skipped)
