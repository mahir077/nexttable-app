-- ============================================================
-- NextTable: Fix RLS for floors & tables (Auth RLS Initialization Plan)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor).
-- Fixes: "Auth RLS Initialization Plan" for public.floors / public.tables
--        so dashboard floors/tables queries succeed.
-- ============================================================

-- 1) Helper function: must exist and be safe (search_path + null uid)
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS setof uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_organizations
  WHERE user_id = auth.uid()
    AND organization_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO service_role;
GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO anon;

-- 2) user_organizations: ensure user can read own rows (needed for helper)
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_organizations_select_own" ON public.user_organizations;
CREATE POLICY "user_organizations_select_own" ON public.user_organizations
  FOR SELECT
  USING (user_id = auth.uid());

-- 3) FLOORS: RLS + policies (exactly as app expects)
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "floors_org_select" ON public.floors;
CREATE POLICY "floors_org_select" ON public.floors
  FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT public.user_organization_ids())
  );

DROP POLICY IF EXISTS "floors_org_insert" ON public.floors;
CREATE POLICY "floors_org_insert" ON public.floors
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

DROP POLICY IF EXISTS "floors_org_update" ON public.floors;
CREATE POLICY "floors_org_update" ON public.floors
  FOR UPDATE
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT public.user_organization_ids())
  );

DROP POLICY IF EXISTS "floors_org_delete" ON public.floors;
CREATE POLICY "floors_org_delete" ON public.floors
  FOR DELETE
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT public.user_organization_ids())
  );

-- 4) TABLES: RLS + policies (exactly as app expects)
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tables_org_select" ON public.tables;
CREATE POLICY "tables_org_select" ON public.tables
  FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT public.user_organization_ids())
  );

DROP POLICY IF EXISTS "tables_org_insert" ON public.tables;
CREATE POLICY "tables_org_insert" ON public.tables
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

DROP POLICY IF EXISTS "tables_org_update" ON public.tables;
CREATE POLICY "tables_org_update" ON public.tables
  FOR UPDATE
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT public.user_organization_ids())
  );

DROP POLICY IF EXISTS "tables_org_delete" ON public.tables;
CREATE POLICY "tables_org_delete" ON public.tables
  FOR DELETE
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT public.user_organization_ids())
  );

-- Done. After running, test: log in to the app and open Dashboard; floors and tables should load.
