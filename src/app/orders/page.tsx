'use client'

import { useState, useEffect } from 'react'
import { getPaidOrders, getOrderWithItems, type Order, type OrderItem } from '@/app/lib/api/orders'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<{ order: Order; items: OrderItem[] } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch paid orders
  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await getPaidOrders()
        setOrders(data)
        setFilteredOrders(data)
      } catch (error) {
        console.error('Error fetching order history:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  // Search orders
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOrders(orders)
    } else {
      const filtered = orders.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredOrders(filtered)
    }
  }, [searchTerm, orders])

  // View order details
  const viewOrderDetails = async (order: Order) => {
    try {
      const data = await getOrderWithItems(order.id)
      setSelectedOrder(data)
    } catch (error) {
      console.error('Error fetching order details (history):', error)
    }
  }

  // Print receipt
  const handlePrint = () => {
    window.print()
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calculate today's total
  const todayTotal = orders
    .filter(order => {
      const orderDate = new Date(order.paid_at ?? order.updated_at).toDateString()
      const today = new Date().toDateString()
      return orderDate === today
    })
    .reduce((sum, order) => sum + order.total, 0)

  const todayCount = orders.filter(order => {
    const orderDate = new Date(order.paid_at ?? order.updated_at).toDateString()
    const today = new Date().toDateString()
    return orderDate === today
  }).length

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-brand font-black text-slate-900 mb-4">📋 ORDER HISTORY</h1>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
            <div className="text-sm text-slate-500 mb-1">TOTAL ORDERS</div>
            <div className="text-3xl font-brand font-black text-slate-900">{orders.length}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
            <div className="text-sm text-slate-500 mb-1">TODAY'S ORDERS</div>
            <div className="text-3xl font-brand font-black text-blue-600">{todayCount}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
            <div className="text-sm text-slate-500 mb-1">TODAY'S REVENUE</div>
            <div className="text-3xl font-brand font-black text-emerald-600">৳{todayTotal.toFixed(2)}</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by order number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-lg"
          />
          <svg className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl text-slate-500">Loading orders...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <div className="text-8xl mb-4">📋</div>
          <p className="text-2xl font-bold">
            {searchTerm ? 'No orders found' : 'No order history yet'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-6 py-2 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600">ORDER #</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600">DATE & TIME</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600">TYPE</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600">PAYMENT</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-600">AMOUNT</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-600">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-emerald-600">
                        #{order.order_number.replace('ORD', '')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(order.paid_at ?? order.updated_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase">
                        {order.order_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase">
                        {order.payment_method ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-lg font-bold text-slate-900">
                        ৳{order.total.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => viewOrderDetails(order)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Receipt Header */}
            <div className="text-center mb-8 print:mb-4">
              <h2 className="text-4xl font-brand font-black text-slate-900 mb-2">NextTable</h2>
              <p className="text-slate-600">Restaurant Control Hub</p>
              <div className="text-sm text-slate-500 mt-2">
                Order Date: {formatDate(selectedOrder.order.created_at)}
              </div>
              <div className="text-sm text-slate-500">
                Paid: {formatDate(selectedOrder.order.paid_at ?? selectedOrder.order.updated_at)}
              </div>
            </div>

            {/* Order Number */}
            <div className="bg-slate-100 rounded-2xl p-4 mb-6 text-center print:bg-white print:border">
              <div className="text-sm text-slate-600 mb-1">ORDER NUMBER</div>
              <div className="text-4xl font-brand font-black text-emerald-600">
                #{selectedOrder.order.order_number.replace('ORD', '')}
              </div>
            </div>

            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">TYPE</div>
                <div className="font-bold text-slate-900 uppercase">{selectedOrder.order.order_type}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">PAYMENT</div>
                <div className="font-bold text-slate-900 uppercase">{selectedOrder.order.payment_method ?? '—'}</div>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">ORDER ITEMS</h3>
              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start py-3 border-b border-slate-200">
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{item.item_name}</div>
                      {item.item_name_bangla && (
                        <div className="text-sm text-slate-500">{item.item_name_bangla}</div>
                      )}
                      <div className="text-sm text-slate-600 mt-1">
                        ৳{item.unit_price.toFixed(2)} × {item.quantity}
                      </div>
                    </div>
                    <div className="font-bold text-lg text-slate-900">
                      ৳{item.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t-2 border-slate-300 pt-4 mb-6">
              <div className="flex justify-between text-2xl font-brand font-black text-slate-900">
                <span>TOTAL PAID:</span>
                <span className="text-emerald-600">৳{selectedOrder.order.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
              >
                🖨️ Print Receipt
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
              >
                Close
              </button>
            </div>

            {/* Thank You (Print only) */}
            <div className="hidden print:block text-center mt-8 pt-4 border-t">
              <p className="text-lg font-bold">Thank You for Your Visit!</p>
              <p className="text-sm text-slate-600">Please visit again</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
