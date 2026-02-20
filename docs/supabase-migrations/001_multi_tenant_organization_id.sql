-- ============================================================
-- NextTable: Multi-tenant foundation – organization_id + RLS
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1) Add organization_id to all tenant-scoped tables (nullable for existing rows)
ALTER TABLE floors ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE tables ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE stock_summary ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- 2) Indexes for fast filtering by organization_id
CREATE INDEX IF NOT EXISTS idx_floors_organization_id ON floors(organization_id);
CREATE INDEX IF NOT EXISTS idx_tables_organization_id ON tables(organization_id);
CREATE INDEX IF NOT EXISTS idx_categories_organization_id ON categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_organization_id ON menu_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_items_organization_id ON order_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_reservations_organization_id ON reservations(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchases_organization_id ON purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_organization_id ON purchase_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_organization_id ON stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_summary_organization_id ON stock_summary(organization_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_settings_organization_id ON restaurant_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_settings_organization_id ON invoice_settings(organization_id);

-- 3) Helper: returns organization IDs the current user belongs to
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS setof uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM user_organizations WHERE user_id = auth.uid();
$$;

-- 4) RLS policies: allow access when organization_id IS NULL (legacy) OR in user's orgs
-- Floors
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "floors_org_select" ON floors;
CREATE POLICY "floors_org_select" ON floors FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "floors_org_insert" ON floors;
CREATE POLICY "floors_org_insert" ON floors FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "floors_org_update" ON floors;
CREATE POLICY "floors_org_update" ON floors FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "floors_org_delete" ON floors;
CREATE POLICY "floors_org_delete" ON floors FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Tables
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tables_org_select" ON tables;
CREATE POLICY "tables_org_select" ON tables FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "tables_org_insert" ON tables;
CREATE POLICY "tables_org_insert" ON tables FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "tables_org_update" ON tables;
CREATE POLICY "tables_org_update" ON tables FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "tables_org_delete" ON tables;
CREATE POLICY "tables_org_delete" ON tables FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_org_select" ON categories;
CREATE POLICY "categories_org_select" ON categories FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "categories_org_insert" ON categories;
CREATE POLICY "categories_org_insert" ON categories FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "categories_org_update" ON categories;
CREATE POLICY "categories_org_update" ON categories FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "categories_org_delete" ON categories;
CREATE POLICY "categories_org_delete" ON categories FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Menu items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_items_org_select" ON menu_items;
CREATE POLICY "menu_items_org_select" ON menu_items FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "menu_items_org_insert" ON menu_items;
CREATE POLICY "menu_items_org_insert" ON menu_items FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "menu_items_org_update" ON menu_items;
CREATE POLICY "menu_items_org_update" ON menu_items FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "menu_items_org_delete" ON menu_items;
CREATE POLICY "menu_items_org_delete" ON menu_items FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_org_select" ON orders;
CREATE POLICY "orders_org_select" ON orders FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "orders_org_insert" ON orders;
CREATE POLICY "orders_org_insert" ON orders FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "orders_org_update" ON orders;
CREATE POLICY "orders_org_update" ON orders FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "orders_org_delete" ON orders;
CREATE POLICY "orders_org_delete" ON orders FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Order items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_org_select" ON order_items;
CREATE POLICY "order_items_org_select" ON order_items FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "order_items_org_insert" ON order_items;
CREATE POLICY "order_items_org_insert" ON order_items FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "order_items_org_update" ON order_items;
CREATE POLICY "order_items_org_update" ON order_items FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "order_items_org_delete" ON order_items;
CREATE POLICY "order_items_org_delete" ON order_items FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reservations_org_select" ON reservations;
CREATE POLICY "reservations_org_select" ON reservations FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "reservations_org_insert" ON reservations;
CREATE POLICY "reservations_org_insert" ON reservations FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "reservations_org_update" ON reservations;
CREATE POLICY "reservations_org_update" ON reservations FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "reservations_org_delete" ON reservations;
CREATE POLICY "reservations_org_delete" ON reservations FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suppliers_org_select" ON suppliers;
CREATE POLICY "suppliers_org_select" ON suppliers FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "suppliers_org_insert" ON suppliers;
CREATE POLICY "suppliers_org_insert" ON suppliers FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "suppliers_org_update" ON suppliers;
CREATE POLICY "suppliers_org_update" ON suppliers FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "suppliers_org_delete" ON suppliers;
CREATE POLICY "suppliers_org_delete" ON suppliers FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchases_org_select" ON purchases;
CREATE POLICY "purchases_org_select" ON purchases FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "purchases_org_insert" ON purchases;
CREATE POLICY "purchases_org_insert" ON purchases FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "purchases_org_update" ON purchases;
CREATE POLICY "purchases_org_update" ON purchases FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "purchases_org_delete" ON purchases;
CREATE POLICY "purchases_org_delete" ON purchases FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Purchase items
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_items_org_select" ON purchase_items;
CREATE POLICY "purchase_items_org_select" ON purchase_items FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "purchase_items_org_insert" ON purchase_items;
CREATE POLICY "purchase_items_org_insert" ON purchase_items FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "purchase_items_org_update" ON purchase_items;
CREATE POLICY "purchase_items_org_update" ON purchase_items FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "purchase_items_org_delete" ON purchase_items;
CREATE POLICY "purchase_items_org_delete" ON purchase_items FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Stock movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_movements_org_select" ON stock_movements;
CREATE POLICY "stock_movements_org_select" ON stock_movements FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "stock_movements_org_insert" ON stock_movements;
CREATE POLICY "stock_movements_org_insert" ON stock_movements FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "stock_movements_org_update" ON stock_movements;
CREATE POLICY "stock_movements_org_update" ON stock_movements FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "stock_movements_org_delete" ON stock_movements;
CREATE POLICY "stock_movements_org_delete" ON stock_movements FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Stock summary
ALTER TABLE stock_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_summary_org_select" ON stock_summary;
CREATE POLICY "stock_summary_org_select" ON stock_summary FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "stock_summary_org_insert" ON stock_summary;
CREATE POLICY "stock_summary_org_insert" ON stock_summary FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "stock_summary_org_update" ON stock_summary;
CREATE POLICY "stock_summary_org_update" ON stock_summary FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "stock_summary_org_delete" ON stock_summary;
CREATE POLICY "stock_summary_org_delete" ON stock_summary FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Restaurant settings
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "restaurant_settings_org_select" ON restaurant_settings;
CREATE POLICY "restaurant_settings_org_select" ON restaurant_settings FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "restaurant_settings_org_insert" ON restaurant_settings;
CREATE POLICY "restaurant_settings_org_insert" ON restaurant_settings FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "restaurant_settings_org_update" ON restaurant_settings;
CREATE POLICY "restaurant_settings_org_update" ON restaurant_settings FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "restaurant_settings_org_delete" ON restaurant_settings;
CREATE POLICY "restaurant_settings_org_delete" ON restaurant_settings FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- Invoice settings
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_settings_org_select" ON invoice_settings;
CREATE POLICY "invoice_settings_org_select" ON invoice_settings FOR SELECT USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "invoice_settings_org_insert" ON invoice_settings;
CREATE POLICY "invoice_settings_org_insert" ON invoice_settings FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "invoice_settings_org_update" ON invoice_settings;
CREATE POLICY "invoice_settings_org_update" ON invoice_settings FOR UPDATE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);
DROP POLICY IF EXISTS "invoice_settings_org_delete" ON invoice_settings;
CREATE POLICY "invoice_settings_org_delete" ON invoice_settings FOR DELETE USING (
  organization_id IS NULL OR organization_id IN (SELECT public.user_organization_ids())
);

-- 5) Grant usage on helper function to authenticated users
GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO service_role;

-- Done. Next: In the app, pass organization_id on every INSERT (from useAuth().organization.id).
-- Existing rows with organization_id NULL will still be visible (legacy). New rows must set organization_id.
