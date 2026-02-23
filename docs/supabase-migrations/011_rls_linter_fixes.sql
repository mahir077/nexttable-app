-- ============================================================
-- NextTable: Fix Supabase linter – Auth RLS Init Plan + duplicate policies + duplicate index
-- Run in Supabase SQL Editor after 010_fix_floors_tables_rls.sql.
-- Fixes: auth_rls_initplan (use (select auth.uid()) once), multiple_permissive_policies, duplicate_index
-- ============================================================

-- 1) Auth RLS Init Plan: evaluate auth.uid() once via (select auth.uid())
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS setof uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_organizations
  WHERE user_id = (SELECT auth.uid())
    AND organization_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO service_role;
GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO anon;

-- 2) user_organizations policy: (select auth.uid()) so not re-evaluated per row
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_organizations_select_own" ON public.user_organizations;
CREATE POLICY "user_organizations_select_own" ON public.user_organizations
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- 3) Remove duplicate "*_simple" policies on floors (keep only floors_org_*)
DROP POLICY IF EXISTS "floors_select_simple" ON public.floors;
DROP POLICY IF EXISTS "floors_insert_simple" ON public.floors;
DROP POLICY IF EXISTS "floors_update_simple" ON public.floors;
DROP POLICY IF EXISTS "floors_delete_simple" ON public.floors;

-- 4) Remove duplicate "*_simple" policies on tables (keep only tables_org_*)
DROP POLICY IF EXISTS "tables_select_simple" ON public.tables;
DROP POLICY IF EXISTS "tables_insert_simple" ON public.tables;
DROP POLICY IF EXISTS "tables_update_simple" ON public.tables;
DROP POLICY IF EXISTS "tables_delete_simple" ON public.tables;

-- 5) Duplicate index: keep one, drop the other (linter: idx_user_organizations_org_id, idx_user_orgs_org)
DROP INDEX IF EXISTS public.idx_user_organizations_org_id;

-- Done. Re-run the linter; auth_rls_initplan and multiple_permissive_policies for floors/tables should clear.
-- duplicate_index on user_organizations should clear.
