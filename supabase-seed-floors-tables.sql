-- Seed Floors & Tables for NextTable
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Insert floors (skip if name already exists)
INSERT INTO floors (name, display_order, is_active)
SELECT v.name, v.display_order, v.is_active
FROM (VALUES
  ('Ground Floor', 0, true),
  ('1st Floor', 1, true),
  ('Rooftop', 2, true)
) AS v(name, display_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM floors f WHERE f.name = v.name);

-- 2. Insert tables per floor (only if that floor+table_number doesn't exist)
-- Ground Floor: Tables 1–6
INSERT INTO tables (floor_id, table_number, seats, status, is_active)
SELECT f.id, t.table_number, t.seats, 'available', true
FROM floors f
CROSS JOIN (VALUES (1, 4), (2, 4), (3, 2), (4, 6), (5, 4), (6, 4)) AS t(table_number, seats)
WHERE f.name = 'Ground Floor' AND f.is_active = true
  AND NOT EXISTS (SELECT 1 FROM tables tb WHERE tb.floor_id = f.id AND tb.table_number = t.table_number);

-- 1st Floor: Tables 1–5
INSERT INTO tables (floor_id, table_number, seats, status, is_active)
SELECT f.id, t.table_number, t.seats, 'available', true
FROM floors f
CROSS JOIN (VALUES (1, 4), (2, 4), (3, 6), (4, 2), (5, 4)) AS t(table_number, seats)
WHERE f.name = '1st Floor' AND f.is_active = true
  AND NOT EXISTS (SELECT 1 FROM tables tb WHERE tb.floor_id = f.id AND tb.table_number = t.table_number);

-- Rooftop: Tables 1–4
INSERT INTO tables (floor_id, table_number, seats, status, is_active)
SELECT f.id, t.table_number, t.seats, 'available', true
FROM floors f
CROSS JOIN (VALUES (1, 4), (2, 6), (3, 8), (4, 4)) AS t(table_number, seats)
WHERE f.name = 'Rooftop' AND f.is_active = true
  AND NOT EXISTS (SELECT 1 FROM tables tb WHERE tb.floor_id = f.id AND tb.table_number = t.table_number);
