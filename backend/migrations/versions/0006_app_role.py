"""Run user requests as a dedicated `meusharim_app` role (step 1 of 2: expand).

On Supabase, `authenticated` is also the role of the Data API (PostgREST): any signed-in
user could read and write their household's rows directly with the public key, skipping
the backend's validation. Requests move to a role that only the backend can switch to.

This step only adds: `meusharim_app` gets the same privileges and policies, and
`authenticated` keeps them, so the previous backend version keeps working while a deploy
switches over. Revision 0008 then takes them away from `authenticated`; it must ship in
a later deploy, once this backend version is live.

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-15
"""

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None

APP_TABLES = (
    "households",
    "household_members",
    "household_invitations",
    "categories",
    "transactions",
    "schedules",
    "budgets",
)

CREATE_ROLE_SQL = r"""
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'meusharim_app') THEN
    CREATE ROLE meusharim_app NOLOGIN;
  END IF;
  -- The connecting role must be able to SET ROLE to it, without inheriting its rights.
  IF current_setting('server_version_num')::int >= 160000 THEN
    EXECUTE format('GRANT meusharim_app TO %I WITH INHERIT FALSE, SET TRUE', current_user);
    IF NOT pg_has_role(current_user, 'meusharim_app', 'SET') THEN
      RAISE EXCEPTION 'cannot SET ROLE meusharim_app as %', current_user;
    END IF;
  ELSIF NOT pg_has_role(current_user, 'meusharim_app', 'MEMBER') THEN
    EXECUTE format('GRANT meusharim_app TO %I', current_user);
  END IF;
END
$$;
"""


def copy_access_sql(source: str, target: str) -> str:
    """Grant `target` every privilege `source` has on the app's objects, and add it to the
    policies that apply to `source`. Driven by the catalog, so nothing is listed twice."""
    return rf"""
DO $$
DECLARE
  app_tables text[] := ARRAY[{", ".join(f"'{table}'" for table in APP_TABLES)}];
  grant_row record;
BEGIN
  EXECUTE 'GRANT USAGE ON SCHEMA app TO {target}';

  -- Table privileges.
  FOR grant_row IN
    SELECT c.relname, acl.privilege_type
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) acl
    WHERE n.nspname = 'public' AND c.relname = ANY (app_tables)
      AND acl.grantee = '{source}'::regrole
  LOOP
    EXECUTE format('GRANT %s ON public.%I TO {target}',
                   grant_row.privilege_type, grant_row.relname);
  END LOOP;

  -- Column privileges (e.g. INSERT only on the columns a client may set).
  FOR grant_row IN
    SELECT c.relname, acl.privilege_type,
           string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum) AS columns
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(a.attacl) acl
    WHERE n.nspname = 'public' AND c.relname = ANY (app_tables)
      AND acl.grantee = '{source}'::regrole
    GROUP BY c.relname, acl.privilege_type
  LOOP
    EXECUTE format('GRANT %s (%s) ON public.%I TO {target}',
                   grant_row.privilege_type, grant_row.columns, grant_row.relname);
  END LOOP;

  -- Functions in the app schema.
  FOR grant_row IN
    SELECT p.oid::regprocedure AS func
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(p.proacl) acl
    WHERE n.nspname = 'app' AND acl.grantee = '{source}'::regrole
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO {target}', grant_row.func);
  END LOOP;

  -- Row level security policies: same rules, one more role.
  FOR grant_row IN
    SELECT tablename, policyname, roles FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY (app_tables)
      AND '{source}' = ANY (roles) AND NOT '{target}' = ANY (roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO %s', grant_row.policyname,
                   grant_row.tablename,
                   array_to_string(ARRAY(SELECT quote_ident(r) FROM unnest(
                     grant_row.roles || '{target}'::name) r), ', '));
  END LOOP;
END
$$;
"""


def revoke_access_sql(role: str) -> str:
    """Take every privilege on the app's objects away from `role` and remove it from
    their policies (which keep their other roles)."""
    return rf"""
DO $$
DECLARE
  app_tables text[] := ARRAY[{", ".join(f"'{table}'" for table in APP_TABLES)}];
  grant_row record;
BEGIN
  FOR grant_row IN
    SELECT tablename, policyname, roles FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY (app_tables) AND '{role}' = ANY (roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO %s', grant_row.policyname,
                   grant_row.tablename,
                   array_to_string(ARRAY(SELECT quote_ident(r) FROM unnest(
                     array_remove(grant_row.roles, '{role}'::name)) r), ', '));
  END LOOP;

  FOR grant_row IN
    SELECT p.oid::regprocedure AS func
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(p.proacl) acl
    WHERE n.nspname = 'app' AND acl.grantee = '{role}'::regrole
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM {role}', grant_row.func);
  END LOOP;

  -- Revoking a table privilege also revokes the matching column privileges.
  FOR grant_row IN SELECT unnest(app_tables) AS relname LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM {role}', grant_row.relname);
  END LOOP;
  EXECUTE 'REVOKE USAGE ON SCHEMA app FROM {role}';
END
$$;
"""


def upgrade() -> None:
    op.execute(CREATE_ROLE_SQL)
    op.execute(copy_access_sql("authenticated", "meusharim_app"))


def downgrade() -> None:
    op.execute(revoke_access_sql("meusharim_app"))
    op.execute("DROP ROLE meusharim_app")
