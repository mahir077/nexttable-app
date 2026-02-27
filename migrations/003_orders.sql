-- ============================================================
-- NextTable Migration 003: Orders & Billing
-- Tables: orders, order_items, reservations
-- ============================================================

-- 1. orders
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  table_id        UUID REFERENCES tables(id),
  token_number    INTEGER,
  status          TEXT NOT NULL DEFAULT 'open',
  -- 'open'|'kot_sent'|'preparing'|'ready'|'served'|'billed'|'cancelled'
  subtotal        NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  discount_type   TEXT,               -- 'flat'|'percent'
  tax_rate        NUMERIC(5,2) DEFAULT 0,
  tax_amount      NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2) DEFAULT 0,
  payment_method  TEXT,               -- 'cash'|'card'|'bkash'|'nagad'
  notes           TEXT,
  reject_reason   TEXT,
  rejected_by     TEXT,
  created_by      UUID REFERENCES users(id),
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- 2. order_items
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  order_id        UUID NOT NULL REFERENCES orders(id),
  menu_item_id    UUID REFERENCES menu_items(id),
  item_name       TEXT NOT NULL,      -- snapshot at order time
  item_price      NUMERIC(10,2) NOT NULL, -- snapshot
  quantity        INTEGER NOT NULL DEFAULT 1,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  -- 'pending'|'preparing'|'ready'|'served'|'rejected'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. reservations
CREATE TABLE reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  table_id        UUID REFERENCES tables(id),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  party_size      INTEGER,
  reserved_at     TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  -- 'pending'|'arrived'|'cancelled'|'no_show'
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- INDEXES
CREATE INDEX idx_orders_org         ON orders(organization_id);
CREATE INDEX idx_orders_table       ON orders(table_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_created     ON orders(created_at);
CREATE INDEX idx_order_items_org    ON order_items(organization_id);
CREATE INDEX idx_order_items_order  ON order_items(order_id);
CREATE INDEX idx_reservations_org   ON reservations(organization_id);
