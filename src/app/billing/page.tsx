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
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none')
  const [discountValue, setDiscountValue] = useState<number>(0)

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

  const calculateDiscount = () => {
    if (!selectedOrder || discountType === 'none') {
      const baseTotal = selectedOrder?.order.total || 0
      return {
        subtotal: baseTotal,
        discountAmount: 0,
        finalTotal: baseTotal
      }
    }

    const subtotal = selectedOrder.order.total || 0
    let discountAmount = 0

    if (discountType === 'percentage') {
      discountAmount = (subtotal * discountValue) / 100
    } else if (discountType === 'fixed') {
      discountAmount = discountValue
    }

    if (discountAmount > subtotal) {
      discountAmount = subtotal
    }

    const finalTotal = subtotal - discountAmount

    return { subtotal, discountAmount, finalTotal }
  }

  const { subtotal, discountAmount, finalTotal } = calculateDiscount()

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

      const printWindow = window.open('', '_blank', 'width=400,height=600')

      if (!printWindow) {
        throw new Error('Unable to open print window')
      }

      const order = selectedOrder.order
      const items = selectedOrder.items

      const paymentMethodLabel = 'Not specified'

      printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>Invoice #${order.order_number}</title>
    <style>
      @page {
        size: 80mm auto;
        margin: 0;
      }
      * {
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        margin: 0;
        padding: 6px 4px 10px;
        font-size: 12px;
      }
      .invoice-wrapper {
        width: 100%;
        max-width: 72mm;
        margin: 0 auto;
      }
      .invoice-header {
        text-align: center;
        margin-bottom: 10px;
      }
      .invoice-header h1 {
        font-size: 18px;
        margin: 0;
      }
      .invoice-header p {
        margin: 2px 0;
      }
      .invoice-meta {
        font-size: 11px;
        margin-bottom: 8px;
      }
      .invoice-meta div {
        display: flex;
        justify-content: space-between;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }
      th, td {
        padding: 4px 2px;
        text-align: left;
      }
      th {
        border-bottom: 1px solid #000;
        font-size: 11px;
      }
      td {
        font-size: 11px;
      }
      td:last-child,
      th:last-child {
        text-align: right;
      }
      .invoice-totals {
        margin-top: 8px;
        font-size: 12px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        margin-top: 2px;
      }
      .discount-row {
        color: #dc2626;
        font-weight: 600;
      }
      .grand-total {
        border-top: 2px solid #000;
        padding-top: 6px;
        margin-top: 6px;
        font-size: 14px;
        font-weight: bold;
      }
      .thank-you {
        text-align: center;
        margin-top: 10px;
        font-size: 11px;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        .invoice-wrapper {
          margin: 0 auto;
        }
      }
    </style>
  </head>
  <body>
    <div class="invoice-wrapper">
      <div class="invoice-header">
        <h1>NextTable</h1>
        <p>Restaurant Control Hub</p>
      </div>
      <div class="invoice-meta">
        <div>
          <span>Order:</span>
          <span>#${order.order_number.replace('ORD', '')}</span>
        </div>
        <div>
          <span>Date:</span>
          <span>${new Date(order.created_at).toLocaleString()}</span>
        </div>
        <div>
          <span>Table:</span>
          <span>${order.table?.table_number ?? '-'}</span>
        </div>
      </div>
      <div class="invoice-body">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
              <tr>
                <td>${item.item_name}</td>
                <td>${item.quantity}</td>
                <td>৳${item.unit_price.toFixed(2)}</td>
                <td>৳${item.subtotal.toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="invoice-totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>৳${subtotal.toFixed(2)}</span>
          </div>

          ${
            discountAmount > 0
              ? `
          <div class="total-row discount-row">
            <span>
              Discount${
                discountType === 'percentage'
                  ? ` (${discountValue}%)`
                  : discountType === 'fixed'
                  ? ` (৳${discountValue})`
                  : ''
              }:
            </span>
            <span>-৳${discountAmount.toFixed(2)}</span>
          </div>`
              : ''
          }

          <div class="total-row grand-total">
            <span>Total:</span>
            <span>৳${finalTotal.toFixed(2)}</span>
          </div>

          <div class="total-row">
            <span>Payment Method:</span>
            <span>${paymentMethodLabel}</span>
          </div>
        </div>
      </div>

      <div class="thank-you">
        <div>Thank you for your visit!</div>
        <div>Please visit again</div>
      </div>
    </div>
  </body>
</html>`)

      printWindow.document.close()
      printWindow.focus()
      printWindow.print()

      setTimeout(() => {
        printWindow.close()
        setIsPrinting(false)
      }, 1000)
    } catch (error) {
      console.error('Error printing invoice:', error)
      showToast('Failed to print invoice', 'error')
      setIsPrinting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-3 lg:px-6 lg:py-6 billing-print">
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
        <div className="max-w-5xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-5">
            <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
              <div className="text-xs text-red-600 mb-1">Pending Bills</div>
              <div className="text-2xl md:text-3xl font-bold text-red-700">{pendingOrders.length}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="text-xs text-blue-600 mb-1">Total Amount</div>
              <div className="text-2xl md:text-3xl font-bold text-blue-700">
                ৳{pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
              <div className="text-xs text-emerald-600 mb-1">Completed Today</div>
              <div className="text-2xl md:text-3xl font-bold text-emerald-700">{completedToday}</div>
            </div>
          </div>

          {/* Pending Bills - Simple Responsive Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleSelectOrder(order)}
                className="bg-white rounded-xl p-4 border-2 border-slate-200 hover:border-emerald-500 cursor-pointer transition-shadow hover:shadow-lg flex flex-col gap-3"
              >
                {/* Top row: table + total */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wide">Table</div>
                    <div className="text-2xl font-black text-slate-900 leading-tight">
                      {order.table?.table_number ?? '—'}
                    </div>
                    {order.table?.floor && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {order.table.floor.name}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-600">TOTAL BILL</div>
                    <div className="text-xl md:text-2xl font-black text-emerald-600 leading-tight">
                      ৳{(order.total ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Meta row */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <div>
                    <span className="font-semibold">Order:</span>{' '}
                    <span>{order.order_number}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Type:</span>{' '}
                    <span className="capitalize">{order.order_type || 'dine-in'}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Items:</span>{' '}
                    <span>{order.order_items?.length ?? 0}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Time:</span>{' '}
                    <span>{new Date(order.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <div className="inline-flex px-3 py-1 bg-red-100 text-red-700 rounded-full text-[11px] font-bold">
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

            {/* Totals with Discount */}
            <div className="bg-white rounded-lg p-4 mb-4 border-2 border-slate-200">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold">৳{subtotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>
                      Discount
                      {discountType === 'percentage' && ` (${discountValue}%)`}
                      {discountType === 'fixed' && ` (৳${discountValue})`}:
                    </span>
                    <span className="font-semibold">-৳{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t-2 pt-2 flex justify-between">
                  <span className="text-lg font-bold text-slate-900">Total to Pay:</span>
                  <span className="text-3xl font-black text-emerald-600">
                    ৳{finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Discount Controls */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4 border-2 border-slate-200 print:hidden">
              <h3 className="font-bold text-sm text-slate-700 mb-3">💸 Discount (Optional)</h3>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('none')
                    setDiscountValue(0)
                  }}
                  className={`py-2 rounded-lg font-bold text-sm transition-colors ${
                    discountType === 'none'
                      ? 'bg-slate-600 text-white'
                      : 'bg-white text-slate-600 border-2 border-slate-200'
                  }`}
                >
                  No Discount
                </button>

                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className={`py-2 rounded-lg font-bold text-sm transition-colors ${
                    discountType === 'percentage'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 border-2 border-slate-200'
                  }`}
                >
                  Percentage %
                </button>

                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={`py-2 rounded-lg font-bold text-sm transition-colors ${
                    discountType === 'fixed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border-2 border-slate-200'
                  }`}
                >
                  Fixed ৳
                </button>
              </div>

              {discountType === 'percentage' && (
                <div className="mt-3">
                  <div className="text-xs text-slate-600 mb-2 font-bold">Quick Discounts:</div>
                  <div className="flex gap-2 flex-wrap">
                    {[5, 10, 15, 20, 25].map((percent) => (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => setDiscountValue(percent)}
                        className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded font-bold text-sm hover:bg-emerald-200 transition-colors"
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {discountType === 'fixed' && (
                <div className="mt-3">
                  <div className="text-xs text-slate-600 mb-2 font-bold">Quick Amounts:</div>
                  <div className="flex gap-2 flex-wrap">
                    {[50, 100, 200, 500].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setDiscountValue(amount)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded font-bold text-sm hover:bg-blue-200 transition-colors"
                      >
                        ৳{amount}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {discountType !== 'none' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">
                    {discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      min={0}
                      max={discountType === 'percentage' ? 100 : subtotal}
                      step={discountType === 'percentage' ? 1 : 10}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 text-lg font-bold focus:border-emerald-500 focus:outline-none"
                      placeholder={discountType === 'percentage' ? 'Enter %' : 'Enter amount'}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                      {discountType === 'percentage' ? '%' : '৳'}
                    </div>
                  </div>
                  {discountAmount > 0 && (
                    <div className="mt-2 text-sm text-emerald-600 font-bold">
                      Discount: -৳{discountAmount.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
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
