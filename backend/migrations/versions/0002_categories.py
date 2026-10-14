"""Income and expense categories, with defaults seeded for every household.

Unlike the household tables, categories are written directly by `authenticated`
under RLS: membership is the only check needed.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-14
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


UPGRADE_SQL = r"""
CREATE TABLE public.categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('income', 'expense')),
  name         text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30 AND name = btrim(name)),
  color        text NOT NULL CHECK (color ~ '^[a-z]{1,20}$'),
  icon         text NOT NULL CHECK (icon ~ '^[a-z-]{1,30}$'),
  archived_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Targets for composite foreign keys: rows that reference a category must belong
  -- to the same household (and, where it matters, have the same kind).
  UNIQUE (household_id, id),
  UNIQUE (household_id, kind, id)
);
CREATE UNIQUE INDEX categories_active_name_idx
  ON public.categories (household_id, kind, lower(name)) WHERE archived_at IS NULL;

CREATE FUNCTION app.insert_default_categories(target_household_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  INSERT INTO public.categories (household_id, kind, name, color, icon)
  SELECT target_household_id, d.kind, d.name, d.color, d.icon
  FROM (VALUES
    ('expense', 'מזון', 'green', 'shopping-basket'),
    ('expense', 'מסעדות', 'orange', 'utensils'),
    ('expense', 'דיור', 'plum', 'house'),
    ('expense', 'חשבונות', 'blue', 'receipt'),
    ('expense', 'רכב', 'slate', 'car'),
    ('expense', 'תחבורה', 'teal', 'bus'),
    ('expense', 'קניות', 'pink', 'shopping-bag'),
    ('expense', 'בריאות', 'red', 'heart-pulse'),
    ('expense', 'ילדים', 'amber', 'baby'),
    ('expense', 'תקשורת', 'indigo', 'smartphone'),
    ('expense', 'ביטוחים', 'cyan', 'shield-check'),
    ('expense', 'חופשות', 'sky', 'plane'),
    ('expense', 'מתנות', 'rose', 'gift'),
    ('expense', 'שונות', 'stone', 'ellipsis'),
    ('income', 'משכורת', 'green', 'briefcase'),
    ('income', 'עסק', 'blue', 'store'),
    ('income', 'הכנסה נוספת', 'amber', 'coins'),
    ('income', 'החזרים', 'teal', 'undo')
  ) AS d (kind, name, color, icon)
$$;

CREATE FUNCTION app.seed_default_categories() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM app.insert_default_categories(NEW.id);
  RETURN NEW;
END
$$;
REVOKE EXECUTE ON FUNCTION
  app.insert_default_categories(uuid), app.seed_default_categories()
FROM PUBLIC;

CREATE TRIGGER households_seed_categories
  AFTER INSERT ON public.households
  FOR EACH ROW EXECUTE FUNCTION app.seed_default_categories();

SELECT app.insert_default_categories(id) FROM public.households;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_household ON public.categories
  FOR ALL TO authenticated
  USING (app.is_household_member(household_id))
  WITH CHECK (app.is_household_member(household_id));

-- See 0001: start from no privileges, then grant exactly what the API needs.
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON public.categories FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
GRANT SELECT, INSERT, DELETE, UPDATE (name, color, icon, archived_at)
  ON public.categories TO authenticated;
"""

DOWNGRADE_SQL = r"""
DROP TRIGGER households_seed_categories ON public.households;
DROP FUNCTION app.seed_default_categories();
DROP FUNCTION app.insert_default_categories(uuid);
DROP TABLE public.categories;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
