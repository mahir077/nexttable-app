import { supabase, ensureSession } from '@/lib/supabase-client'

// Organization and settings helpers shared across Settings, Dashboard, AuthContext, etc.

export async function fetchOrganizationById(orgId: string) {
  return supabase
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single()
}

export async function fetchRestaurantSettingsForOrg(orgId: string) {
  await ensureSession()
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
  await ensureSession()
  const { display_name, address, phone, email, updated_at } = fields
  return supabase
    .from('restaurant_settings')
    .upsert(
      {
        organization_id: orgId,
        display_name,
        address: address ?? null,
        phone: phone ?? null,
        email: email ?? null,
        ...(updated_at && { updated_at }),
      },
      { onConflict: 'organization_id' }
    )
}

export async function updateOrganizationDisplayName(
  orgId: string,
  displayName: string,
  updatedAt: string
) {
  await ensureSession()
  return supabase
    .from('organizations')
    .update({ name: displayName, updated_at: updatedAt })
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

