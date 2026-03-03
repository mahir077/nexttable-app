import { supabase } from '@/lib/supabase-client'

// Shared helpers for stock_movements and stock_summary.

export async function insertStockMovements(
  rows: Array<Record<string, unknown>>
) {
  if (!rows.length) {
    return { data: null, error: null }
  }

  const { error } = await supabase.from('stock_movements').insert(rows)
  if (error) return { data: null, error }

  // Update stock_summary for each item
  const orgId = rows[0].organization_id as string
  const byItem: Record<string, number> = {}
  rows.forEach(r => {
    const id = r.menu_item_id as string
    byItem[id] = (byItem[id] ?? 0) + (Number(r.total_value) || 0)
  })

  for (const [menuItemId, inValue] of Object.entries(byItem)) {
    const { data: row } = await supabase
      .from('stock_summary')
      .select('total_in_value, current_value')
      .eq('menu_item_id', menuItemId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (row) {
      await supabase
        .from('stock_summary')
        .update({
          total_in_value: (Number(row.total_in_value) || 0) + inValue,
          current_value: (Number(row.current_value) || 0) + inValue,
          last_updated: new Date().toISOString(),
        })
        .eq('menu_item_id', menuItemId)
        .eq('organization_id', orgId)
    } else {
      await supabase
        .from('stock_summary')
        .insert({
          menu_item_id: menuItemId,
          organization_id: orgId,
          total_in_value: inValue,
          current_value: inValue,
          opening_value: 0,
          total_out_value: 0,
          last_updated: new Date().toISOString(),
        })
    }
  }

  return { data: null, error: null }
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
      // ignore
    }
  }

  const { error } = await supabase.from('stock_movements').insert(insertPayload)
  if (error) return { error }

  // Update stock_summary
  const inValue = Number(payload.total_value) || 0
  const { data: row } = await supabase
    .from('stock_summary')
    .select('total_in_value, current_value')
    .eq('menu_item_id', payload.menu_item_id)
    .eq('organization_id', payload.organization_id)
    .maybeSingle()

  if (row) {
    await supabase
      .from('stock_summary')
      .update({
        total_in_value: (Number(row.total_in_value) || 0) + inValue,
        current_value: (Number(row.current_value) || 0) + inValue,
        last_updated: new Date().toISOString(),
      })
      .eq('menu_item_id', payload.menu_item_id)
      .eq('organization_id', payload.organization_id)
  } else {
    await supabase
      .from('stock_summary')
      .insert({
        menu_item_id: payload.menu_item_id,
        organization_id: payload.organization_id,
        total_in_value: inValue,
        current_value: inValue,
        opening_value: 0,
        total_out_value: 0,
        last_updated: new Date().toISOString(),
      })
  }

  return { error: null }
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

