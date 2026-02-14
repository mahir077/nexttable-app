'use client'

import { useState, useEffect } from 'react'
import { getOrders, getOrderWithItems, updateOrderStatus } from '@/app/lib/api/orders'

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
}

interface OrderItem {
  id: string
  item_name: string
  item_name_bangla: string | null
  quantity: number
  notes?: string
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<{ order: Order; items: OrderItem[] } | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch pending orders
  const fetchOrders = async () => {
    try {
      const data = await getOrders()
      // Filter for pending and preparing orders only
      const activeOrders = data.filter(order => 
        order.status === 'pending' || order.status === 'preparing'
      )
      setOrders(activeOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  // View order details
  const viewOrderDetails = async (order: Order) => {
    try {
      const data = await getOrderWithItems(order.id)
      setSelectedOrder(data)
    } catch (error) {
      console.error('Error fetching order details:', error)
    }
  }

  // Update order status
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const success = await updateOrderStatus(orderId, newStatus)
    if (success) {
      fetchOrders()
      setSelectedOrder(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500'
      case 'preparing': return 'bg-blue-500'
      case 'ready': return 'bg-emerald-500'
      default: return 'bg-slate-500'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-brand font-black mb-2">🔥 KITCHEN DISPLAY</h1>
        <div className="flex items-center gap-4">
          <p className="text-slate-400">Active Orders: <span className="text-white font-bold text-2xl">{orders.length}</span></p>
          <div className="flex items-center gap-2 text-emerald-400">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Live Updates</span>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl text-slate-400">Loading orders...</div>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <div className="text-8xl mb-4">✨</div>
          <p className="text-2xl font-bold">All Clear!</p>
          <p className="text-lg">No pending orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => viewOrderDetails(order)}
              className="bg-slate-800 rounded-2xl p-6 border-2 border-slate-700 hover:border-emerald-500 transition-all text-left"
            >
              {/* Order Number */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-slate-400 mb-1">ORDER</div>
                  <div className="text-3xl font-brand font-black text-emerald-400">
                    #{order.order_number.replace('ORD', '')}
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full ${getStatusColor(order.status)} text-white font-bold text-sm uppercase`}>
                  {order.status}
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center gap-2 text-slate-400 mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-lg">{formatTime(order.created_at)}</span>
              </div>

              {/* Total */}
              <div className="text-2xl font-bold text-white">
                ৳{order.total.toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-slate-800 rounded-3xl p-8 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">ORDER DETAILS</div>
                <div className="text-4xl font-brand font-black text-emerald-400">
                  #{selectedOrder.order.order_number.replace('ORD', '')}
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="mb-6 space-y-3">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="bg-slate-700 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xl font-bold mb-1">{item.item_name}</div>
                      {item.item_name_bangla && (
                        <div className="text-sm text-slate-400 mb-2">{item.item_name_bangla}</div>
                      )}
                      {item.notes && (
                        <div className="text-sm text-orange-400 mt-2">
                          📝 {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-3xl font-brand font-black text-emerald-400 ml-4">
                      ×{item.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Status Actions */}
            <div className="flex gap-3">
              {selectedOrder.order.status === 'pending' && (
                <button
                  onClick={() => handleStatusUpdate(selectedOrder.order.id, 'preparing')}
                  className="flex-1 py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg transition-colors"
                >
                  🔥 Start Preparing
                </button>
              )}
              {selectedOrder.order.status === 'preparing' && (
                <button
                  onClick={() => handleStatusUpdate(selectedOrder.order.id, 'ready')}
                  className="flex-1 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition-colors"
                >
                  ✅ Mark as Ready
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
