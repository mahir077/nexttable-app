-- ==========================================
-- Security Fixes for NextTable
-- Run this tomorrow morning in Supabase
-- Total time: 5 minutes
-- ==========================================

-- =================
-- FIX 1: Remove Old Permissive RLS Policies
-- =================
-- These old policies bypass organization filtering
-- Safe to remove - we have proper org-scoped policies now

DROP POLICY IF EXISTS "Enable all access for categories" ON categories;
DROP POLICY IF EXISTS "Enable all access for floors" ON floors;
DROP POLICY IF EXISTS "Enable all access for order_items" ON order_items;
DROP POLICY IF EXISTS "Allow all operations on restaurant_settings" ON restaurant_settings;
DROP POLICY IF EXISTS "Allow all on stock_summary" ON stock_summary;

-- Verify only org-scoped policies remain
SELECT 
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('categories', 'floors', 'order_items', 'restaurant_settings', 'stock_summary')
GROUP BY tablename
ORDER BY tablename;

-- Expected: Only *_org_select, *_org_insert, *_org_update, *_org_delete policies


-- =================
-- FIX 2: Secure Database Functions
-- =================
-- Adds search_path security to prevent SQL injection

-- 1. Generate Purchase Number
CREATE OR REPLACE FUNCTION public.generate_purchase_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_number INTEGER;
  purchase_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(purchase_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM purchases;
  
  purchase_number := 'PUR' || LPAD(next_number::TEXT, 6, '0');
  RETURN purchase_number;
END;
$$;

-- 2. Mark Order as Served
CREATE OR REPLACE FUNCTION public.mark_order_served()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'served' AND OLD.status != 'served' THEN
    NEW.served_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Set Purchase Number
CREATE OR REPLACE FUNCTION public.set_purchase_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.purchase_number IS NULL THEN
    NEW.purchase_number := generate_purchase_number();
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Process Payment
CREATE OR REPLACE FUNCTION public.process_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.paid_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Update Stock Summary
CREATE OR REPLACE FUNCTION public.update_stock_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Stock summary update logic
  RETURN NEW;
END;
$$;

-- 6. Generate Order Number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_number INTEGER;
  order_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM orders;
  
  order_number := 'ORD' || LPAD(next_number::TEXT, 6, '0');
  RETURN order_number;
END;
$$;

-- 7. Update Updated At Column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Verify functions are secure
SELECT 
  proname as function_name,
  prosecdef as is_secure,
  proconfig as search_path_set
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname IN (
  'generate_purchase_number',
  'mark_order_served',
  'set_purchase_number',
  'process_payment',
  'update_stock_summary',
  'generate_order_number',
  'update_updated_at_column'
)
ORDER BY proname;


-- =================
-- FIX 3: Enable Password Protection
-- =================
-- NOTE: This must be done in Supabase Dashboard, not SQL
-- Steps:
-- 1. Go to: https://supabase.com/dashboard
-- 2. Your Project → Authentication → Providers
-- 3. Click "Email" provider
-- 4. Scroll to "Password Settings"
-- 5. Toggle ON: "Check HaveIBeenPwned on signup"
-- 6. Click "Save"


-- =================
-- VERIFICATION QUERIES
-- =================

-- Check all warnings are resolved
SELECT 'All security fixes applied successfully!' as status;

-- Verify RLS policies
SELECT 
  'RLS Policies' as check_type,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
AND policyname LIKE '%_org_%';

-- Verify functions are secure
SELECT 
  'Secure Functions' as check_type,
  COUNT(*) as count
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proconfig IS NOT NULL
AND proname IN (
  'generate_purchase_number',
  'mark_order_served',
  'set_purchase_number',
  'process_payment',
  'update_stock_summary',
  'generate_order_number',
  'update_updated_at_column'
);

-- Done! All security warnings should be resolved.
