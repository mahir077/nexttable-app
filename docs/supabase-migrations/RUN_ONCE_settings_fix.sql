-- ============================================================
-- SETTINGS SAVE FIX – Run this ONCE in Supabase SQL Editor
-- (Fix 1: allow org name update from Settings)
-- (Fix 2: remove app.current_tenant_id trigger if present)
-- ============================================================

-- 1) Allow users to update their own organization (display_name)
DROP POLICY IF EXISTS "organizations_update_own" ON public.organizations;
CREATE POLICY "organizations_update_own" ON public.organizations
  FOR UPDATE
  USING (id IN (SELECT public.user_organization_ids()))
  WITH CHECK (id IN (SELECT public.user_organization_ids()));

-- 2) Drop ALL non-internal triggers on restaurant_settings and organizations
--    (fixes app.current_tenant_id error when trigger body is in an extension / not in prosrc)
DO $$
DECLARE
  r RECORD;
  tbl TEXT;
BEGIN
  FOR r IN
    SELECT t.tgname AS tgname,
           c.relname AS tablename,
           n.nspname AS schemaname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('restaurant_settings', 'organizations')
      AND NOT t.tgisinternal
  LOOP
    tbl := quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', r.tgname, tbl);
    RAISE NOTICE 'Dropped trigger % on %', r.tgname, r.tablename;
  END LOOP;
END $$;

-- 3) Re-add updated_at trigger if table has updated_at and function exists (optional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurant_settings' AND column_name = 'updated_at') THEN
      EXECUTE 'DROP TRIGGER IF EXISTS set_updated_at ON public.restaurant_settings';
      EXECUTE 'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.restaurant_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
      RAISE NOTICE 'Re-added updated_at trigger on restaurant_settings';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'updated_at') THEN
      EXECUTE 'DROP TRIGGER IF EXISTS set_updated_at ON public.organizations';
      EXECUTE 'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
      RAISE NOTICE 'Re-added updated_at trigger on organizations';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Optional updated_at trigger: %', SQLERRM;
END $$;
