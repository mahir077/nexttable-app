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
    unit_price: number
    item_name: string
    item_name_bangla: string | null
    subtotal?: number
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

  // Cash drawer: true = auto-open on cash payment, false = stay closed
  const [cashDrawerEnabled, setCashDrawerEnabled] = useState(true)

  const [restaurantInfo, setRestaurantInfo] = useState({
    name: 'Restaurant Name',
    address: '',
    phone: '',
    email: ''
  })

  const [invoiceSettings, setInvoiceSettings] = useState({
    show_business_info: true,
    show_table_number: true,
    show_order_type: true,
    show_date_time: true,
    show_item_prices: true,
    show_thank_you: true,
    custom_header: '',
    custom_footer: 'Thank you for your visit!\nPlease come again'
  })

  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    fetchOrders()
    fetchRestaurantInfo()
    fetchInvoiceSettings()
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
            unit_price,
            item_name,
            item_name_bangla,
            subtotal
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

  const fetchRestaurantInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('display_name, address, phone, email')
        .limit(1)
        .single()

      if (data) {
        setRestaurantInfo({
          name: data.display_name || 'Restaurant Name',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || ''
        })
      }
    } catch {
      console.log('Could not fetch restaurant info')
    }
  }

  const fetchInvoiceSettings = async () => {
    try {
      const { data } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()

      if (data) {
        setInvoiceSettings(prev => ({
          ...prev,
          show_business_info: data.show_business_info ?? prev.show_business_info,
          show_table_number: data.show_table_number ?? prev.show_table_number,
          show_order_type: data.show_order_type ?? prev.show_order_type,
          show_date_time: data.show_date_time ?? prev.show_date_time,
          show_item_prices: data.show_item_prices ?? prev.show_item_prices,
          show_thank_you: data.show_thank_you ?? prev.show_thank_you,
          custom_header: (data.custom_header as string) ?? prev.custom_header,
          custom_footer: (data.custom_footer as string) ?? prev.custom_footer
        }))
      }
    } catch {
      console.log('Using default invoice settings')
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
      console.log('Completing payment for:', selectedOrder.id)

      // Build update object with only essential fields
      const updateData: Record<string, unknown> = {
        status: 'paid',
        payment_method: selectedPaymentMethod
      }

      // Add optional fields only if they make sense
      try {
        updateData.completed_at = new Date().toISOString()
      } catch {
        console.log('completed_at not available')
      }

      // Add discount if applied
      if (discountType !== 'none' && discountValue > 0) {
        try {
          updateData.discount_type = discountType
          updateData.discount_value = discountValue
          updateData.discount_amount = discountAmount
          updateData.final_total = finalTotal
        } catch {
          console.log('Discount fields not available')
        }
      }

      console.log('Update data:', updateData)

      const { error: orderError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', selectedOrder.id)

      if (orderError) {
        console.error('Order update error:', orderError)
        throw new Error(orderError.message)
      }

      console.log('Order updated successfully')

      // Update table status if dine-in
      if (selectedOrder.table_id) {
        const { error: tableError } = await supabase
          .from('tables')
          .update({ status: 'available' })
          .eq('id', selectedOrder.table_id)

        if (tableError) {
          console.error('Table update warning:', tableError)
          // Don't throw - payment completed
        }
      }

      showToast('✅ Payment completed successfully!', 'success')

      // Reset states
      setSelectedOrder(null)
      setDiscountType('none')
      setDiscountValue(0)
      setSelectedPaymentMethod(null)

      // Refresh
      await fetchOrders()
    } catch (error) {
      console.error('Payment error:', error)
      const msg = (error as Error)?.message ?? 'Unknown error'
      showToast('Payment failed: ' + msg, 'error')
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

          .business-info {
            font-size: 9px;
            line-height: 1.5;
            margin-top: 5px;
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
          ${invoiceSettings.show_business_info ? `
          <h1>${restaurantInfo.name}</h1>
          <div class="business-info">
            ${restaurantInfo.address ? `${restaurantInfo.address}<br>` : ''}
            ${restaurantInfo.phone ? `Phone: ${restaurantInfo.phone}<br>` : ''}
            ${restaurantInfo.email ? `Email: ${restaurantInfo.email}<br>` : ''}
          </div>
          ` : '<h1>INVOICE</h1>'}
          ${invoiceSettings.custom_header ? `
          <div style="margin-top: 8px; font-size: 10px; font-weight: bold;">
            ${invoiceSettings.custom_header}
          </div>
          ` : ''}
        </div>

        <div class="info">
          <div class="info-row">
            <span>Order:</span>
            <span><strong>${selectedOrder.order_number}</strong></span>
          </div>
          ${invoiceSettings.show_date_time ? `
          <div class="info-row">
            <span>Date:</span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span>Time:</span>
            <span>${new Date().toLocaleTimeString()}</span>
          </div>
          ` : ''}
          ${invoiceSettings.show_table_number && selectedOrder.table ? `
          <div class="info-row">
            <span>Table:</span>
            <span><strong>${selectedOrder.table.table_number}</strong></span>
          </div>
          ` : ''}
          ${invoiceSettings.show_order_type ? `
          <div class="info-row">
            <span>Type:</span>
            <span>${selectedOrder.order_type}</span>
          </div>
          ` : ''}
        </div>

        <div class="divider"></div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="width: 30px; text-align: center;">Qty</th>
              ${invoiceSettings.show_item_prices ? '<th style="width: 55px; text-align: right;">Total</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${selectedOrder.order_items?.map(item => `
              <tr>
                <td>${item.item_name}</td>
                <td style="text-align: center;">${item.quantity}</td>
                ${invoiceSettings.show_item_prices ? `<td style="text-align: right;">৳${(item.subtotal ?? item.quantity * item.unit_price).toFixed(2)}</td>` : ''}
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

        ${invoiceSettings.show_thank_you ? `
        <div class="footer">
          ${(invoiceSettings.custom_footer || 'Thank you for your visit!').split('\n').map(line => `<p>${line}</p>`).join('')}
        </div>
        ` : ''}
      </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()

        // Open cash drawer ONLY if toggle is ON and payment method is CASH
        if (cashDrawerEnabled && selectedPaymentMethod === 'cash') {
          setTimeout(() => {
            console.log('Opening cash drawer...')
            openCashDrawerCommand()
          }, 500)
        } else {
          console.log('Cash drawer disabled or not cash payment')
        }

        setTimeout(() => {
          printWindow.close()
          setIsPrinting(false)
        }, 500)
      }, 300)
    }

    setTimeout(() => setIsPrinting(false), 3000)
  }

  const openCashDrawerCommand = () => {
    try {
      // ESC/POS command for opening cash drawer: ESC + p + 0 + 25 + 250
      const escPos = '\x1B\x70\x00\x19\xFA'

      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(`
          <html>
          <head><title>Open Drawer</title></head>
          <body>
            <pre style="display:none;">${escPos}</pre>
            <script>
              setTimeout(function() {
                window.print();
              }, 100);
            </script>
          </body>
          </html>
        `)
        doc.close()

        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
        }, 2000)
      }

      console.log('Cash drawer command sent')
    } catch (error) {
      console.error('Cash drawer error:', error)
    }
  }

  const pendingAmount = orders.reduce((sum, o) => sum + (o.total || 0), 0)

  return (
    <div className="min-h-screen bg-slate-50 p-3 lg:p-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 lg:gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl lg:text-4xl font-brand font-black text-slate-900">💰 BILLING HUB</h1>
            <p className="text-xs lg:text-sm text-slate-600">Pending bills & checkout</p>
          </div>
        </div>

        {/* Cash Drawer Toggle - Always Visible */}
        <div className="bg-white rounded-lg p-3 border-2 border-slate-200 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <div>
              <div className="font-bold text-sm text-slate-900">Cash Drawer</div>
              <div className="text-xs text-slate-500">Auto-open on cash payment</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCashDrawerEnabled(!cashDrawerEnabled)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              cashDrawerEnabled ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <span className="sr-only">Toggle cash drawer</span>
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                cashDrawerEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>

          <span className={`text-xs font-bold ${cashDrawerEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
            {cashDrawerEnabled ? 'ON' : 'OFF'}
          </span>
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
                        <span>{item.quantity}× {item.item_name}</span>
                        <span>৳{(item.subtotal ?? item.quantity * item.unit_price).toFixed(2)}</span>
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

                  {/* Show drawer status when cash selected */}
                  {selectedPaymentMethod === 'cash' && (
                    <div
                      className={`mt-2 p-2 rounded text-xs font-semibold ${
                        cashDrawerEnabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {cashDrawerEnabled
                        ? '✓ Cash drawer will open automatically'
                        : '○ Cash drawer will stay closed'}
                    </div>
                  )}
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
