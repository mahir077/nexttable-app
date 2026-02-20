-- Add making_cost to menu_items (cost to make the item; profit = price - making_cost)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS making_cost numeric(10,2) DEFAULT 0;
