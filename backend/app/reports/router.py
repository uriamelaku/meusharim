from typing import Annotated, Literal

from fastapi import APIRouter, Query

from app.periods import MONTH_PATTERN, MonthParam, parse_month
from app.reports import service
from app.reports.schemas import MonthInsights, Report
from app.scope import Scope

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("")
def get_report(
    scope: Scope,
    date_from: Annotated[str, Query(alias="from", pattern=MONTH_PATTERN)],
    date_to: Annotated[str, Query(alias="to", pattern=MONTH_PATTERN)],
) -> Report:
    """Actual and planned totals per month, per category and per year for a range of months."""
    return service.build_report(scope, parse_month(date_from), parse_month(date_to))


@router.get("/insights")
def get_insights(
    month: MonthParam,
    scope: Scope,
    compare: Literal["previous_month", "last_year"] = "previous_month",
) -> MonthInsights:
    """A month against the previous one (or the same month a year earlier), the month-end
    forecast and the year's savings."""
    months_back = 12 if compare == "last_year" else 1
    return service.month_insights(scope, parse_month(month), months_back)
