-- Lock down Row Level Security (RLS) for all tables in the `public` schema.
--
-- Fixes Supabase Database Linter findings:
--   - 0013_rls_disabled_in_public (RLS Disabled in Public)
--   - 0023_sensitive_columns_exposed (Sensitive Columns Exposed)
--
-- What this script does:
-- 1) Enables + FORCES RLS on every table in `public`.
-- 2) Creates an explicit deny policy for roles `anon` and `authenticated` on every table.
--    (This does NOT prevent future allow-policies; policies are evaluated as OR.)
-- 3) Revokes all current privileges for `anon`/`authenticated` on tables/sequences in `public`.
-- 4) Revokes default privileges so newly created tables/sequences don't get exposed accidentally.
--
-- IMPORTANT:
-- - If you rely on Supabase PostgREST/Supabase JS from the browser to read/write `public.*`,
--   you MUST add allow policies and grants per table after running this.
-- - If your app uses server-side Prisma only, this is usually safe and is the quickest way
--   to make the Security Advisor green.
--
-- How to run:
-- - Supabase Dashboard -> SQL Editor -> paste this file -> Run.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r' -- ordinary tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', r.table_name);
  END LOOP;
END $$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    -- Create a conservative policy: block anon/auth for all commands.
    -- If you later add allow policies for anon/authenticated, they will take effect.
    EXECUTE format('DROP POLICY IF EXISTS deny_all_anon_auth ON public.%I;', r.table_name);
    EXECUTE format(
      'CREATE POLICY deny_all_anon_auth ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);',
      r.table_name
    );
  END LOOP;
END $$;

-- Revoke exposure via privileges (defense-in-depth).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Prevent future accidental exposure.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
