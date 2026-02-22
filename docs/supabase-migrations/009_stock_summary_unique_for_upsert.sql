-- Required for stock_summary upsert in app (Set Opening Balance)
-- Run in Supabase SQL Editor if you get: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- If you had a single-column unique on menu_item_id, drop it first (multi-tenant needs per-org):
-- ALTER TABLE stock_summary DROP CONSTRAINT IF EXISTS stock_summary_menu_item_id_key;

-- Add unique on (menu_item_id, organization_id) so upsert can use ON CONFLICT (menu_item_id, organization_id)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.stock_summary'::regclass
    AND conname = 'stock_summary_menu_item_org_unique'
  ) THEN
    ALTER TABLE stock_summary
    ADD CONSTRAINT stock_summary_menu_item_org_unique
    UNIQUE (menu_item_id, organization_id);
  END IF;
END $$;
