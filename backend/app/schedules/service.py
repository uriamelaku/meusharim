from datetime import date, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Row

from app.errors import AppError, InvalidError, NotFoundError
from app.schedules.engine import ScheduleRule
from app.schedules.schemas import (
    InstallmentsCreate,
    Occurrence,
    RecurringCreate,
    Schedule,
    ScheduleDetail,
    ScheduleUpdate,
)
from app.scope import HouseholdScope
from app.transactions.schemas import CategoryRef
from app.transactions.service import check_category, check_party

UPCOMING_IN_DETAIL = 12

SELECT_SCHEDULE = """
SELECT s.*,
       c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
       c.archived_at IS NOT NULL AS category_archived,
       coalesce(t.recorded_count, 0) AS recorded_count,
       coalesce(t.completed_count, 0) AS completed_count,
       coalesce(t.completed_amount, 0)::numeric(12, 2) AS completed_amount
FROM schedules s
JOIN categories c ON c.id = s.category_id
LEFT JOIN LATERAL (
  SELECT count(*) AS recorded_count,
         count(*) FILTER (WHERE status = 'completed') AS completed_count,
         sum(amount) FILTER (WHERE status = 'completed') AS completed_amount
  FROM transactions WHERE schedule_id = s.id
) t ON true
"""


def rule_of(row: Row) -> ScheduleRule:
    return ScheduleRule(
        type=row.type,
        frequency=row.frequency,
        start_date=row.start_date,
        end_date=row.end_date,
        amount=row.amount,
        total_amount=row.total_amount,
        installments_count=row.installments_count,
    )


def category_of(row: Row) -> CategoryRef:
    return CategoryRef(
        id=row.category_id,
        name=row.category_name,
        color=row.category_color,
        icon=row.category_icon,
        archived=row.category_archived,
    )


def occurrence_of(row: Row, sequence_no: int, day: date) -> Occurrence:
    return Occurrence(
        schedule_id=row.id,
        type=row.type,
        kind=row.kind,
        sequence_no=sequence_no,
        installments_count=row.installments_count,
        occurred_on=day,
        amount=rule_of(row).amount_of(sequence_no),
        category=category_of(row),
        description=row.description,
        party_user_id=row.party_user_id,
    )


# --- Writing due occurrences -------------------------------------------------


def record_due_occurrences(scope: HouseholdScope) -> None:
    """Writes every occurrence whose date has arrived into transactions.

    Runs at the start of each request. Locking the schedules (always in id order)
    makes concurrent requests wait instead of writing the same occurrence twice; the
    unique (schedule_id, sequence_no) constraint is the final guard.
    """
    schedules = scope.session.execute(
        text(
            "SELECT * FROM schedules WHERE status = 'active' AND household_id = :household_id"
            " ORDER BY id FOR UPDATE"
        ),
        {"household_id": scope.household_id},
    ).all()
    for schedule in schedules:
        rule = rule_of(schedule)
        due = list(rule.occurrences(schedule.next_sequence, scope.today))
        if not due:
            continue
        for sequence_no, day in due:
            scope.session.execute(
                text(
                    "INSERT INTO transactions (household_id, kind, amount, occurred_on,"
                    " category_id, description, status, party_user_id, schedule_id, sequence_no)"
                    " VALUES (:household_id, :kind, :amount, :occurred_on, :category_id,"
                    " :description, :status, :party_user_id, :schedule_id, :sequence_no)"
                    " ON CONFLICT (schedule_id, sequence_no) DO NOTHING"
                ),
                {
                    "household_id": scope.household_id,
                    "kind": schedule.kind,
                    "amount": rule.amount_of(sequence_no),
                    "occurred_on": day,
                    "category_id": schedule.category_id,
                    "description": schedule.description,
                    "status": "completed" if schedule.auto_confirm else "planned",
                    "party_user_id": schedule.party_user_id,
                    "schedule_id": schedule.id,
                    "sequence_no": sequence_no,
                },
            )
        scope.session.execute(
            text("UPDATE schedules SET next_sequence = :next WHERE id = :id"),
            {"next": due[-1][0] + 1, "id": schedule.id},
        )


# --- Reading -----------------------------------------------------------------


