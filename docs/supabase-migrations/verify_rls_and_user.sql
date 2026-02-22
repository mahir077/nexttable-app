-- ============================================================
-- Backend verification: RLS policies + user in user_organizations
-- Run in Supabase SQL Editor (Dashboard → SQL Editor).
-- Uses the currently authenticated user (auth.uid()).
-- Dialect: PostgreSQL (Supabase)
-- ============================================================

-- 1) List all RLS policies on the four tables
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text   AS using_expression,
  with_check::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('tables', 'floors', 'organizations', 'user_organizations')
ORDER BY tablename, cmd, policyname;

-- 2) Check if user_organization_ids() exists and its definition
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'user_organization_ids';

-- 3) Check if current user exists in user_organizations
-- (Run while logged in as the app user; anon key with JWT.)
SELECT
  auth.uid() AS current_user_id,
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid()
  ) AS user_has_org_membership,
  (
    SELECT json_agg(json_build_object(
      'organization_id', uo.organization_id,
      'role', uo.role
    ))
    FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid()
  ) AS memberships;

-- 4) RLS enabled on these tables?
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('tables', 'floors', 'organizations', 'user_organizations')
ORDER BY c.relname;
