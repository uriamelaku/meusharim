import hashlib
import secrets
from typing import Any
from uuid import UUID

from psycopg import errors as pg_errors
from sqlalchemy import text
from sqlalchemy.engine import Result
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.households.schemas import (
    Household,
    InvitationCreated,
    InvitationPreview,
    Member,
    PendingInvitation,
)


class HouseholdError(Exception):
    """A business rule rejected the request. `code` is raised by the app.* SQL functions."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def hash_token(token: str) -> bytes:
    return hashlib.sha256(token.encode()).digest()


def _call(session: Session, sql: str, params: dict[str, Any]) -> Result:
    """Runs an app.* function, translating its business errors into HouseholdError."""
    try:
        return session.execute(text(sql), params)
    except DBAPIError as error:
        if isinstance(error.orig, pg_errors.RaiseException):
            raise HouseholdError(error.orig.diag.message_primary or "unknown") from error
        # The only unique constraint these functions can hit concurrently is one
        # household per user: the same user created or joined twice at once.
        if isinstance(error.orig, pg_errors.UniqueViolation):
            raise HouseholdError("already_member") from error
        raise


def get_my_household(session: Session) -> Household | None:
    # RLS limits every query below to the caller's own household.
    row = session.execute(text("SELECT id, name FROM households")).one_or_none()
    if row is None:
        return None
    members = session.execute(
        text(
            "SELECT user_id, display_name, joined_at FROM household_members"
            " WHERE household_id = :household_id ORDER BY joined_at"
        ),
        {"household_id": row.id},
    ).all()
    pending = session.execute(
        text(
            "SELECT expires_at FROM household_invitations"
            " WHERE household_id = :household_id AND accepted_at IS NULL AND expires_at > now()"
        ),
        {"household_id": row.id},
    ).one_or_none()
    return Household(
        id=row.id,
        name=row.name,
        members=[Member.model_validate(member, from_attributes=True) for member in members],
        pending_invitation=PendingInvitation(expires_at=pending.expires_at) if pending else None,
    )


def create_household(session: Session, name: str, display_name: str) -> UUID:
    return _call(
        session,
        "SELECT app.create_household(:name, :display_name)",
        {"name": name, "display_name": display_name},
    ).scalar_one()


def create_invitation(session: Session) -> InvitationCreated:
    token = secrets.token_urlsafe(32)
    expires_at = _call(
        session, "SELECT app.create_invitation(:token_hash)", {"token_hash": hash_token(token)}
    ).scalar_one()
    return InvitationCreated(token=token, expires_at=expires_at)


def revoke_pending_invitation(session: Session) -> None:
    session.execute(text("DELETE FROM household_invitations WHERE accepted_at IS NULL"))


def preview_invitation(session: Session, token: str) -> InvitationPreview:
    row = _call(
        session,
        "SELECT household_name, inviter_name FROM app.preview_invitation(:token_hash)",
        {"token_hash": hash_token(token)},
    ).one()
    return InvitationPreview(household_name=row.household_name, inviter_name=row.inviter_name)


def accept_invitation(session: Session, token: str, display_name: str) -> UUID:
    return _call(
        session,
        "SELECT app.accept_invitation(:token_hash, :display_name)",
        {"token_hash": hash_token(token), "display_name": display_name},
    ).scalar_one()


def register_invitation_attempt(session: Session) -> int:
    return session.execute(text("SELECT app.register_invitation_attempt()")).scalar_one()
