from uuid import UUID

from fastapi import APIRouter, status

from app.goals import service
from app.goals.schemas import DepositCreate, Goal, GoalCreate, GoalDeleted, GoalUpdate
from app.scope import Scope
from app.transactions.schemas import Transaction

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.get("")
def list_goals(scope: Scope) -> list[Goal]:
    return service.list_goals(scope)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_goal(body: GoalCreate, scope: Scope) -> Goal:
    return service.create_goal(scope, body)


@router.patch("/{goal_id}")
def update_goal(goal_id: UUID, body: GoalUpdate, scope: Scope) -> Goal:
    return service.update_goal(scope, goal_id, body)


@router.delete("/{goal_id}")
def delete_goal(goal_id: UUID, scope: Scope) -> GoalDeleted:
    return GoalDeleted(result=service.delete_goal(scope, goal_id))


@router.post("/{goal_id}/deposits", status_code=status.HTTP_201_CREATED)
def deposit(goal_id: UUID, body: DepositCreate, scope: Scope) -> Transaction:
    return service.deposit(scope, goal_id, body)
