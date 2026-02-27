import { supabase } from '@/lib/supabase-client'

// Shared helpers for stock_movements and stock_summary.

export async function insertStockMovements(
  rows: Array<Record<string, unknown>>
) {
  if (!rows.length) {
    return { data: null, error: null }
  }

  return supabase.from('stock_movements').insert(rows)
}

export interface BazaarStockPayload {
  menu_item_id: string
  movement_type: 'purchase'
  quantity: number
  unit_cost: number
  total_value: number
  notes: string | null
  organization_id: string
}

export async function insertBazaarStockMovement(
  payload: BazaarStockPayload,
  movementDate?: string
) {
  let insertPayload: BazaarStockPayload & { movement_date?: string } = {
    ...payload,
  }

  if (movementDate) {
    insertPayload.movement_date = movementDate
  } else {
    try {
      insertPayload.movement_date = new Date().toISOString().slice(0, 19)
    } catch {
      // ignore; will fall back without movement_date if needed
    }
  }

  const { error } = await supabase.from('stock_movements').insert(insertPayload)
  if (!error) return { error: null }

  const msg = (error as { message?: string }).message ?? ''
  if (msg.includes('movement_date') || msg.includes('column')) {
    const { error: err2 } = await supabase.from('stock_movements').insert(payload)
    if (err2) return { error: err2 }
    return { error: null }
  }

  return { error }
}

// Ledger page helpers

export function getStockMovementsBaseQuery(orgId: string) {
  return supabase
    .from('stock_movements')
    .select(
      `
        *,
        menu_item:menu_items(name, category:categories(name))
      `
    )
    .eq('organization_id', orgId)
    .order('movement_date', { ascending: false })
    .limit(200)
}

export function getStockMovementsFallbackQuery(orgId: string) {
  return supabase
    .from('stock_movements')
    .select('*, menu_item:menu_items(name)')
    .eq('organization_id', orgId)
    .order('movement_date', { ascending: false })
    .limit(200)
}

export function getStockMovementsBareQuery(orgId: string) {
  return supabase
    .from('stock_movements')
    .select('*')
    .eq('organization_id', orgId)
    .order('movement_date', { ascending: false })
    .limit(200)
}

// Reports page helpers for stock_summary

export function getStockSummaryBaseQuery(orgId: string) {
  return supabase
    .from('stock_summary')
    .select(
      `
        *,
        menu_item:menu_items(name, category:categories(name))
      `
    )
    .eq('organization_id', orgId)
}

export function getStockSummaryFallbackQuery(orgId: string) {
  return supabase
    .from('stock_summary')
    .select('*')
    .eq('organization_id', orgId)
}

