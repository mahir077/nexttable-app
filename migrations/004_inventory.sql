-- ============================================================
-- NextTable Migration 004: Inventory
-- Tables: suppliers, purchases, purchase_items,
--         stock_movements, stock_summary (VIEW)
-- ============================================================

-- 1. suppliers
CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name            TEXT NOT NULL,
  phone           TEXT,
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- 2. purchases
CREATE TABLE purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  supplier_id     UUID REFERENCES suppliers(id),
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchase_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. purchase_items
CREATE TABLE purchase_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  purchase_id     UUID NOT NULL REFERENCES purchases(id),
  menu_item_id    UUID REFERENCES menu_items(id),
  item_name       TEXT NOT NULL,
  quantity        NUMERIC(12,3) NOT NULL,
  unit_cost       NUMERIC(12,2) NOT NULL,
  total_cost      NUMERIC(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. stock_movements
-- Source of truth for all stock changes.
-- NEVER store current stock as a column — always calculate from this table.
CREATE TABLE stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  menu_item_id    UUID REFERENCES menu_items(id),
  item_name       TEXT NOT NULL,      -- snapshot
  type            TEXT NOT NULL,      -- 'purchase'|'usage'|'adjustment'|'bazaar'
  quantity        NUMERIC(12,3) NOT NULL,  -- positive=IN, negative=OUT
  unit_cost       NUMERIC(12,2) DEFAULT 0,
  total_value     NUMERIC(12,2) DEFAULT 0,
  reference_type  TEXT,               -- 'purchase'|'order'|'manual'
  reference_id    UUID,
  movement_date   DATE DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. stock_summary (VIEW — calculated, never stored)
-- Current stock = SUM of all movements per item per org
CREATE VIEW stock_summary AS
SELECT
  organization_id,
  menu_item_id,
  item_name,
  SUM(quantity)     AS current_quantity,
  SUM(total_value)  AS current_value
FROM stock_movements
GROUP BY organization_id, menu_item_id, item_name;

-- INDEXES
CREATE INDEX idx_suppliers_org          ON suppliers(organization_id);
CREATE INDEX idx_purchases_org          ON purchases(organization_id);
CREATE INDEX idx_purchase_items_org     ON purchase_items(organization_id);
CREATE INDEX idx_purchase_items_purch   ON purchase_items(purchase_id);
CREATE INDEX idx_stock_movements_org    ON stock_movements(organization_id);
CREATE INDEX idx_stock_movements_item   ON stock_movements(menu_item_id);
CREATE INDEX idx_stock_movements_date   ON stock_movements(movement_date);