def future_occurrences(
    scope: HouseholdScope, date_from: date, date_to: date, kind: str | None = None
) -> list[Occurrence]:
    """Occurrences of active schedules that are not recorded yet, between the two dates."""
    rows = scope.session.execute(text(f"{SELECT_SCHEDULE} WHERE s.status = 'active'")).all()
    occurrences = []
    for row in rows:
        if kind and row.kind != kind:
            continue
        for sequence_no, day in rule_of(row).occurrences(row.next_sequence, date_to):
            if day >= date_from:
                occurrences.append(occurrence_of(row, sequence_no, day))
    occurrences.sort(key=lambda o: (o.occurred_on, o.amount))
    return occurrences


def to_schedule(row: Row) -> Schedule:
    rule = rule_of(row)
    finished = not rule.has_occurrence(row.next_sequence)
    next_occurrence = None
    if row.status == "active" and not finished:
        next_occurrence = occurrence_of(row, row.next_sequence, rule.date_of(row.next_sequence))
    return Schedule(
        id=row.id,
        type=row.type,
        kind=row.kind,
        category=category_of(row),
        description=row.description,
        party_user_id=row.party_user_id,
        frequency=row.frequency,
        start_date=row.start_date,
        end_date=row.end_date,
        amount=row.amount,
        total_amount=row.total_amount,
        installments_count=row.installments_count,
        status=row.status,
        auto_confirm=row.auto_confirm,
        created_by=row.created_by,
        recorded_count=row.recorded_count,
        completed_count=row.completed_count,
        completed_amount=row.completed_amount,
        remaining_amount=(
            row.total_amount - row.completed_amount if row.type == "installments" else None
        ),
        next_occurrence=next_occurrence,
        finished=finished,
    )


def list_schedules(scope: HouseholdScope, schedule_type: str | None) -> list[Schedule]:
    where, params = ("", {})
    if schedule_type:
        where, params = " WHERE s.type = :type", {"type": schedule_type}
    rows = scope.session.execute(
        text(
            f"{SELECT_SCHEDULE}{where}"
            " ORDER BY CASE s.status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,"
            " s.created_at DESC"
        ),
        params,
    ).all()
    return [to_schedule(row) for row in rows]


def _get_row(scope: HouseholdScope, schedule_id: UUID) -> Row:
    row = scope.session.execute(
        text(f"{SELECT_SCHEDULE} WHERE s.id = :id"), {"id": schedule_id}
    ).one_or_none()
    if row is None:
        raise NotFoundError("schedule_not_found")
    return row


def get_schedule(scope: HouseholdScope, schedule_id: UUID) -> ScheduleDetail:
    row = _get_row(scope, schedule_id)
    schedule = to_schedule(row)
    upcoming: list[Occurrence] = []
    if row.status == "active":
        rule = rule_of(row)
        sequence_no = row.next_sequence
        while rule.has_occurrence(sequence_no) and len(upcoming) < UPCOMING_IN_DETAIL:
            upcoming.append(occurrence_of(row, sequence_no, rule.date_of(sequence_no)))
            sequence_no += 1
    return ScheduleDetail(**schedule.model_dump(), upcoming=upcoming)


# --- Writing -----------------------------------------------------------------


def _insert(scope: HouseholdScope, values: dict[str, Any]) -> UUID:
    columns = ", ".join(values)
    placeholders = ", ".join(f":{column}" for column in values)
    return scope.session.execute(
        text(
            f"INSERT INTO schedules (household_id, {columns})"
            f" VALUES (:household_id, {placeholders}) RETURNING id"
        ),
        {"household_id": scope.household_id, **values},
    ).scalar_one()


def create_schedule(
    scope: HouseholdScope, body: RecurringCreate | InstallmentsCreate
) -> ScheduleDetail:
    check_category(scope, body.category_id, body.kind)
    check_party(scope, body.party_user_id)
    values = body.model_dump()
    if isinstance(body, InstallmentsCreate):
        values["frequency"] = "monthly"
    schedule_id = _insert(scope, values)
    # Occurrences dated today or earlier are written right away.
    record_due_occurrences(scope)
    return get_schedule(scope, schedule_id)


def _lock(scope: HouseholdScope, schedule_id: UUID) -> Row:
    row = scope.session.execute(
        text("SELECT * FROM schedules WHERE id = :id FOR UPDATE"), {"id": schedule_id}
    ).one_or_none()
    if row is None:
        raise NotFoundError("schedule_not_found")
    if row.status == "cancelled":
        raise AppError("schedule_cancelled")
    return row


