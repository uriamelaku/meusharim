import logging
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.auth import CurrentUser, get_current_user
from app.categories.router import router as categories_router
from app.db import engine
from app.errors import AppError, app_error_handler
from app.households.router import household_error_handler
from app.households.router import router as households_router
from app.households.service import HouseholdError
from app.transactions.router import router as transactions_router

logger = logging.getLogger(__name__)

app = FastAPI(title="Meusharim API")
app.include_router(households_router)
app.add_exception_handler(HouseholdError, household_error_handler)
app.add_exception_handler(AppError, app_error_handler)
app.include_router(categories_router)
app.include_router(transactions_router)


@app.get("/api/health")
def health() -> JSONResponse:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        logger.exception("Database health check failed")
        return JSONResponse(status_code=503, content={"status": "error", "database": "unavailable"})
    return JSONResponse(content={"status": "ok", "database": "ok"})


@app.get("/api/me")
def me(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    return user
