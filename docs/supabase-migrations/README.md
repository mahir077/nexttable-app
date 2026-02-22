# Supabase migrations – NextTable

## How to run

1. Open **Supabase Dashboard** → your project → **SQL Editor**.
2. Copy the contents of `001_multi_tenant_organization_id.sql`.
3. Paste and click **Run**.
4. If any table or column already exists, the migration uses `IF NOT EXISTS` / `DROP POLICY IF EXISTS` so it’s safe to run once.

## If dashboard floors/tables don’t load (RLS / “Auth RLS Initialization Plan”)

Run **`010_fix_floors_tables_rls.sql`** in the SQL Editor. It reapplies the correct RLS policies and helper for `floors` and `tables` so the app can load them.

## After running

- All listed tables will have an `organization_id` column and RLS so each organization only sees its own data.
- In the app, every **INSERT** (floors, tables, categories, menu items, orders, etc.) must include `organization_id: useAuth().organization?.id`.
- Existing rows with `organization_id = NULL` remain visible to everyone (legacy). New rows should always set `organization_id`.