def _set(scope: HouseholdScope, schedule_id: UUID, changes: dict[str, Any]) -> None:
    assignments = ", ".join(f"{column} = :{column}" for column in changes)
    scope.session.execute(
        text(f"UPDATE schedules SET {assignments} WHERE id = :id"), {"id": schedule_id, **changes}
    )


TIMING_FIELDS = {"frequency", "start_date"}
INSTALLMENT_PLAN_FIELDS = {"start_date", "total_amount", "installments_count"}


def update_schedule(
    scope: HouseholdScope, schedule_id: UUID, body: ScheduleUpdate
) -> ScheduleDetail:
    """Updates future occurrences. Returns the schedule that now carries them.

    Changing the timing of a recurring schedule that already has recorded occurrences
    ends it the day before the new start date and continues in a new schedule, so the
    recorded history keeps its sequence numbers.
    """
    row = _lock(scope, schedule_id)
    sent = body.model_dump(exclude_unset=True)
    # Only party_user_id and end_date may be cleared with null; other nulls mean "unchanged".
    changes = {k: v for k, v in sent.items() if v is not None or k in ("party_user_id", "end_date")}

    if "category_id" in changes:
        check_category(scope, changes["category_id"], row.kind)
    if "party_user_id" in changes:
        check_party(scope, changes["party_user_id"])

    started = row.next_sequence > 1
    if row.type == "installments":
        changes.pop("frequency", None)
        changes.pop("amount", None)
        changes.pop("end_date", None)
        current = row._mapping
        plan_changed = any(
            changes[f] != current[f] for f in INSTALLMENT_PLAN_FIELDS if f in changes
        )
        if plan_changed and started:
            raise AppError("installments_started")
        total = changes.get("total_amount", row.total_amount)
        count = changes.get("installments_count", row.installments_count)
        if total * 100 < count:
            raise InvalidError("installments_too_small")
    else:
        changes.pop("total_amount", None)
        changes.pop("installments_count", None)
        start = changes.get("start_date", row.start_date)
        end = changes.get("end_date", row.end_date)
        if end is not None and end < start:
            raise InvalidError("end_before_start")
        timing_changed = any(changes[f] != row._mapping[f] for f in TIMING_FIELDS if f in changes)
        if timing_changed and started:
            return _continue_in_new_schedule(scope, row, changes)

    if changes:
        _set(scope, schedule_id, changes)
    record_due_occurrences(scope)
    return get_schedule(scope, schedule_id)


def _continue_in_new_schedule(
    scope: HouseholdScope, row: Row, changes: dict[str, Any]
) -> ScheduleDetail:
    rule = rule_of(row)
    last_recorded = rule.date_of(row.next_sequence - 1)
    new_start = changes.get("start_date", row.start_date)
    if new_start <= last_recorded:
        raise InvalidError("start_before_last_occurrence")
    _set(scope, row.id, {"end_date": new_start - timedelta(days=1)})
    values = {
        column: changes.get(column, row._mapping[column])
        for column in (
            "type", "kind", "category_id", "description", "party_user_id", "frequency",
            "start_date", "end_date", "amount", "auto_confirm",
        )
    }  # fmt: skip
    values["start_date"] = new_start
    if values["end_date"] is not None and values["end_date"] < new_start:
        values["end_date"] = None
    new_id = _insert(scope, values)
    if row.status == "paused":
        _set(scope, new_id, {"status": "paused"})
    record_due_occurrences(scope)
    return get_schedule(scope, new_id)


def pause_schedule(scope: HouseholdScope, schedule_id: UUID) -> ScheduleDetail:
    _lock(scope, schedule_id)
    _set(scope, schedule_id, {"status": "paused"})
    return get_schedule(scope, schedule_id)


def resume_schedule(scope: HouseholdScope, schedule_id: UUID) -> ScheduleDetail:
    """Occurrences that fell inside the pause are skipped, not written retroactively."""
    row = _lock(scope, schedule_id)
    if row.status == "paused":
        next_sequence = rule_of(row).first_sequence_on_or_after(row.next_sequence, scope.today)
        _set(scope, schedule_id, {"status": "active", "next_sequence": next_sequence})
        record_due_occurrences(scope)
    return get_schedule(scope, schedule_id)


def cancel_schedule(scope: HouseholdScope, schedule_id: UUID) -> ScheduleDetail:
    """Stops future occurrences. Recorded transactions are kept."""
    _lock(scope, schedule_id)
    _set(scope, schedule_id, {"status": "cancelled"})
    return get_schedule(scope, schedule_id)
