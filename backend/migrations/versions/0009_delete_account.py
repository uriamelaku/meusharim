"""Account deletion: remove the caller from the app's data.

If a partner stays in the household, the household and its data stay with them: the
caller's membership goes away, and money the caller paid or received moves to the joint
account. If the caller is the last member, the whole household is deleted.

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-18
"""

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


UPGRADE_SQL = r"""
CREATE FUNCTION app.delete_my_data() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  caller uuid := app.require_user();
  target_household_id uuid;
BEGIN
  SELECT household_id INTO target_household_id
    FROM public.household_members WHERE user_id = caller;

  IF target_household_id IS NOT NULL THEN
    -- Same lock order as invitations: household row first.
    PERFORM 1 FROM public.households WHERE id = target_household_id FOR UPDATE;

    IF EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = target_household_id AND user_id <> caller
    ) THEN
      UPDATE public.transactions SET party_user_id = NULL
        WHERE household_id = target_household_id AND party_user_id = caller;
      UPDATE public.schedules SET party_user_id = NULL
        WHERE household_id = target_household_id AND party_user_id = caller;
      DELETE FROM public.household_invitations
        WHERE household_id = target_household_id AND accepted_at IS NULL;
      DELETE FROM public.household_members
        WHERE household_id = target_household_id AND user_id = caller;
    ELSE
      -- Categories, transactions, schedules, budgets and invitations cascade.
      DELETE FROM public.households WHERE id = target_household_id;
    END IF;
  END IF;

  DELETE FROM app.invitation_attempts WHERE user_id = caller;
END
$$;

REVOKE EXECUTE ON FUNCTION app.delete_my_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.delete_my_data() TO meusharim_app;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute("DROP FUNCTION app.delete_my_data()")
