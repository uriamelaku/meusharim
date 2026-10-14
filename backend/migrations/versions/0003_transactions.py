"""Transactions: the single ledger for manual entries (and later, schedule occurrences).

Every row has an explicit status. Only `completed` rows count as actual money; a
date passing never changes the status.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-14
"""

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


UPGRADE_SQL = r"""
CREATE FUNCTION app.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE TABLE public.transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('income', 'expense')),
  amount        numeric(12, 2) NOT NULL CHECK (amount > 0),
  occurred_on   date NOT NULL,
  category_id   uuid NOT NULL,
  description   text NOT NULL DEFAULT '' CHECK (char_length(description) <= 120),
  status        text NOT NULL CHECK (status IN ('planned', 'completed')),
  -- Who paid or received the money; NULL means the joint account.
  party_user_id uuid,
  created_by    uuid NOT NULL DEFAULT app.current_user_id(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Same household, and the category's kind must match the transaction's kind.
  FOREIGN KEY (household_id, kind, category_id)
    REFERENCES public.categories (household_id, kind, id),
  FOREIGN KEY (household_id, party_user_id)
    REFERENCES public.household_members (household_id, user_id)
);
CREATE INDEX transactions_household_date_idx
  ON public.transactions (household_id, occurred_on DESC, created_at DESC);
CREATE INDEX transactions_category_idx ON public.transactions (category_id);

CREATE TRIGGER transactions_touch_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY transactions_household ON public.transactions
  FOR ALL TO authenticated
  USING (app.is_household_member(household_id))
  WITH CHECK (app.is_household_member(household_id));

DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON public.transactions FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
-- created_by is not insertable: it always comes from the request's JWT via the default.
GRANT SELECT, DELETE,
  INSERT (household_id, kind, amount, occurred_on, category_id, description, status,
          party_user_id),
  UPDATE (kind, amount, occurred_on, category_id, description, status, party_user_id)
  ON public.transactions TO authenticated;
GRANT EXECUTE ON FUNCTION app.touch_updated_at() TO authenticated;
"""

DOWNGRADE_SQL = r"""
DROP TABLE public.transactions;
DROP FUNCTION app.touch_updated_at();
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
