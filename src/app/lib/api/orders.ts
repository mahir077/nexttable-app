import { createClient } from '@supabase/supabase-js'
import { CartItem } from './menu'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types
export interface Order {
  id: string
  order_number: string
  table_id: string | null
  order_type: 'dine-in' | 'takeaway' | 'online' | 'event'
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled'
  subtotal: number
  tax: number
  discount: number
  total: number
  customer_name?: string
  customer_phone?: string
  notes?: string
  created_at: string
  updated_at: string
  payment_method?: string
  paid_at?: string
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string | null
  item_name: string
  item_name_bangla: string | null
  quantity: number
  unit_price: number
  subtotal: number
  notes?: string
  status: 'pending' | 'preparing' | 'ready' | 'served'
  created_at: string
}

export interface CreateOrderData {
  table_id?: string
  order_type: 'dine-in' | 'takeaway' | 'online' | 'event'
  items: CartItem[]
  customer_name?: string
  customer_phone?: string
  notes?: string
}

// Generate order number
async function generateOrderNumber(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_order_number')
  if (error) {
    console.error('Error generating order number:', error)
    // Fallback: Generate based on timestamp
    return `ORD${Date.now().toString().slice(-6)}`
  }
  return data
}

// Create new order
export async function createOrder(orderData: CreateOrderData): Promise<Order | null> {
  try {
    // Calculate totals
    const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const tax = 0
    const total = subtotal + tax

    // Generate order number
    const orderNumber = await generateOrderNumber()

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        table_id: orderData.table_id || null,
        order_type: orderData.order_type,
        status: 'pending',
        subtotal: subtotal,
        tax: tax,
        discount: 0,
        total: total,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        notes: orderData.notes
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Create order items
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      menu_item_id: item.id,
      item_name: item.name,
      item_name_bangla: item.name_bangla,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.price * item.quantity,
      notes: item.notes,
      status: 'pending' as const
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    return order
  } catch (error) {
    console.error('Error creating order:', error)
    return null
  }
}

// Get all orders
export async function getOrders(status?: string): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get order with items
export async function getOrderWithItems(orderId: string) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderError) throw orderError

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)

  if (itemsError) throw itemsError

  return { order, items }
}

// Update order status
export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) {
    console.error('Error updating order status:', error)
    return false
  }
  return true
}

// Get orders ready for billing (ready or served)
export async function getOrdersForBilling(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['ready', 'served'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Mark order as served via RPC
export async function markOrderAsServed(orderId: string): Promise<boolean> {
  const { error } = await supabase.rpc('mark_order_served', { order_id: orderId })

  if (error) {
    console.error('Error marking order as served:', error)
    return false
  }
  return true
}

// Process payment via RPC
export async function processPayment(orderId: string, paymentMethod: string): Promise<boolean> {
  const { error } = await supabase.rpc('process_payment', {
    order_id: orderId,
    payment_type: paymentMethod
  })

  if (error) {
    console.error('Error processing payment:', error)
    return false
  }
  return true
}

// Get paid orders (for history/reports)
export async function getPaidOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
}

// --- Analytics types ---
export interface TodayStats {
  totalRevenue: number
  totalOrders: number
  paymentBreakdown: Record<string, number>
  popularItems: { name: string; name_bangla: string | null; quantity: number; revenue: number }[]
  orders: Order[]
}

export interface WeeklyStats {
  totalRevenue: number
  totalOrders: number
  dailyRevenue: Record<string, number>
}

function getStartOfTodayISO(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function getEndOfTodayISO(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

function getStartOfDaysAgoISO(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// Today's statistics (paid orders only)
export async function getTodayStats(): Promise<TodayStats> {
  const empty: TodayStats = {
    totalRevenue: 0,
    totalOrders: 0,
    paymentBreakdown: {},
    popularItems: [],
    orders: []
  }

  try {
    const startOfToday = getStartOfTodayISO()
    const endOfToday = getEndOfTodayISO()

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'paid')
      .gte('paid_at', startOfToday)
      .lte('paid_at', endOfToday)
      .order('paid_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching today orders:', ordersError)
      return empty
    }

    const orderList = orders || []

    const totalRevenue = orderList.reduce((sum, o) => sum + o.total, 0)
    const totalOrders = orderList.length

    const paymentBreakdown: Record<string, number> = {}
    for (const o of orderList) {
      const method = o.payment_method || 'unknown'
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + o.total
    }

    let popularItems: TodayStats['popularItems'] = []
    if (orderList.length > 0) {
      const orderIds = orderList.map(o => o.id)
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('item_name, item_name_bangla, quantity, subtotal')
        .in('order_id', orderIds)

      if (!itemsError && items?.length) {
        const byItem = new Map<string, { name: string; name_bangla: string | null; quantity: number; revenue: number }>()
        for (const row of items as { item_name: string; item_name_bangla: string | null; quantity: number; subtotal: number }[]) {
          const key = `${row.item_name}|${row.item_name_bangla ?? ''}`
          const existing = byItem.get(key)
          if (existing) {
            existing.quantity += row.quantity
            existing.revenue += row.subtotal
          } else {
            byItem.set(key, {
              name: row.item_name,
              name_bangla: row.item_name_bangla,
              quantity: row.quantity,
              revenue: row.subtotal
            })
          }
        }
        popularItems = Array.from(byItem.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10)
      }
    }

    return {
      totalRevenue,
      totalOrders,
      paymentBreakdown,
      popularItems,
      orders: orderList
    }
  } catch (error) {
    console.error('Error in getTodayStats:', error)
    return empty
  }
}

// Last 7 days statistics (paid orders only)
export async function getWeeklyStats(): Promise<WeeklyStats> {
  const empty: WeeklyStats = {
    totalRevenue: 0,
    totalOrders: 0,
    dailyRevenue: {}
  }

  try {
    const startOfWeek = getStartOfDaysAgoISO(7)
    const endOfToday = getEndOfTodayISO()

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, paid_at')
      .eq('status', 'paid')
      .gte('paid_at', startOfWeek)
      .lte('paid_at', endOfToday)

    if (error) {
      console.error('Error fetching weekly orders:', error)
      return empty
    }

    const orderList = orders || []

    const totalRevenue = orderList.reduce((sum, o) => sum + o.total, 0)
    const totalOrders = orderList.length

    const dailyRevenue: Record<string, number> = {}
    for (const o of orderList) {
      const dateStr = o.paid_at ? o.paid_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
      dailyRevenue[dateStr] = (dailyRevenue[dateStr] || 0) + o.total
    }

    return {
      totalRevenue,
      totalOrders,
      dailyRevenue
    }
  } catch (error) {
    console.error('Error in getWeeklyStats:', error)
    return empty
  }
}