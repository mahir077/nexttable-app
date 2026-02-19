'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/api/tables'
import BackButton from '@/components/BackButton'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/Toast'

interface Order {
  id: string
  order_number: string
  order_type: string
  total: number
  status: string
  created_at: string
  table_id: string | null
  customer_name: string | null
  table?: {
    table_number: string
    floor: {
      name: string
    }
  }
  order_items?: Array<{
    quantity: number
    price: number
    menu_item: {
      name: string
      name_bangla: string
    }
  }>
}

export default function BillingPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)

  // Discount states
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none')
  const [discountValue, setDiscountValue] = useState<number>(0)

  // Print state
  const [isPrinting, setIsPrinting] = useState(false)

  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)

      // Fetch orders with proper error handling
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_type,
          total,
          status,
          created_at,
          table_id,
          customer_name,
          table:tables (
            table_number,
            floor:floors (
              name
            )
          ),
          order_items (
            quantity,
            price,
            menu_item:menu_items (
              name,
              name_bangla
            )
          )
        `)
        .in('status', ['ready', 'preparing', 'kot_sent', 'pending'])
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        showToast('Database error: ' + error.message, 'error')
        setOrders([])
        return
      }

      console.log('Fetched orders:', data) // Debug log
      setOrders((data || []) as unknown as Order[])
    } catch (error) {
      console.error('Catch error:', error)
      showToast('Failed to load orders', 'error')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate discount
  const calculateDiscount = () => {
    if (!selectedOrder || discountType === 'none') {
      return {
        subtotal: selectedOrder?.total || 0,
        discountAmount: 0,
        finalTotal: selectedOrder?.total || 0
      }
    }

    const subtotal = selectedOrder.total || 0
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

  const handleCompletePayment = async () => {
    if (!selectedOrder) {
      showToast('Please select an order', 'error')
      return
    }

    if (!selectedPaymentMethod) {
      showToast('Please select payment method', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          payment_method: selectedPaymentMethod,
          discount_type: discountType,
          discount_value: discountValue,
          discount_amount: discountAmount,
          final_total: finalTotal,
          completed_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)

      if (error) throw error

      // Update table status if dine-in
      if (selectedOrder.table_id) {
        await supabase
          .from('tables')
          .update({ status: 'available' })
          .eq('id', selectedOrder.table_id)
      }

      showToast('✅ Payment completed!', 'success')

      // Reset
      setSelectedOrder(null)
      setDiscountType('none')
      setDiscountValue(0)
      setSelectedPaymentMethod(null)

      fetchOrders()
    } catch (error) {
      console.error('Payment error:', error)
      showToast('Failed to complete payment', 'error')
    }
  }

  const printInvoice = () => {
    if (isPrinting || !selectedOrder) return

    setIsPrinting(true)

    const printWindow = window.open('', '', 'width=300,height=600')

    if (!printWindow) {
      showToast('Please allow popups to print', 'error')
      setIsPrinting(false)
      return
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${selectedOrder.order_number}</title>
        <style>
          @media print {
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; padding: 0; }
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            padding: 5mm;
            font-size: 11px;
            color: #000;
            background: #fff;
          }

          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }

          .header h1 {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 4px;
          }

          .info { margin: 10px 0; font-size: 10px; }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }

          .divider {
            border-bottom: 1px dashed #000;
            margin: 8px 0;
          }

          .items-table {
            width: 100%;
            margin: 10px 0;
            font-size: 10px;
          }

          .items-table th {
            text-align: left;
            font-weight: bold;
            padding: 4px 0;
            border-bottom: 1px solid #000;
          }

          .items-table td {
            padding: 4px 0;
            border-bottom: 1px dotted #ccc;
          }

          .totals {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px dashed #000;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 11px;
          }

          .total-row.discount { color: #d00; font-weight: 600; }

          .total-row.grand-total {
            font-size: 14px;
            font-weight: bold;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 2px solid #000;
          }

          .footer {
            text-align: center;
            margin-top: 12px;
            padding-top: 8px;
            border-top: 2px dashed #000;
            font-size: 9px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <div>${selectedOrder.order_number}</div>
        </div>

        <div class="info">
          <div class="info-row">
            <span>Date:</span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span>Time:</span>
            <span>${new Date().toLocaleTimeString()}</span>
          </div>
          ${selectedOrder.table ? `
          <div class="info-row">
            <span>Table:</span>
            <span><strong>${selectedOrder.table.table_number}</strong></span>
          </div>
          ` : ''}
          <div class="info-row">
            <span>Type:</span>
            <span>${selectedOrder.order_type}</span>
          </div>
        </div>

        <div class="divider"></div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="width: 30px; text-align: center;">Qty</th>
              <th style="width: 55px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${selectedOrder.order_items?.map(item => `
              <tr>
                <td>${item.menu_item.name}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">৳${(item.quantity * item.price).toFixed(2)}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>৳${subtotal.toFixed(2)}</span>
          </div>

          ${discountAmount > 0 ? `
            <div class="total-row discount">
              <span>Discount ${discountType === 'percentage' ? `(${discountValue}%)` : ''}:</span>
              <span>-৳${discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}

          <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>৳${finalTotal.toFixed(2)}</span>
          </div>

          <div class="total-row" style="margin-top: 8px;">
            <span>Payment:</span>
            <span style="text-transform: uppercase;"><strong>${selectedPaymentMethod}</strong></span>
          </div>
        </div>

        <div class="footer">
          <p><strong>Thank you!</strong></p>
          <p>Please visit again</p>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        setTimeout(() => {
          printWindow.close()
          setIsPrinting(false)
        }, 500)
      }, 300)
    }

    setTimeout(() => setIsPrinting(false), 3000)
  }

  const pendingAmount = orders.reduce((sum, o) => sum + (o.total || 0), 0)

  return (
    <div className="min-h-screen bg-slate-50 p-3 lg:p-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex items-center gap-3 lg:gap-4">
        <BackButton />
        <div>
          <h1 className="text-2xl lg:text-4xl font-brand font-black text-slate-900">💰 BILLING HUB</h1>
          <p className="text-xs lg:text-sm text-slate-600">Pending bills & checkout</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-6">
        <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
          <div className="text-xs text-red-600 mb-1">Pending Bills</div>
          <div className="text-3xl font-bold text-red-700">{orders.length}</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
          <div className="text-xs text-blue-600 mb-1">Total Amount</div>
          <div className="text-2xl lg:text-3xl font-bold text-blue-700">৳{pendingAmount.toFixed(2)}</div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

          {/* Left: Pending Orders */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">📋 Pending Orders</h2>

            {orders.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
                <div className="text-6xl mb-4">✅</div>
                <div className="text-xl font-bold text-slate-900 mb-2">All Clear!</div>
                <div className="text-slate-600">No pending bills</div>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order)
                      setDiscountType('none')
                      setDiscountValue(0)
                      setSelectedPaymentMethod(null)
                    }}
                    className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all hover:shadow-lg ${
                      selectedOrder?.id === order.id
                        ? 'border-emerald-500 ring-4 ring-emerald-100'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    {/* Table Number - Large */}
                    {order.table && (
                      <div className="text-center mb-3 p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-500">TABLE</div>
                        <div className="text-4xl font-black text-slate-900">
                          {order.table.table_number}
                        </div>
                        <div className="text-xs text-slate-500">{order.table.floor?.name}</div>
                      </div>
                    )}

                    {/* Order Details */}
                    <div className="space-y-1 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Order:</span>
                        <span className="font-bold">{order.order_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Items:</span>
                        <span className="font-semibold">{order.order_items?.length || 0}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="border-t-2 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600">BILL:</span>
                        <span className="text-2xl font-black text-emerald-600">
                          ৳{order.total?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Payment Section */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">💳 Payment</h2>

            {!selectedOrder ? (
              <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
                <div className="text-6xl mb-4">👈</div>
                <div className="text-lg font-bold text-slate-900 mb-2">Select an Order</div>
                <div className="text-slate-600">Click on a pending order to start billing</div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-4 lg:p-6 border-2 border-slate-200">

                {/* Order Items */}
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-slate-700 mb-2">Order Items:</h3>
                  <div className="space-y-1 text-sm">
                    {selectedOrder.order_items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantity}× {item.menu_item.name}</span>
                        <span>৳{(item.quantity * item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discount */}
                <div className="bg-slate-50 rounded-lg p-4 mb-4 border-2 border-slate-200">
                  <h3 className="font-bold text-sm text-slate-700 mb-3">💸 Discount</h3>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {['none', 'percentage', 'fixed'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setDiscountType(type as 'none' | 'percentage' | 'fixed')
                          setDiscountValue(0)
                        }}
                        className={`py-2 rounded-lg font-bold text-xs transition-colors ${
                          discountType === type
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white text-slate-600 border-2 border-slate-200'
                        }`}
                      >
                        {type === 'none' && 'No Discount'}
                        {type === 'percentage' && 'Percentage %'}
                        {type === 'fixed' && 'Fixed ৳'}
                      </button>
                    ))}
                  </div>

                  {discountType !== 'none' && (
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      min={0}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg text-slate-900"
                      placeholder={discountType === 'percentage' ? 'Enter %' : 'Enter ৳'}
                    />
                  )}
                </div>

                {/* Totals */}
                <div className="bg-white rounded-lg p-4 mb-4 border-2 border-slate-200">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>৳{subtotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Discount:</span>
                        <span>-৳{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t-2 pt-2 flex justify-between">
                      <span className="text-lg font-bold">Total:</span>
                      <span className="text-2xl font-black text-emerald-600">
                        ৳{finalTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-slate-700 mb-3">Payment Method:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['cash', 'card', 'mobile', 'online'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(method)}
                        className={`p-3 rounded-lg border-2 font-bold text-sm transition-all ${
                          selectedPaymentMethod === method
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        {method === 'cash' && '💵 Cash'}
                        {method === 'card' && '💳 Card'}
                        {method === 'mobile' && '📱 Mobile'}
                        {method === 'online' && '🌐 Online'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleCompletePayment}
                    disabled={!selectedPaymentMethod}
                    className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${
                      selectedPaymentMethod
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    ✅ Complete Payment
                  </button>

                  <button
                    type="button"
                    onClick={printInvoice}
                    disabled={isPrinting || !selectedPaymentMethod}
                    className={`w-full py-3 rounded-lg font-bold transition-colors ${
                      isPrinting || !selectedPaymentMethod
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isPrinting ? '🖨️ Printing...' : '🖨️ Print Invoice'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
