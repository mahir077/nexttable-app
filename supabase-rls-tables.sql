-- Run this in Supabase SQL Editor if table creation fails (e.g. RLS blocking).
-- Ensures the tables table allows all operations for the anon role.

-- Option 1: Disable RLS (simplest for development)
-- ALTER TABLE tables DISABLE ROW LEVEL SECURITY;

-- Option 2: Enable RLS with a permissive policy (recommended for production)
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on tables" ON tables;

CREATE POLICY "Allow all operations on tables"
ON tables
FOR ALL
USING (true)
WITH CHECK (true);
