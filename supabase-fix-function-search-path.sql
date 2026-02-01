-- Fix Supabase Database Linter warning:
--   0011_function_search_path_mutable (Function Search Path Mutable)
--
-- Issue:
--   Function `public.update_updated_at_column` has a role mutable search_path.
--
-- Remediation:
--   Set an explicit, safe search_path for the function.
--
-- How to run:
--   Supabase Dashboard -> SQL Editor -> paste this file -> Run.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_updated_at_column'
  ) THEN
    -- Use a deterministic search_path. We include pg_catalog first.
    -- Keeping `public` second is compatible with functions that reference public objects.
    ALTER FUNCTION public.update_updated_at_column()
      SET search_path = pg_catalog, public;
  END IF;
END $$;
