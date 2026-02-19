'use client'

import { useState, useEffect } from 'react'
import { getOrdersForBillingWithDetails, getPaidOrders, getOrderWithItems, processPayment, type OrderForBilling } from '@/app/lib/api/orders'
import { openCashDrawer } from '@/app/lib/cashDrawer'
import BackButton from '@/components/BackButton'
import LoadingSpinner from '@/components/LoadingSpinner'
import Toast from '@/components/Toast'
import { useToast } from '@/hooks/useToast'

interface OrderItem {
  id: string
  item_name: string
  item_name_bangla: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export default function BillingPage() {
  const [pendingOrders, setPendingOrders] = useState<OrderForBilling[]>([])
  const [completedToday, setCompletedToday] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<{ order: OrderForBilling; items: OrderItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const { toast, showToast, hideToast } = useToast()

  const fetchOrders = async () => {
    try {
      const [pending, paid] = await Promise.all([
        getOrdersForBillingWithDetails(),
        getPaidOrders()
      ])
      setPendingOrders(pending)
      const today = new Date().toDateString()
      const paidToday = paid.filter(o => o.paid_at && new Date(o.paid_at).toDateString() === today)
      setCompletedToday(paidToday.length)
    } catch (error) {
      console.error('Error fetching orders for billing:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleSelectOrder = async (order: OrderForBilling) => {
    try {
      const data = await getOrderWithItems(order.id)
      setSelectedOrder({ order: { ...order, ...data.order } as OrderForBilling, items: data.items })
    } catch (error) {
      console.error('Error fetching order details for bill:', error)
    }
  }

  // Process payment
  const handlePayment = async (paymentMethod: 'cash' | 'card' | 'mobile' | 'online') => {
    if (!selectedOrder) return

    setProcessingPayment(true)

    try {
      const success = await processPayment(selectedOrder.order.id, paymentMethod)
      
      if (success) {
        showToast(`Payment received! Order #${selectedOrder.order.order_number} · ৳${selectedOrder.order.total.toFixed(2)} · Thank you!`, 'success')
        setSelectedOrder(null)
        fetchOrders()
      } else {
        showToast('Payment failed. Please try again.', 'error')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      showToast('Error processing payment.', 'error')
    } finally {
      setProcessingPayment(false)
    }
  }

  // Print bill — choice at print time: open cash drawer or not
  const handlePrint = async (openDrawer: boolean) => {
    if (!selectedOrder) return

    if (isPrinting) {
      console.log('Already printing, please wait...')
      return
    }

    setIsPrinting(true)

    try {
      if (openDrawer) {
        await openCashDrawer()
      }

      window.print()

      // Reset printing state after print dialog shows
      setTimeout(() => {
        setIsPrinting(false)
      }, 1500)
    } catch (error) {
      console.error('Error printing invoice:', error)
      showToast('Failed to print invoice', 'error')
      setIsPrinting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 lg:p-6 billing-print">
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex items-center gap-3 lg:gap-4">
        <BackButton />
        <div>
          <h1 className="text-2xl lg:text-4xl font-brand font-black text-slate-900">💰 BILLING HUB</h1>
          <p className="text-xs lg:text-sm text-slate-600">Pending bills & payments</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
            <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
              <div className="text-xs text-red-600 mb-1">Pending Bills</div>
              <div className="text-3xl font-bold text-red-700">{pendingOrders.length}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="text-xs text-blue-600 mb-1">Total Amount</div>
              <div className="text-3xl font-bold text-blue-700">
                ৳{pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
              <div className="text-xs text-emerald-600 mb-1">Completed Today</div>
              <div className="text-3xl font-bold text-emerald-700">{completedToday}</div>
            </div>
          </div>

          {/* Pending Bills - Large Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleSelectOrder(order)}
                className="bg-white rounded-xl p-4 lg:p-6 border-2 border-slate-200 hover:border-emerald-500 cursor-pointer transition-all hover:shadow-lg"
              >
                {/* Table Number - Large */}
                <div className="text-center mb-4 p-4 bg-slate-50 rounded-lg">
                  <div className="text-sm text-slate-500 mb-1">TABLE</div>
                  <div className="text-5xl font-black text-slate-900">
                    {order.table?.table_number ?? '—'}
                  </div>
                  {order.table?.floor && (
                    <div className="text-xs text-slate-500 mt-1">{order.table.floor.name}</div>
                  )}
                </div>

                {/* Order Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Order:</span>
                    <span className="font-bold">{order.order_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Type:</span>
                    <span className="font-semibold capitalize">{order.order_type || 'dine-in'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Items:</span>
                    <span className="font-semibold">{order.order_items?.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Time:</span>
                    <span className="font-semibold">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Amount - Highlighted */}
                <div className="border-t-2 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">TOTAL BILL:</span>
                    <span className="text-3xl font-black text-emerald-600">
                      ৳{(order.total ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-3">
                  <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold text-center">
                    💳 PENDING PAYMENT
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {pendingOrders.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
              <div className="text-6xl mb-4">✅</div>
              <div className="text-xl font-bold text-slate-900 mb-2">All Clear!</div>
              <div className="text-slate-600">No pending bills at the moment</div>
            </div>
          )}
        </>
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
                  onClick={() => handlePrint(true)}
                  disabled={isPrinting}
                  className={`py-4 rounded-xl font-bold text-lg transition-colors ${
                    isPrinting
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-500 hover:bg-slate-600 text-white'
                  }`}
                >
                  {isPrinting ? '🖨️ Printing...' : '🖨️ Print (open drawer)'}
                </button>
                <button
                  onClick={() => handlePrint(false)}
                  disabled={isPrinting}
                  className={`py-4 rounded-xl font-bold text-lg transition-colors ${
                    isPrinting
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-400 hover:bg-slate-500 text-white'
                  }`}
                >
                  {isPrinting ? '🖨️ Printing...' : '🖨️ Print (no drawer)'}
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
