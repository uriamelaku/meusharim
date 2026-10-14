"""Schedules: recurring income/expenses and installment purchases.

A schedule never stores its future occurrences. When an occurrence's date arrives,
the API inserts it into `transactions` (planned, or completed when auto-confirm is
on) with (schedule_id, sequence_no); the unique pair and the forward-only
`next_sequence` pointer prevent duplicates, also after the row is deleted.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-14
"""

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


UPGRADE_SQL = r"""
CREATE TABLE public.schedules (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id       uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  type               text NOT NULL CHECK (type IN ('recurring', 'installments')),
  kind               text NOT NULL CHECK (kind IN ('income', 'expense')),
  category_id        uuid NOT NULL,
  description        text NOT NULL DEFAULT '' CHECK (char_length(description) <= 120),
  party_user_id      uuid,
  frequency          text NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  start_date         date NOT NULL,
  end_date           date,
  amount             numeric(12, 2) CHECK (amount > 0),
  total_amount       numeric(12, 2) CHECK (total_amount > 0),
  installments_count integer CHECK (installments_count BETWEEN 2 AND 360),
  status             text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'paused', 'cancelled')),
  auto_confirm       boolean NOT NULL,
  -- The next occurrence (1-based) that has not been written to transactions yet.
  next_sequence      integer NOT NULL DEFAULT 1 CHECK (next_sequence >= 1),
  created_by         uuid NOT NULL DEFAULT app.current_user_id(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, id),
  FOREIGN KEY (household_id, kind, category_id)
    REFERENCES public.categories (household_id, kind, id),
  FOREIGN KEY (household_id, party_user_id)
    REFERENCES public.household_members (household_id, user_id),
  CHECK (end_date IS NULL OR end_date >= start_date),
  CHECK (
    (type = 'recurring' AND amount IS NOT NULL AND total_amount IS NULL
      AND installments_count IS NULL)
    OR
    (type = 'installments' AND amount IS NULL AND total_amount IS NOT NULL
      AND installments_count IS NOT NULL AND frequency = 'monthly' AND end_date IS NULL
      -- At least one agora per payment.
      AND total_amount * 100 >= installments_count)
  )
);
CREATE INDEX schedules_household_idx ON public.schedules (household_id, status);

CREATE TRIGGER schedules_touch_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE public.transactions
  ADD COLUMN schedule_id uuid,
  ADD COLUMN sequence_no integer CHECK (sequence_no >= 1),
  ADD CONSTRAINT transactions_schedule_fk FOREIGN KEY (household_id, schedule_id)
    REFERENCES public.schedules (household_id, id),
  ADD CONSTRAINT transactions_schedule_sequence_pair
    CHECK ((schedule_id IS NULL) = (sequence_no IS NULL)),
  ADD CONSTRAINT transactions_one_row_per_occurrence UNIQUE (schedule_id, sequence_no);

-- A schedule's occurrences are attributed to whoever created the schedule, not to the
-- partner whose request happened to write them.
CREATE FUNCTION app.set_occurrence_creator() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.schedule_id IS NOT NULL THEN
    SELECT created_by INTO NEW.created_by FROM public.schedules WHERE id = NEW.schedule_id;
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER transactions_set_occurrence_creator
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION app.set_occurrence_creator();
GRANT EXECUTE ON FUNCTION app.set_occurrence_creator() TO authenticated;

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY schedules_household ON public.schedules
  FOR ALL TO authenticated
  USING (app.is_household_member(household_id))
  WITH CHECK (app.is_household_member(household_id));

DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON public.schedules FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
-- Schedules are cancelled, never deleted, so their history stays linked.
GRANT SELECT,
  INSERT (household_id, type, kind, category_id, description, party_user_id, frequency,
          start_date, end_date, amount, total_amount, installments_count, auto_confirm),
  UPDATE (category_id, description, party_user_id, frequency, start_date, end_date, amount,
          total_amount, installments_count, status, auto_confirm, next_sequence)
  ON public.schedules TO authenticated;
GRANT INSERT (schedule_id, sequence_no) ON public.transactions TO authenticated;
"""

DOWNGRADE_SQL = r"""
DROP TRIGGER transactions_set_occurrence_creator ON public.transactions;
DROP FUNCTION app.set_occurrence_creator();
ALTER TABLE public.transactions
  DROP COLUMN schedule_id,
  DROP COLUMN sequence_no;
DROP TABLE public.schedules;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
