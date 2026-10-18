"""Member gender, so the app can address each partner in the right Hebrew form.

Optional (existing members are asked once in the app). Each member may change only
their own value; nothing else on household_members becomes writable.

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-18
"""

from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


UPGRADE_SQL = r"""
ALTER TABLE public.household_members
  ADD COLUMN gender text CHECK (gender IN ('female', 'male'));

CREATE POLICY household_members_update_self ON public.household_members
  FOR UPDATE TO meusharim_app
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

GRANT UPDATE (gender) ON public.household_members TO meusharim_app;
"""

DOWNGRADE_SQL = r"""
REVOKE UPDATE (gender) ON public.household_members FROM meusharim_app;
DROP POLICY household_members_update_self ON public.household_members;
ALTER TABLE public.household_members DROP COLUMN gender;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
