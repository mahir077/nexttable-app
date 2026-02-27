import { supabase } from '@/lib/supabase-client'

// Organization and settings helpers shared across Settings, Dashboard, AuthContext, etc.

export async function fetchOrganizationById(orgId: string) {
  return supabase
    .from('organizations')
    .select('id, name, slug, display_name')
    .eq('id', orgId)
    .single()
}

export async function fetchRestaurantSettingsForOrg(orgId: string) {
  return supabase
    .from('restaurant_settings')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()
}

export async function fetchRestaurantDisplayName(orgId: string) {
  return supabase
    .from('restaurant_settings')
    .select('display_name')
    .eq('organization_id', orgId)
    .limit(1)
    .maybeSingle<{ display_name?: string }>()
}

export async function upsertRestaurantSettings(
  orgId: string,
  fields: {
    display_name: string
    address?: string | null
    phone?: string | null
    email?: string | null
    updated_at?: string
  }
) {
  const { display_name, address, phone, email, updated_at } = fields

  const base = {
    display_name,
    address: address ?? null,
    phone: phone ?? null,
    email: email ?? null,
    ...(updated_at && { updated_at }),
  }

  const { data: existing } = await supabase
    .from('restaurant_settings')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return supabase
      .from('restaurant_settings')
      .update(base)
      .eq('id', existing.id)
  }

  return supabase
    .from('restaurant_settings')
    .insert({
      organization_id: orgId,
      ...base,
    })
}

export async function updateOrganizationDisplayName(
  orgId: string,
  displayName: string,
  updatedAt: string
) {
  return supabase
    .from('organizations')
    .update({ display_name: displayName, updated_at: updatedAt })
    .eq('id', orgId)
}

// Invoice settings

export async function fetchInvoiceSettings(orgId: string) {
  return supabase
    .from('invoice_settings')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()
}

export async function upsertInvoiceSettings(
  orgId: string,
  data: Record<string, unknown>,
  updatedAt: string
) {
  const { data: existing } = await supabase
    .from('invoice_settings')
    .select('id')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (existing) {
    return supabase
      .from('invoice_settings')
      .update({ ...data, updated_at: updatedAt })
      .eq('id', existing.id)
      .eq('organization_id', orgId)
  }

  return supabase
    .from('invoice_settings')
    .insert({ ...data, organization_id: orgId, updated_at: updatedAt })
}

