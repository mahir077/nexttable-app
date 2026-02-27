-- ============================================================
-- NextTable Migration 006: Super Admin Restaurant Onboarding
-- Function: create_restaurant_with_owner(auth_user_id, name, owner_name, owner_email)
-- Purpose:
--   - Super admin can create a new restaurant (organization)
--   - Automatically create:
--       * organizations row
--       * users row for owner
--       * user_organizations mapping
--       * basic restaurant_settings
-- Notes:
--   - Requires is_super_admin() from 005_rls.sql
--   - Intended for Supabase RPC call from /admin/dashboard
-- ============================================================

create or replace function public.create_restaurant_with_owner(
  p_auth_user_id uuid,
  p_restaurant_name text,
  p_owner_name text,
  p_owner_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id  uuid;
  v_user_id uuid;
begin
  -- Only super admins can onboard new restaurants
  if not is_super_admin() then
    raise exception 'not allowed';
  end if;

  if p_auth_user_id is null then
    raise exception 'auth_user_id is required';
  end if;

  if coalesce(trim(p_restaurant_name), '') = '' then
    raise exception 'restaurant name is required';
  end if;

  -- 1) Create organization
  insert into organizations (id, name, is_active)
  values (gen_random_uuid(), p_restaurant_name, true)
  returning id into v_org_id;

  -- 2) Owner user row (links to Supabase auth.users)
  insert into users (
    id,
    auth_user_id,
    organization_id,
    name,
    email,
    role,
    is_active
  )
  values (
    gen_random_uuid(),
    p_auth_user_id,
    v_org_id,
    coalesce(nullif(trim(p_owner_name), ''), p_owner_email),
    p_owner_email,
    'owner',
    true
  )
  returning id into v_user_id;

  -- 3) user_organizations mapping
  insert into user_organizations (
    id,
    user_id,
    organization_id,
    role,
    is_active
  )
  values (
    gen_random_uuid(),
    v_user_id,
    v_org_id,
    'owner',
    true
  );

  -- 4) Basic restaurant_settings entry
  insert into restaurant_settings (
    id,
    organization_id,
    display_name
  )
  values (
    gen_random_uuid(),
    v_org_id,
    p_restaurant_name
  );

  return v_org_id;
end;
$$;

-- Allow authenticated/service_role to execute (RLS still gates by is_super_admin())
grant execute on function public.create_restaurant_with_owner(uuid, text, text, text)
  to authenticated, service_role;

