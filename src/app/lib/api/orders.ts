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