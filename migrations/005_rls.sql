-- ============================================================
-- NextTable Migration 005: RLS Security Policies
-- Supabase/PostgreSQL specific — DELETE this file for MySQL
-- ============================================================

-- Helper: get current user's organization_id
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT organization_id FROM users
  WHERE auth_user_id = auth.uid()
  AND deleted_at IS NULL
  LIMIT 1;
$$;

-- Helper: check if super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM super_admins
    WHERE auth_user_id = auth.uid()
    AND is_active = true
  );
$$;

-- Enable RLS
ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables               ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements      ENABLE ROW LEVEL SECURITY;

-- Policies (org-scoped for all business tables)
-- Pattern: SELECT allows own org OR super admin | INSERT/UPDATE/DELETE own org only

-- organizations
CREATE POLICY "org_select" ON organizations FOR SELECT USING (id = get_my_org_id() OR is_super_admin());
CREATE POLICY "org_insert" ON organizations FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (id = get_my_org_id() OR is_super_admin());

-- users
CREATE POLICY "users_select" ON users FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "users_update" ON users FOR UPDATE USING (organization_id = get_my_org_id() OR is_super_admin());

-- user_organizations
CREATE POLICY "user_orgs_select" ON user_organizations FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "user_orgs_insert" ON user_organizations FOR INSERT WITH CHECK (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "user_orgs_update" ON user_organizations FOR UPDATE USING (organization_id = get_my_org_id() OR is_super_admin());

-- tenants (super admin only)
CREATE POLICY "tenants_select" ON tenants FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "tenants_insert" ON tenants FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "tenants_update" ON tenants FOR UPDATE USING (is_super_admin());

-- floors
CREATE POLICY "floors_select" ON floors FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "floors_insert" ON floors FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "floors_update" ON floors FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "floors_delete" ON floors FOR DELETE USING (organization_id = get_my_org_id());

-- tables
CREATE POLICY "tables_select" ON tables FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "tables_insert" ON tables FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "tables_update" ON tables FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "tables_delete" ON tables FOR DELETE USING (organization_id = get_my_org_id());

-- categories
CREATE POLICY "categories_select" ON categories FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (organization_id = get_my_org_id());

-- menu_items
CREATE POLICY "menu_select" ON menu_items FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "menu_insert" ON menu_items FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "menu_update" ON menu_items FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "menu_delete" ON menu_items FOR DELETE USING (organization_id = get_my_org_id());

-- restaurant_settings
CREATE POLICY "rest_settings_select" ON restaurant_settings FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "rest_settings_insert" ON restaurant_settings FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "rest_settings_update" ON restaurant_settings FOR UPDATE USING (organization_id = get_my_org_id());

-- invoice_settings
CREATE POLICY "inv_settings_select" ON invoice_settings FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "inv_settings_insert" ON invoice_settings FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "inv_settings_update" ON invoice_settings FOR UPDATE USING (organization_id = get_my_org_id());

-- orders
CREATE POLICY "orders_select" ON orders FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "orders_delete" ON orders FOR DELETE USING (organization_id = get_my_org_id());

-- order_items
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "order_items_update" ON order_items FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "order_items_delete" ON order_items FOR DELETE USING (organization_id = get_my_org_id());

-- reservations
CREATE POLICY "reservations_select" ON reservations FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "reservations_insert" ON reservations FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "reservations_update" ON reservations FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "reservations_delete" ON reservations FOR DELETE USING (organization_id = get_my_org_id());

-- suppliers
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE USING (organization_id = get_my_org_id());

-- purchases
CREATE POLICY "purchases_select" ON purchases FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "purchases_insert" ON purchases FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "purchases_update" ON purchases FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "purchases_delete" ON purchases FOR DELETE USING (organization_id = get_my_org_id());

-- purchase_items
CREATE POLICY "purchase_items_select" ON purchase_items FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "purchase_items_insert" ON purchase_items FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "purchase_items_update" ON purchase_items FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "purchase_items_delete" ON purchase_items FOR DELETE USING (organization_id = get_my_org_id());

-- stock_movements
CREATE POLICY "stock_select" ON stock_movements FOR SELECT USING (organization_id = get_my_org_id() OR is_super_admin());
CREATE POLICY "stock_insert" ON stock_movements FOR INSERT WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "stock_update" ON stock_movements FOR UPDATE USING (organization_id = get_my_org_id());
CREATE POLICY "stock_delete" ON stock_movements FOR DELETE USING (organization_id = get_my_org_id());
