from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from app.auth import CurrentUser, get_current_user
from app.db import DbSession, user_transaction
from app.households import service
from app.households.schemas import (
    HouseholdCreate,
    InvitationAccept,
    InvitationCreated,
    InvitationLookup,
    InvitationPreview,
    MemberUpdate,
    MyHousehold,
)

INVITATION_ATTEMPTS_PER_15_MINUTES = 10

ERROR_STATUS = {
    "not_authenticated": status.HTTP_401_UNAUTHORIZED,
    "already_member": status.HTTP_409_CONFLICT,
    "no_household": status.HTTP_409_CONFLICT,
    "household_full": status.HTTP_409_CONFLICT,
    "invitation_invalid": status.HTTP_404_NOT_FOUND,
    "invitation_used": status.HTTP_410_GONE,
    "invitation_expired": status.HTTP_410_GONE,
}

router = APIRouter(prefix="/api")


async def household_error_handler(_request: Request, error: Exception) -> JSONResponse:
    code = error.code if isinstance(error, service.HouseholdError) else "unknown"
    return JSONResponse(
        status_code=ERROR_STATUS.get(code, status.HTTP_400_BAD_REQUEST),
        content={"detail": code},
    )


def limit_invitation_attempts(user: Annotated[CurrentUser, Depends(get_current_user)]) -> None:
    # Own transaction, committed before the lookup, so failed attempts are counted too.
    with user_transaction(user.id) as session:
        attempts = service.register_invitation_attempt(session)
    if attempts > INVITATION_ATTEMPTS_PER_15_MINUTES:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")


InvitationRateLimit = Depends(limit_invitation_attempts)


@router.get("/household")
def get_household(db: DbSession) -> MyHousehold:
    return MyHousehold(household=service.get_my_household(db))


@router.post("/household", status_code=status.HTTP_201_CREATED)
def create_household(body: HouseholdCreate, db: DbSession) -> MyHousehold:
    service.create_household(db, body.name, body.display_name)
    if body.gender:
        service.set_my_gender(db, body.gender)
    return MyHousehold(household=service.get_my_household(db))


@router.patch("/household/me")
def update_me(body: MemberUpdate, db: DbSession) -> MyHousehold:
    household = service.get_my_household(db)
    if household is None:
        raise service.HouseholdError("no_household")
    service.set_my_gender(db, body.gender)
    return MyHousehold(household=service.get_my_household(db))


@router.post("/household/invitation", status_code=status.HTTP_201_CREATED)
def create_invitation(db: DbSession) -> InvitationCreated:
    return service.create_invitation(db)


@router.delete("/household/invitation", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invitation(db: DbSession) -> None:
    service.revoke_pending_invitation(db)


@router.post("/invitations/preview", dependencies=[InvitationRateLimit])
def preview_invitation(body: InvitationLookup, db: DbSession) -> InvitationPreview:
    return service.preview_invitation(db, body.token)


@router.post("/invitations/accept", dependencies=[InvitationRateLimit])
def accept_invitation(body: InvitationAccept, db: DbSession) -> MyHousehold:
    service.accept_invitation(db, body.token, body.display_name)
    if body.gender:
        service.set_my_gender(db, body.gender)
    return MyHousehold(household=service.get_my_household(db))
