"""Household language, so a household created in English gets English default categories.

The language is chosen once, at creation; existing households stay Hebrew. The two-argument
app.create_household stays for the version still running during a deploy (it creates a
Hebrew household); remove it in a later migration.

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-19
"""

from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def _insert_default_categories(name_column: str, join: str = "") -> str:
    return rf"""
CREATE OR REPLACE FUNCTION app.insert_default_categories(target_household_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  INSERT INTO public.categories (household_id, kind, name, color, icon)
  SELECT target_household_id, d.kind, {name_column}, d.color, d.icon
  FROM (VALUES
    ('expense', 'מזון', 'Groceries', 'green', 'shopping-basket'),
    ('expense', 'מסעדות', 'Eating out', 'orange', 'utensils'),
    ('expense', 'דיור', 'Housing', 'plum', 'house'),
    ('expense', 'חשבונות', 'Bills', 'blue', 'receipt'),
    ('expense', 'רכב', 'Car', 'slate', 'car'),
    ('expense', 'תחבורה', 'Transport', 'teal', 'bus'),
    ('expense', 'קניות', 'Shopping', 'pink', 'shopping-bag'),
    ('expense', 'בריאות', 'Health', 'red', 'heart-pulse'),
    ('expense', 'ילדים', 'Kids', 'amber', 'baby'),
    ('expense', 'תקשורת', 'Telecom', 'indigo', 'smartphone'),
    ('expense', 'ביטוחים', 'Insurance', 'cyan', 'shield-check'),
    ('expense', 'חופשות', 'Vacations', 'sky', 'plane'),
    ('expense', 'מתנות', 'Gifts', 'rose', 'gift'),
    ('expense', 'שונות', 'Other', 'stone', 'ellipsis'),
    ('income', 'משכורת', 'Salary', 'green', 'briefcase'),
    ('income', 'עסק', 'Business', 'blue', 'store'),
    ('income', 'הכנסה נוספת', 'Extra income', 'amber', 'coins'),
    ('income', 'החזרים', 'Refunds', 'teal', 'undo')
  ) AS d (kind, name_he, name_en, color, icon)
  {join}
$$;
"""


UPGRADE_SQL = r"""
ALTER TABLE public.households
  ADD COLUMN language text NOT NULL DEFAULT 'he' CHECK (language IN ('he', 'en'));

CREATE FUNCTION app.create_household(
  household_name text, member_display_name text, household_language text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  caller uuid := app.require_user();
  new_household_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.household_members WHERE user_id = caller) THEN
    RAISE EXCEPTION 'already_member';
  END IF;
  -- The insert trigger seeds the default categories in this language.
  INSERT INTO public.households (name, created_by, language)
    VALUES (btrim(household_name), caller, household_language)
    RETURNING id INTO new_household_id;
  INSERT INTO public.household_members (household_id, user_id, display_name)
    VALUES (new_household_id, caller, btrim(member_display_name));
  RETURN new_household_id;
END
$$;
REVOKE EXECUTE ON FUNCTION app.create_household(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.create_household(text, text, text) TO meusharim_app;
""" + _insert_default_categories(
    "CASE h.language WHEN 'en' THEN d.name_en ELSE d.name_he END",
    "JOIN public.households h ON h.id = target_household_id",
)

DOWNGRADE_SQL = (
    _insert_default_categories("d.name_he")
    + r"""
DROP FUNCTION app.create_household(text, text, text);
ALTER TABLE public.households DROP COLUMN language;
"""
)


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
