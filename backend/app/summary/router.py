from fastapi import APIRouter

from app.periods import MonthParam, parse_month
from app.scope import Scope
from app.summary import service
from app.summary.schemas import MonthSummary

router = APIRouter(prefix="/api/summary", tags=["summary"])


@router.get("")
def month_summary(month: MonthParam, scope: Scope) -> MonthSummary:
    return service.month_summary(scope, parse_month(month))
