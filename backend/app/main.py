import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db import engine

logger = logging.getLogger(__name__)

app = FastAPI(title="Meusharim API")


@app.get("/api/health")
def health() -> JSONResponse:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        logger.exception("Database health check failed")
        return JSONResponse(status_code=503, content={"status": "error", "database": "unavailable"})
    return JSONResponse(content={"status": "ok", "database": "ok"})
