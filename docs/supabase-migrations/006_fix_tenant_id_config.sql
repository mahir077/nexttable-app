-- ============================================================
-- Fix: "unrecognized configuration parameter 'app.current_tenant_id'"
-- Run this in Supabase SQL Editor if Settings save shows that error.
-- Removes any function (and its triggers) that set app.current_tenant_id.
-- ============================================================

DO $$
DECLARE
  r RECORD;
  sig TEXT;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosrc LIKE '%current_tenant_id%'
  LOOP
    sig := quote_ident(r.nspname) || '.' || quote_ident(r.proname) || '(' || r.args || ')';
    BEGIN
      EXECUTE 'DROP FUNCTION IF EXISTS ' || sig || ' CASCADE';
      RAISE NOTICE 'Dropped function %', sig;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skip %: %', sig, SQLERRM;
    END;
  END LOOP;
END $$;
