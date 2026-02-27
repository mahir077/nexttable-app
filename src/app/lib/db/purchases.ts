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
    .select('id, name, making_cost')
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

