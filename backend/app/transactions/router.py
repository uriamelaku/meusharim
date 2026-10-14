from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.categories.schemas import Kind
from app.scope import Scope
from app.transactions import service
from app.transactions.schemas import (
    ConfirmRequest,
    ConfirmResult,
    SortOrder,
    Status,
    Transaction,
    TransactionCreate,
    TransactionPage,
    TransactionUpdate,
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

MAX_PAGE_SIZE = 100


@router.get("")
def list_transactions(
    scope: Scope,
    date_from: Annotated[date | None, Query(alias="from")] = None,
    date_to: Annotated[date | None, Query(alias="to")] = None,
    kind: Kind | None = None,
    status_filter: Annotated[Status | None, Query(alias="status")] = None,
    category_id: UUID | None = None,
    party: Annotated[UUID | Literal["joint"] | None, Query()] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    sort: SortOrder = "date_desc",
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TransactionPage:
    filters = service.TransactionFilters(
        date_from=date_from,
        date_to=date_to,
        kind=kind,
        status=status_filter,
        category_id=category_id,
        party=str(party) if party else None,
        query=q,
    )
    return service.list_transactions(scope, filters, sort, limit, offset)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_transaction(body: TransactionCreate, scope: Scope) -> Transaction:
    return service.create_transaction(scope, body)


@router.post("/confirm")
def confirm_transactions(body: ConfirmRequest, scope: Scope) -> ConfirmResult:
    return ConfirmResult(confirmed=service.confirm_transactions(scope, body.ids))


@router.get("/{transaction_id}")
def get_transaction(transaction_id: UUID, scope: Scope) -> Transaction:
    return service.get_transaction(scope, transaction_id)


@router.patch("/{transaction_id}")
def update_transaction(transaction_id: UUID, body: TransactionUpdate, scope: Scope) -> Transaction:
    return service.update_transaction(scope, transaction_id, body)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: UUID, scope: Scope) -> None:
    service.delete_transaction(scope, transaction_id)
