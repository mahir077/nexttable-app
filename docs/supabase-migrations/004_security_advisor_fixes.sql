-- ============================================================
-- NextTable: Security Advisor fixes (RLS + function search_path)
-- Run in Supabase SQL Editor after 001_multi_tenant_organization_id.sql
-- Fixes: "RLS Enabled No Policy" + "Function Search Path Mutable"
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1) RLS policies for organizations (Security Advisor: "RLS Enabled No Policy")
-- Users can only SELECT organizations they belong to.
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_own" ON public.organizations;
CREATE POLICY "organizations_select_own" ON public.organizations
  FOR SELECT
  USING (id IN (SELECT public.user_organization_ids()));

-- INSERT/UPDATE/DELETE: no policy for authenticated = only service_role can do it (e.g. create-client API).

-- ---------------------------------------------------------------------------
-- 2) RLS policies for user_organizations (Security Advisor: "RLS Enabled No Policy")
-- Users can only SELECT their own membership rows.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_organizations_select_own" ON public.user_organizations;
CREATE POLICY "user_organizations_select_own" ON public.user_organizations
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT/UPDATE/DELETE: only service_role (e.g. create-client API, invite flows).

-- ---------------------------------------------------------------------------
-- 3) Function search_path (Security Advisor: "Function Search Path Mutable")
-- So functions don’t depend on caller’s search_path. Run only if these exist.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Only alter functions that exist with 0 args (pronargs = 0). Skip if missing or overloaded.
  FOR r IN
    SELECT p.oid, n.nspname || '.' || p.proname AS fullname
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'generate_order_number', 'generate_purchase_number', 'set_purchase_number',
        'mark_order_served', 'process_payment', 'update_stock_summary', 'update_updated_at_column'
      )
      AND p.pronargs = 0
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.fullname || '()');
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4) "RLS Policy Always True" warning
-- If categories, floors, order_items, restaurant_settings, stock_summary still
-- show "always true", run the RLS section of 001_multi_tenant_organization_id.sql
-- (the DROP POLICY + CREATE POLICY blocks for those tables). That replaces
-- any (true) policies with org-scoped ones.
-- ---------------------------------------------------------------------------
