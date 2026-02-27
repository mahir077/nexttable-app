-- Add your Supabase Auth user as super admin.
-- 1. Open Supabase Dashboard → Authentication → Users
-- 2. Find sadmanislam856@gmail.com and copy the "User UID"
-- 3. Replace the placeholder below with that UUID, then run this migration.

INSERT INTO super_admins (auth_user_id, name, email, is_active)
VALUES (
  '33c04134-ca3c-4570-ab75-c2ab75016b19'::uuid,  -- ← Replace with your Auth User UID from Supabase
  'Super Admin',
  'sadmanislam856@gmail.com',
  true
)
ON CONFLICT (auth_user_id) DO NOTHING;
