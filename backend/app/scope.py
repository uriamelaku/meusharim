from dataclasses import dataclass
from datetime import date, datetime
from typing import Annotated
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import DbSession
from app.errors import AppError

HOUSEHOLD_TIME_ZONE = ZoneInfo("Asia/Jerusalem")


def get_today() -> date:
    """The household's current date. Tests override this dependency."""
    return datetime.now(HOUSEHOLD_TIME_ZONE).date()


@dataclass(frozen=True)
class HouseholdScope:
    """A request inside the caller's household: an RLS-bound session plus the household id."""

    session: Session
    household_id: UUID
    today: date


def get_household_scope(
    db: DbSession, today: Annotated[date, Depends(get_today)]
) -> HouseholdScope:
    household_id = db.scalar(
        text("SELECT household_id FROM household_members WHERE user_id = app.current_user_id()")
    )
    if household_id is None:
        raise AppError("no_household")
    scope = HouseholdScope(session=db, household_id=household_id, today=today)
    # Imported here: the schedules module itself depends on HouseholdScope.
    from app.schedules.service import record_due_occurrences

    # Every request sees schedule occurrences up to today already in the ledger.
    record_due_occurrences(scope)
    return scope


Scope = Annotated[HouseholdScope, Depends(get_household_scope)]
