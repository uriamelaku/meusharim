"""Idempotent creation: an optional client request id on transactions and schedules.

The client sends a new UUID with each create request and the same UUID when it repeats
it (double click, retry after a lost response). The unique constraint lets only the
first one insert, even when the requests run in parallel.

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-15
"""

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


UPGRADE_SQL = r"""
ALTER TABLE public.transactions
  ADD COLUMN request_id uuid,
  ADD CONSTRAINT transactions_one_row_per_request UNIQUE (household_id, request_id);
ALTER TABLE public.schedules
  ADD COLUMN request_id uuid,
  ADD CONSTRAINT schedules_one_row_per_request UNIQUE (household_id, request_id);

GRANT INSERT (request_id) ON public.transactions, public.schedules TO meusharim_app;
"""

DOWNGRADE_SQL = r"""
ALTER TABLE public.schedules DROP COLUMN request_id;
ALTER TABLE public.transactions DROP COLUMN request_id;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
