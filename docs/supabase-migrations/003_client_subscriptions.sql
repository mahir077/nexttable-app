-- ============================================================
-- NextTable: client_subscriptions for Super Admin Mother Panel
-- Run in Supabase SQL Editor after 001_multi_tenant_organization_id.sql
-- ============================================================

-- client_subscriptions: one row per client (organization) for billing/status
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'Starter',
  monthly_fee numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT (current_date),
  last_payment_date date,
  next_payment_due date NOT NULL DEFAULT (current_date + interval '1 month'),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'overdue')),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_organization_id ON public.client_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_payment_status ON public.client_subscriptions(payment_status);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_is_active ON public.client_subscriptions(is_active);

-- super_admins: must exist for admin APIs (if not already created)
CREATE TABLE IF NOT EXISTS public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS: only super admins can read/update client_subscriptions
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid());
$$;

DROP POLICY IF EXISTS "client_subscriptions_super_admin_select" ON public.client_subscriptions;
CREATE POLICY "client_subscriptions_super_admin_select" ON public.client_subscriptions
  FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "client_subscriptions_super_admin_update" ON public.client_subscriptions;
CREATE POLICY "client_subscriptions_super_admin_update" ON public.client_subscriptions
  FOR UPDATE USING (public.is_super_admin());

-- Service role can do everything; anon/authenticated need the policy above.
-- INSERT is done server-side with service role when creating a client.

COMMENT ON TABLE public.client_subscriptions IS 'Vendor (super admin) tracking: subscription and payment status per client org.';
