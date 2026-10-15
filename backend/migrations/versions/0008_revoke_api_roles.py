"""Take app data away from Supabase's `authenticated` role (step 2 of 2: contract).

After 0006 the backend runs requests as `meusharim_app`. This removes `authenticated`
from every privilege and policy on app data, which closes the Data API path for
signed-in users. Ship it in a deploy after the one that introduced 0006: the backend
version running while this migrates must already use `meusharim_app`.

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-15
"""

import importlib.util
from pathlib import Path

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

# The SQL builders live in 0006 (a migration, so they never change after release).
_spec = importlib.util.spec_from_file_location(
    "migration_0006", Path(__file__).with_name("0006_app_role.py")
)
_app_role = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_app_role)


def upgrade() -> None:
    op.execute(_app_role.revoke_access_sql("authenticated"))
    # Trigger functions were still executable by PUBLIC (and so by `authenticated`).
    op.execute("REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC")


def downgrade() -> None:
    op.execute(_app_role.copy_access_sql("meusharim_app", "authenticated"))
