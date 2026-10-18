"""Savings goals: a target amount (and optional date) the couple saves toward.

A deposit is an ordinary completed expense in the goal's savings category, linked to
the goal through `transactions.goal_id`, so the money set aside shows in the month's
balance and budget like any other outflow. A goal's progress is the sum of its
completed deposits.

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-18
"""

from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


UPGRADE_SQL = r"""
CREATE TABLE public.savings_goals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40 AND name = btrim(name)),
  target_amount numeric(12, 2) NOT NULL CHECK (target_amount > 0),
  target_date   date,
  -- Deposits are expenses in this category.
  category_id   uuid NOT NULL,
  category_kind text NOT NULL DEFAULT 'expense' CHECK (category_kind = 'expense'),
  created_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz,
  UNIQUE (household_id, id),
  FOREIGN KEY (household_id, category_kind, category_id)
    REFERENCES public.categories (household_id, kind, id)
);
CREATE UNIQUE INDEX savings_goals_active_name_idx
  ON public.savings_goals (household_id, lower(name)) WHERE archived_at IS NULL;

ALTER TABLE public.transactions
  ADD COLUMN goal_id uuid,
  ADD CONSTRAINT transactions_goal_fk FOREIGN KEY (household_id, goal_id)
    REFERENCES public.savings_goals (household_id, id);
CREATE INDEX transactions_goal_idx ON public.transactions (goal_id) WHERE goal_id IS NOT NULL;

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY savings_goals_household ON public.savings_goals
  FOR ALL TO meusharim_app
  USING (app.is_household_member(household_id))
  WITH CHECK (app.is_household_member(household_id));

-- Like every app table: nothing for Supabase's Data API roles, exact grants for the app.
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON public.savings_goals FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
GRANT SELECT, DELETE,
  INSERT (household_id, name, target_amount, target_date, category_id),
  UPDATE (name, target_amount, target_date, category_id, archived_at)
  ON public.savings_goals TO meusharim_app;
GRANT INSERT (goal_id) ON public.transactions TO meusharim_app;
"""

DOWNGRADE_SQL = r"""
ALTER TABLE public.transactions DROP COLUMN goal_id;
DROP TABLE public.savings_goals;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
