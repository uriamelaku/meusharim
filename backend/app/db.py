import json
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.auth import CurrentUser, get_current_user
from app.config import settings

# prepare_threshold=None: Supabase's transaction-mode pooler does not support
# prepared statements. Harmless on a direct local connection.
# hide_parameters: keep query values (e.g. token hashes) out of error messages and logs.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    hide_parameters=True,
    connect_args={"prepare_threshold": None},
)


# The role every user request runs as. Only the backend's connection can switch to it;
# Supabase's `authenticated` role (its Data API) has no access to app data.
APP_ROLE = "meusharim_app"


@contextmanager
def user_transaction(user_id: UUID) -> Iterator[Session]:
    """A transaction that runs as APP_ROLE, so RLS applies to `user_id`.

    SET LOCAL and set_config(..., true) last only until the transaction ends,
    so pooled connections never leak one user's context to another request.
    """
    claims = json.dumps({"sub": str(user_id)})
    with Session(engine) as session, session.begin():
        session.execute(text(f"SET LOCAL ROLE {APP_ROLE}"))
        session.execute(
            text("SELECT set_config('request.jwt.claims', :claims, true)"), {"claims": claims}
        )
        yield session


def get_db(user: Annotated[CurrentUser, Depends(get_current_user)]) -> Iterator[Session]:
    with user_transaction(user.id) as session:
        yield session


DbSession = Annotated[Session, Depends(get_db)]
