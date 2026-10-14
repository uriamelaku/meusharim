from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, StringConstraints

HouseholdName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)
]
DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
# secrets.token_urlsafe(32) produces 43 URL-safe characters.
InvitationToken = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_-]{43}$")]


class HouseholdCreate(BaseModel):
    name: HouseholdName
    display_name: DisplayName


class Member(BaseModel):
    user_id: UUID
    display_name: str
    joined_at: datetime


class PendingInvitation(BaseModel):
    expires_at: datetime


class Household(BaseModel):
    id: UUID
    name: str
    members: list[Member]
    pending_invitation: PendingInvitation | None


class MyHousehold(BaseModel):
    household: Household | None


class InvitationCreated(BaseModel):
    """The only response that ever contains the raw token; it is not stored server-side."""

    token: str
    expires_at: datetime


class InvitationLookup(BaseModel):
    token: InvitationToken


class InvitationPreview(BaseModel):
    household_name: str
    inviter_name: str | None


class InvitationAccept(BaseModel):
    token: InvitationToken
    display_name: DisplayName
