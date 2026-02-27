-- ============================================================
-- NextTable Migration 002: Restaurant Core
-- Tables: floors, tables, categories, menu_items,
--         restaurant_settings, invoice_settings
-- ============================================================

-- 1. floors
CREATE TABLE floors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name            TEXT NOT NULL,
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- 2. tables
CREATE TABLE tables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  floor_id        UUID NOT NULL REFERENCES floors(id),
  table_number    TEXT NOT NULL,
  seats           INTEGER DEFAULT 4,
  status          TEXT NOT NULL DEFAULT 'available',  -- 'available'|'occupied'|'reserved'|'cleaning'
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- 3. categories
CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name            TEXT NOT NULL,
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- 4. menu_items
CREATE TABLE menu_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  category_id     UUID REFERENCES categories(id),
  name            TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost            NUMERIC(10,2) DEFAULT 0,
  is_available    BOOLEAN NOT NULL DEFAULT true,
  display_order   INTEGER NOT NULL DEFAULT 0,
  image_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- 5. restaurant_settings
CREATE TABLE restaurant_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id),
  display_name    TEXT,
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#000000',
  currency        TEXT DEFAULT 'BDT',
  tax_rate        NUMERIC(5,2) DEFAULT 0,
  address         TEXT,
  phone           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. invoice_settings
CREATE TABLE invoice_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id),
  show_logo       BOOLEAN NOT NULL DEFAULT true,
  show_tax        BOOLEAN NOT NULL DEFAULT true,
  footer_text     TEXT,
  terms_text      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_floors_org         ON floors(organization_id);
CREATE INDEX idx_tables_org         ON tables(organization_id);
CREATE INDEX idx_tables_floor       ON tables(floor_id);
CREATE INDEX idx_categories_org     ON categories(organization_id);
CREATE INDEX idx_menu_items_org     ON menu_items(organization_id);
CREATE INDEX idx_menu_items_cat     ON menu_items(category_id);
