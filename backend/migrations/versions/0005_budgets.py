"""Monthly budgets: an optional overall amount and amounts per expense category.

Each month keeps its own rows, so past budgets never change when a later month is
edited.

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-14
"""

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


UPGRADE_SQL = r"""
CREATE TABLE public.budgets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  month         date NOT NULL CHECK (extract(day FROM month) = 1),
  -- NULL is the overall budget of the month.
  category_id   uuid,
  -- Budgets are for expenses; the column lets the foreign key check the category's kind.
  category_kind text NOT NULL DEFAULT 'expense' CHECK (category_kind = 'expense'),
  amount        numeric(12, 2) NOT NULL CHECK (amount > 0),
  UNIQUE NULLS NOT DISTINCT (household_id, month, category_id),
  FOREIGN KEY (household_id, category_kind, category_id)
    REFERENCES public.categories (household_id, kind, id)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY budgets_household ON public.budgets
  FOR ALL TO authenticated
  USING (app.is_household_member(household_id))
  WITH CHECK (app.is_household_member(household_id));

DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON public.budgets FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
GRANT SELECT, DELETE, INSERT (household_id, month, category_id, amount), UPDATE (amount)
  ON public.budgets TO authenticated;
"""

DOWNGRADE_SQL = "DROP TABLE public.budgets;"


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
