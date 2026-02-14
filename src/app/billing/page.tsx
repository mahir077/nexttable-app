'use client'

import { useState, useEffect } from 'react'
import { getOrdersForBilling, getOrderWithItems, processPayment } from '@/app/lib/api/orders'

interface Order {
  id: string
  order_number: string
  table_id: string | null
  status: string
  subtotal: number
  tax: number
  total: number
  created_at: string
}

interface OrderItem {
  id: string
  item_name: string
  item_name_bangla: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export default function BillingPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<{ order: Order; items: OrderItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)

  // Fetch orders ready for billing
  const fetchOrders = async () => {
    try {
      const data = await getOrdersForBilling()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000)
    return () => clearInterval(interval)
  }, [])

  // View order details for billing
  const viewBill = async (order: Order) => {
    try {
      const data = await getOrderWithItems(order.id)
      setSelectedOrder(data)
    } catch (error) {
      console.error('Error fetching order details:', error)
    }
  }

  // Process payment
  const handlePayment = async (paymentMethod: 'cash' | 'card' | 'mobile' | 'online') => {
    if (!selectedOrder) return

    setProcessingPayment(true)

    try {
      const success = await processPayment(selectedOrder.order.id, paymentMethod)
      
      if (success) {
        alert(`✅ Payment Received!\n\nOrder #${selectedOrder.order.order_number}\nAmount: ৳${selectedOrder.order.total.toFixed(2)}\nMethod: ${paymentMethod.toUpperCase()}\n\nThank you!`)
        setSelectedOrder(null)
        fetchOrders()
      } else {
        alert('❌ Payment failed. Please try again.')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      alert('❌ Error processing payment.')
    } finally {
      setProcessingPayment(false)
    }
  }

  // Print bill
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-brand font-black text-slate-900 mb-2">💰 BILLING HUB</h1>
        <p className="text-slate-600">Orders Ready: <span className="font-bold text-2xl text-slate-900">{orders.length}</span></p>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl text-slate-500">Loading orders...</div>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <div className="text-8xl mb-4">✨</div>
          <p className="text-2xl font-bold">All Clear!</p>
          <p className="text-lg">No orders ready for billing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => viewBill(order)}
              className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-slate-500 mb-1">ORDER</div>
                  <div className="text-3xl font-brand font-black text-emerald-600">
                    #{order.order_number.replace('ORD', '')}
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                  order.status === 'ready' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {order.status.toUpperCase()}
                </div>
              </div>
              
              <div className="text-3xl font-brand font-black text-slate-900">
                ৳{order.total.toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bill Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Bill Header */}
            <div className="text-center mb-8 print:mb-4">
              <h2 className="text-4xl font-brand font-black text-slate-900 mb-2">NextTable</h2>
              <p className="text-slate-600">Restaurant Control Hub</p>
              <div className="text-sm text-slate-500 mt-2">
                {new Date(selectedOrder.order.created_at).toLocaleString()}
              </div>
            </div>

            {/* Order Number */}
            <div className="bg-slate-100 rounded-2xl p-4 mb-6 text-center print:bg-white print:border">
              <div className="text-sm text-slate-600 mb-1">ORDER NUMBER</div>
              <div className="text-4xl font-brand font-black text-emerald-600">
                #{selectedOrder.order.order_number.replace('ORD', '')}
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">ORDER DETAILS</h3>
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

            {/* Totals */}
            <div className="border-t-2 border-slate-300 pt-4 mb-6 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">৳{selectedOrder.order.subtotal.toFixed(2)}</span>
              </div>
              {selectedOrder.order.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax:</span>
                  <span className="font-semibold">৳{selectedOrder.order.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-brand font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>TOTAL:</span>
                <span className="text-emerald-600">৳{selectedOrder.order.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Buttons (Hide on Print) */}
            <div className="space-y-3 print:hidden">
              <div className="text-sm font-bold text-slate-600 mb-2">SELECT PAYMENT METHOD:</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePayment('cash')}
                  disabled={processingPayment}
                  className="py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition-colors disabled:bg-slate-300"
                >
                  💵 Cash
                </button>
                <button
                  onClick={() => handlePayment('card')}
                  disabled={processingPayment}
                  className="py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg transition-colors disabled:bg-slate-300"
                >
                  💳 Card
                </button>
                <button
                  onClick={() => handlePayment('mobile')}
                  disabled={processingPayment}
                  className="py-4 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg transition-colors disabled:bg-slate-300"
                >
                  📱 Mobile
                </button>
                <button
                  onClick={handlePrint}
                  className="py-4 rounded-xl bg-slate-500 hover:bg-slate-600 text-white font-bold text-lg transition-colors"
                >
                  🖨️ Print
                </button>
              </div>
            </div>

            {/* Close Button (Hide on Print) */}
            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full mt-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors print:hidden"
            >
              Close
            </button>

            {/* Thank You (Show on Print) */}
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
