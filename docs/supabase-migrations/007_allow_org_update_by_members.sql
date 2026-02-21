-- ============================================================
-- Allow authenticated users to UPDATE their own organization
-- (e.g. display_name from Settings page).
-- Run in Supabase SQL Editor once.
-- ============================================================

DROP POLICY IF EXISTS "organizations_update_own" ON public.organizations;
CREATE POLICY "organizations_update_own" ON public.organizations
  FOR UPDATE
  USING (id IN (SELECT public.user_organization_ids()))
  WITH CHECK (id IN (SELECT public.user_organization_ids()));
