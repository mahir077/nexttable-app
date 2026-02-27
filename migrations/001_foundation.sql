-- ============================================================
-- NextTable Migration 001: Foundation
-- Tables: organizations, tenants, users, user_organizations, super_admins
-- MySQL Migration: Change TIMESTAMPTZ→DATETIME, gen_random_uuid()→UUID()
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. organizations
CREATE TABLE organizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

-- 2. tenants (SaaS subscription tracking — one per organization)
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  plan            TEXT NOT NULL DEFAULT 'standard',
  status          TEXT NOT NULL DEFAULT 'trial',  -- 'trial'|'active'|'overdue'|'suspended'
  monthly_fee     NUMERIC(10,2) NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at   TIMESTAMPTZ,
  next_due_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. users (links to Supabase auth.users)
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name         TEXT,
  email        TEXT,
  role         TEXT NOT NULL DEFAULT 'staff',  -- 'owner'|'manager'|'staff'|'kitchen'
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

-- 4. user_organizations (many-to-many, for multi-org support)
CREATE TABLE user_organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role            TEXT NOT NULL DEFAULT 'staff',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. super_admins (your team — manages all clients)
CREATE TABLE super_admins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_tenants_org        ON tenants(organization_id);
CREATE INDEX idx_users_org          ON users(organization_id);
CREATE INDEX idx_users_auth         ON users(auth_user_id);
CREATE INDEX idx_user_orgs_user     ON user_organizations(user_id);
CREATE INDEX idx_user_orgs_org      ON user_organizations(organization_id);
