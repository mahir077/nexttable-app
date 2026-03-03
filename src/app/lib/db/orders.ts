import { supabase } from '@/lib/supabase-client'

// Generic helpers for the orders and order_items tables.

export async function updateOrderStatus(
  orgId: string,
  orderId: string,
  status: string
) {
  return supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('organization_id', orgId)
}

export async function createOrder<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
  TRow = any
>(payload: TPayload) {
  return supabase
    .from('orders')
    .insert(payload)
    .select()
    .single<TRow>()
}

export async function insertOrderItems<TItem extends Record<string, unknown> = Record<string, unknown>>(
  items: TItem[]
) {
  return supabase.from('order_items').insert(items)
}

export async function deleteOrderItemsByOrder(
  orgId: string,
  orderId: string
) {
  return supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId)
    .eq('organization_id', orgId)
}

export async function updateOrderTotals(
  orgId: string,
  orderId: string,
  fields: {
    subtotal: number
    total?: number
    updated_at?: string
  }
) {
  const { subtotal, total, updated_at } = fields
  const update: Record<string, unknown> = {
    subtotal,
    total: typeof total === 'number' ? total : subtotal,
  }
  if (updated_at) update.updated_at = updated_at

  return supabase
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .eq('organization_id', orgId)
}

export async function deleteOrderById(orgId: string, orderId: string) {
  return supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .eq('organization_id', orgId)
}

export async function rejectOrder(
  orgId: string,
  orderId: string,
  reason: string,
  rejectedBy: string
) {
  return supabase
    .from('orders')
    .update({
      status: 'rejected',
      rejected_by: rejectedBy,
      reject_reason: reason,
    })
    .eq('id', orderId)
    .eq('organization_id', orgId)
}

// Dashboard helpers

export async function fetchActiveOrdersByTables(
  orgId: string,
  tableIds: string[],
  statuses: string[]
) {
  if (!tableIds.length || !statuses.length) {
    return { data: [] as any[], error: null }
  }

  return supabase
    .from('orders')
    .select('table_id, status, total')
    .eq('organization_id', orgId)
    .in('table_id', tableIds)
    .in('status', statuses)
}

export async function fetchOrdersForTablesMerge(
  orgId: string,
  tableIds: string[],
  statuses: string[]
) {
  if (!tableIds.length || !statuses.length) {
    return { data: [] as any[], error: null }
  }

  return supabase
    .from('orders')
    .select('id')
    .eq('organization_id', orgId)
    .in('table_id', tableIds)
    .in('status', statuses)
}

export async function moveOrdersToTable(
  orgId: string,
  orderIds: string[],
  newTableId: string,
  updatedAt: string
) {
  if (!orderIds.length) {
    return { data: null, error: null }
  }

  return supabase
    .from('orders')
    .update({ table_id: newTableId, updated_at: updatedAt })
    .eq('organization_id', orgId)
    .in('id', orderIds)
}

export async function updateOrderTable(
  orgId: string,
  orderId: string,
  newTableId: string,
  updatedAt: string
) {
  return supabase
    .from('orders')
    .update({ table_id: newTableId, updated_at: updatedAt })
    .eq('id', orderId)
    .eq('organization_id', orgId)
}

// Reports helpers

export function getOrdersReportBaseQuery(orgId: string) {
  return supabase
    .from('orders')
    .select(`
      id,
      total,
      created_at,
      payment_method,
      order_type,
      status,
      order_items (
        quantity,
        unit_price,
        item_name,
        menu_item:menu_items (
          name,
          category:categories(name),
          cost
        )
      )
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
}

export function getOrdersReportFallbackQuery(orgId: string) {
  return supabase
    .from('orders')
    .select(
      'id, total, created_at, payment_method, status, order_items (quantity, unit_price, item_name, menu_item_id, menu_item:menu_items (name, cost))'
    )
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
}

// Active dine-in orders for table change modal

export async function fetchActiveDineInOrders(orgId: string) {
  return supabase
    .from('orders')
    .select('id, organization_id, table_id, token_number, total, subtotal, discount_amount, tax_rate, tax_amount, status, payment_method, discount_type, notes, reject_reason, rejected_by, created_by, created_at, updated_at, closed_at, deleted_at')
    .eq('organization_id', orgId)
    .not('table_id', 'is', null)
    .in('status', ['pending', 'preparing', 'ready', 'served'])
    .order('created_at', { ascending: false })
}


