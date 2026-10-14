"""Households, members and invitations with row level security.

Access model (identical on local PostgreSQL and Supabase):
- The backend connects as the database owner and, per request, runs
  SET LOCAL ROLE authenticated + set_config('request.jwt.claims', ...).
- `authenticated` only gets the privileges granted here; RLS limits rows to
  the caller's household. Writes that need cross-row checks go through
  SECURITY DEFINER functions in the `app` schema, which read the caller from
  the claims (never from a parameter).

Revision ID: 0001
Revises:
Create Date: 2026-10-14
"""

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


UPGRADE_SQL = r"""
-- Role used for every user request. Already exists on Supabase.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT pg_has_role(current_user, 'authenticated', 'MEMBER') THEN
    EXECUTE format('GRANT authenticated TO %I', current_user);
  END IF;
END
$$;

CREATE SCHEMA app;
GRANT USAGE ON SCHEMA app TO authenticated;

CREATE FUNCTION app.current_user_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

CREATE TABLE public.households (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.household_members (
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  user_id      uuid NOT NULL UNIQUE,  -- MVP: one household per user
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 40),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE public.household_invitations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  token_hash   bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
  created_by   uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  accepted_by  uuid,
  accepted_at  timestamptz,
  CHECK ((accepted_by IS NULL) = (accepted_at IS NULL))
);
CREATE INDEX household_invitations_household_id_idx
  ON public.household_invitations (household_id);
CREATE UNIQUE INDEX household_invitations_one_pending_idx
  ON public.household_invitations (household_id) WHERE accepted_at IS NULL;

-- Rate limiting for invitation lookups. Not accessible to `authenticated` directly.
CREATE TABLE app.invitation_attempts (
  user_id      uuid NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitation_attempts_user_time_idx
  ON app.invitation_attempts (user_id, attempted_at);

-- SECURITY DEFINER so policies on household_members can call it without recursion.
CREATE FUNCTION app.is_household_member(target_household_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members m
    WHERE m.household_id = target_household_id AND m.user_id = app.current_user_id()
  )
$$;

-- Business errors are raised with a stable message code the API maps to a response.
CREATE FUNCTION app.require_user() RETURNS uuid
LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE
  caller uuid := app.current_user_id();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  RETURN caller;
END
$$;

CREATE FUNCTION app.create_household(household_name text, member_display_name text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  caller uuid := app.require_user();
  new_household_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.household_members WHERE user_id = caller) THEN
    RAISE EXCEPTION 'already_member';
  END IF;
  INSERT INTO public.households (name, created_by)
    VALUES (btrim(household_name), caller)
    RETURNING id INTO new_household_id;
  -- A concurrent create by the same user fails here on UNIQUE (user_id) and rolls back.
  INSERT INTO public.household_members (household_id, user_id, display_name)
    VALUES (new_household_id, caller, btrim(member_display_name));
  RETURN new_household_id;
END
$$;

-- Replaces any pending invitation of the caller's household. Returns the expiry time.
CREATE FUNCTION app.create_invitation(new_token_hash bytea) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  caller uuid := app.require_user();
  target_household_id uuid;
  expiry timestamptz;
BEGIN
  SELECT household_id INTO target_household_id
    FROM public.household_members WHERE user_id = caller;
  IF target_household_id IS NULL THEN
    RAISE EXCEPTION 'no_household';
  END IF;
  -- Lock order everywhere: household row first, then invitations.
  PERFORM 1 FROM public.households WHERE id = target_household_id FOR UPDATE;
  IF (SELECT count(*) FROM public.household_members
      WHERE household_id = target_household_id) >= 2 THEN
    RAISE EXCEPTION 'household_full';
  END IF;
  DELETE FROM public.household_invitations
    WHERE household_id = target_household_id AND accepted_at IS NULL;
  INSERT INTO public.household_invitations (household_id, token_hash, created_by, expires_at)
    VALUES (target_household_id, new_token_hash, caller, now() + interval '7 days')
    RETURNING expires_at INTO expiry;
  RETURN expiry;
END
$$;

-- Validates an invitation for the caller. Locks rows when lock_rows is true.
CREATE FUNCTION app.find_valid_invitation(invitation_token_hash bytea, lock_rows boolean)
RETURNS public.household_invitations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  caller uuid := app.require_user();
  invitation public.household_invitations;
  target_household_id uuid;
BEGIN
  SELECT household_id INTO target_household_id
    FROM public.household_invitations WHERE token_hash = invitation_token_hash;
  IF target_household_id IS NULL THEN
    RAISE EXCEPTION 'invitation_invalid';
  END IF;
  IF lock_rows THEN
    PERFORM 1 FROM public.households WHERE id = target_household_id FOR UPDATE;
    SELECT * INTO invitation FROM public.household_invitations
      WHERE token_hash = invitation_token_hash FOR UPDATE;
  ELSE
    SELECT * INTO invitation FROM public.household_invitations
      WHERE token_hash = invitation_token_hash;
  END IF;
  -- The invitation may have been replaced while we waited for the lock.
  IF invitation.id IS NULL THEN
    RAISE EXCEPTION 'invitation_invalid';
  END IF;
  IF invitation.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'invitation_used';
  END IF;
  IF invitation.expires_at <= now() THEN
    RAISE EXCEPTION 'invitation_expired';
  END IF;
  IF EXISTS (SELECT 1 FROM public.household_members WHERE user_id = caller) THEN
    RAISE EXCEPTION 'already_member';
  END IF;
  IF (SELECT count(*) FROM public.household_members
      WHERE household_id = invitation.household_id) >= 2 THEN
    RAISE EXCEPTION 'household_full';
  END IF;
  RETURN invitation;
END
$$;

CREATE FUNCTION app.preview_invitation(invitation_token_hash bytea)
RETURNS TABLE (household_name text, inviter_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  invitation public.household_invitations :=
    app.find_valid_invitation(invitation_token_hash, false);
BEGIN
  RETURN QUERY
    SELECT h.name, m.display_name
    FROM public.households h
    LEFT JOIN public.household_members m
      ON m.household_id = h.id AND m.user_id = invitation.created_by
    WHERE h.id = invitation.household_id;
END
$$;

CREATE FUNCTION app.accept_invitation(invitation_token_hash bytea, member_display_name text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  caller uuid := app.require_user();
  invitation public.household_invitations :=
    app.find_valid_invitation(invitation_token_hash, true);
BEGIN
  -- A concurrent join elsewhere by the same user fails here on UNIQUE (user_id).
  INSERT INTO public.household_members (household_id, user_id, display_name)
    VALUES (invitation.household_id, caller, btrim(member_display_name));
  UPDATE public.household_invitations
    SET accepted_by = caller, accepted_at = now()
    WHERE id = invitation.id;
  RETURN invitation.household_id;
END
$$;

-- Records an invitation lookup and returns the caller's attempts in the last 15 minutes.
CREATE FUNCTION app.register_invitation_attempt() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  caller uuid := app.require_user();
BEGIN
  DELETE FROM app.invitation_attempts
    WHERE user_id = caller AND attempted_at < now() - interval '1 day';
  INSERT INTO app.invitation_attempts (user_id) VALUES (caller);
  RETURN (
    SELECT count(*) FROM app.invitation_attempts
    WHERE user_id = caller AND attempted_at > now() - interval '15 minutes'
  );
END
$$;

-- Functions are executable by PUBLIC by default; restrict them to `authenticated`.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  app.current_user_id(),
  app.is_household_member(uuid),
  app.create_household(text, text),
  app.create_invitation(bytea),
  app.preview_invitation(bytea),
  app.accept_invitation(bytea, text),
  app.register_invitation_attempt()
TO authenticated;

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY households_select_own ON public.households
  FOR SELECT TO authenticated USING (app.is_household_member(id));

CREATE POLICY household_members_select_own ON public.household_members
  FOR SELECT TO authenticated USING (app.is_household_member(household_id));

CREATE POLICY household_invitations_select_own ON public.household_invitations
  FOR SELECT TO authenticated USING (app.is_household_member(household_id));

CREATE POLICY household_invitations_delete_own ON public.household_invitations
  FOR DELETE TO authenticated USING (app.is_household_member(household_id));

-- Supabase grants broad default privileges on new public tables (and exposes them
-- through its Data API), so start every table from no privileges at all.
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format(
        'REVOKE ALL ON public.households, public.household_members,'
        ' public.household_invitations, public.alembic_version FROM %I',
        api_role
      );
    END IF;
  END LOOP;
END
$$;

-- Direct inserts and updates are not granted: they go through the app functions.
GRANT SELECT ON public.households, public.household_members TO authenticated;
GRANT SELECT (id, household_id, created_by, created_at, expires_at, accepted_by, accepted_at),
      DELETE
  ON public.household_invitations TO authenticated;
"""

DOWNGRADE_SQL = r"""
DROP SCHEMA app CASCADE;
DROP TABLE public.household_invitations;
DROP TABLE public.household_members;
DROP TABLE public.households;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
