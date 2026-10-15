import logging
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.auth import CurrentUser, get_current_user
from app.budgets.router import router as budgets_router
from app.categories.router import router as categories_router
from app.config import settings
from app.db import engine
from app.errors import AppError, app_error_handler
from app.households.router import household_error_handler
from app.households.router import router as households_router
from app.households.service import HouseholdError
from app.reports.router import router as reports_router
from app.schedules.router import router as schedules_router
from app.summary.router import router as summary_router
from app.transactions.router import router as transactions_router

logger = logging.getLogger(__name__)

NO_DOCS = {"docs_url": None, "redoc_url": None, "openapi_url": None}

app = FastAPI(title="Meusharim API", **({} if settings.api_docs_enabled else NO_DOCS))
if settings.cors_allowed_origins:
    # Bearer tokens only, no cookies, so credentials stay off.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=600,
    )
app.include_router(households_router)
app.add_exception_handler(HouseholdError, household_error_handler)
app.add_exception_handler(AppError, app_error_handler)
app.include_router(categories_router)
app.include_router(transactions_router)
app.include_router(schedules_router)
app.include_router(budgets_router)
app.include_router(summary_router)
app.include_router(reports_router)


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
