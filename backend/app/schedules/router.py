from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.categories.schemas import Kind
from app.errors import InvalidError
from app.money import LedgerDate
from app.schedules import service
from app.schedules.schemas import (
    Occurrence,
    Schedule,
    ScheduleCreate,
    ScheduleDetail,
    ScheduleType,
    ScheduleUpdate,
)
from app.scope import Scope

router = APIRouter(prefix="/api/schedules", tags=["schedules"])

MAX_OCCURRENCE_RANGE_DAYS = 366 * 5


@router.get("")
def list_schedules(scope: Scope, type: ScheduleType | None = None) -> list[Schedule]:
    return service.list_schedules(scope, type)


@router.get("/occurrences")
def list_occurrences(
    scope: Scope,
    date_from: Annotated[LedgerDate, Query(alias="from")],
    date_to: Annotated[LedgerDate, Query(alias="to")],
    kind: Kind | None = None,
) -> list[Occurrence]:
    """Future occurrences that are not recorded yet: planned money that is not in the ledger."""
    if date_to < date_from or (date_to - date_from).days > MAX_OCCURRENCE_RANGE_DAYS:
        raise InvalidError("invalid_range")
    return service.future_occurrences(scope, date_from, date_to, kind)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_schedule(body: ScheduleCreate, scope: Scope) -> ScheduleDetail:
    return service.create_schedule(scope, body)


@router.get("/{schedule_id}")
def get_schedule(schedule_id: UUID, scope: Scope) -> ScheduleDetail:
    return service.get_schedule(scope, schedule_id)


@router.patch("/{schedule_id}")
def update_schedule(schedule_id: UUID, body: ScheduleUpdate, scope: Scope) -> ScheduleDetail:
    return service.update_schedule(scope, schedule_id, body)


@router.post("/{schedule_id}/pause")
def pause_schedule(schedule_id: UUID, scope: Scope) -> ScheduleDetail:
    return service.pause_schedule(scope, schedule_id)


@router.post("/{schedule_id}/resume")
def resume_schedule(schedule_id: UUID, scope: Scope) -> ScheduleDetail:
    return service.resume_schedule(scope, schedule_id)


@router.post("/{schedule_id}/cancel")
def cancel_schedule(schedule_id: UUID, scope: Scope) -> ScheduleDetail:
    return service.cancel_schedule(scope, schedule_id)
