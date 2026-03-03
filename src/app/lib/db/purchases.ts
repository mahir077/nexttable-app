import { supabase } from '@/lib/supabase-client'

// Purchases, suppliers, and related helpers.

export async function fetchPurchasesWithSuppliers(orgId: string) {
  return supabase
    .from('purchases')
    .select('*, supplier:suppliers(name)')
    .eq('organization_id', orgId)
    .order('purchase_date', { ascending: false })
}

export async function fetchActiveSuppliers(orgId: string) {
  return supabase
    .from('suppliers')
    .select('id, name')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name')
}

export async function fetchMenuItemsForPurchases(orgId: string) {
  return supabase
    .from('menu_items')
    .select('id, name, cost')
    .eq('organization_id', orgId)
    .order('name')
}

export interface PurchaseInsertPayload {
  supplier_id: string
  purchase_date: string
  total_amount: number
  paid_amount: number
  payment_status: string
  notes: string
  organization_id?: string
}

export async function createPurchase(payload: PurchaseInsertPayload) {
  return supabase
    .from('purchases')
    .insert(payload)
    .select()
    .single()
}

export async function insertPurchaseItems(
  rows: Array<Record<string, unknown>>
) {
  if (!rows.length) {
    return { data: null, error: null }
  }

  return supabase.from('purchase_items').insert(rows)
}

export async function getOrCreateRawMaterialMenuItemId(orgId: string): Promise<string | null> {
  const RAW_NAME = 'বাজার / Raw material'

  const { data: existing, error: findErr } = await fetchMenuItemsForPurchases(orgId)
  if (!findErr && Array.isArray(existing)) {
    const raw = (existing as Array<{ id: string; name: string }>).find(i => i.name === RAW_NAME)
    if (raw?.id) return raw.id
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)

  let categoryId = categories?.[0]?.id as string | undefined
  if (!categoryId) {
    const { data: newCat, error: catErr } = await supabase
      .from('categories')
      .insert({ name: 'Stock', display_order: 999, organization_id: orgId, is_active: true })
      .select('id')
      .single()
    if (catErr || !newCat) {
      console.error('Create category for bazaar:', catErr)
      return null
    }
    categoryId = (newCat as { id: string }).id
  }

  if (!categoryId) return null

  const { data: newItem, error: itemErr } = await supabase
    .from('menu_items')
    .insert({
      name: RAW_NAME,
      category_id: categoryId,
      price: 0,
      cost: 0,
      is_available: false,
      organization_id: orgId,
    })
    .select('id')
    .single()

  if (itemErr || !newItem) {
    console.error('Create raw material menu item:', itemErr)
    return null
  }

  return (newItem as { id: string }).id ?? null
}


