"""Category position, so a household can choose the order of its categories.

Existing categories keep the order they had (creation time, then name). New categories
go to the end; the default categories of a new household all start at 0 and fall back
to that same order.

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-01
"""

from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


UPGRADE_SQL = r"""
ALTER TABLE public.categories ADD COLUMN position integer NOT NULL DEFAULT 0;

UPDATE public.categories c
SET position = ordered.position
FROM (
  SELECT id, row_number() OVER (
    PARTITION BY household_id, kind ORDER BY created_at, name
  ) - 1 AS position
  FROM public.categories
) AS ordered
WHERE c.id = ordered.id;

GRANT UPDATE (position) ON public.categories TO meusharim_app;
"""

DOWNGRADE_SQL = r"""
REVOKE UPDATE (position) ON public.categories FROM meusharim_app;
ALTER TABLE public.categories DROP COLUMN position;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
