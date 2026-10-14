from fastapi import APIRouter

from app.budgets import service
from app.budgets.schemas import BudgetInput, BudgetMonth
from app.periods import MonthParam, parse_month
from app.scope import Scope

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("")
def get_budget(month: MonthParam, scope: Scope) -> BudgetMonth:
    return service.get_budget(scope, parse_month(month))


@router.put("")
def save_budget(month: MonthParam, body: BudgetInput, scope: Scope) -> BudgetMonth:
    return service.save_budget(scope, parse_month(month), body)


@router.post("/copy-previous")
def copy_previous_budget(month: MonthParam, scope: Scope) -> BudgetMonth:
    return service.copy_previous_budget(scope, parse_month(month))
