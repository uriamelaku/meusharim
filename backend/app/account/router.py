from typing import Annotated

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.account.supabase_auth import SupabaseAuthClient
from app.auth import CurrentUser, get_current_user
from app.db import user_transaction
from app.errors import AppError, InvalidError

router = APIRouter(prefix="/api/account", tags=["account"])


class AccountDeletion(BaseModel):
    """The user types their email and password again to confirm."""

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=200)


@router.post("/delete", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    body: AccountDeletion,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    supabase: SupabaseAuthClient,
) -> None:
    if not user.email or body.email.strip().casefold() != user.email.casefold():
        raise InvalidError("email_mismatch")
    if supabase.password_owner(user.email, body.password) != user.id:
        raise AppError("wrong_password", status.HTTP_403_FORBIDDEN)

    with user_transaction(user.id) as session:
        session.execute(text("SELECT app.delete_my_data()"))
        # Inside the transaction: if Supabase refuses, the data is not touched.
        supabase.delete_user(user.id)
