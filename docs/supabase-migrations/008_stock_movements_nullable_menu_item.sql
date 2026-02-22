-- Allow raw material / bazaar purchase entries (no specific menu item)
-- Run in Supabase SQL Editor if your stock_movements.menu_item_id is NOT NULL

ALTER TABLE stock_movements
  ALTER COLUMN menu_item_id DROP NOT NULL;

-- Optional: add a check so either menu_item_id is set OR (movement_type = 'purchase' and total_value > 0)
-- Comment out if you prefer no constraint:
-- ALTER TABLE stock_movements ADD CONSTRAINT chk_movement_item_or_bulk
--   CHECK (menu_item_id IS NOT NULL OR (movement_type IN ('purchase', 'opening') AND total_value > 0));
