'use client'

import { useState, useEffect } from 'react'
import { supabase, ensureSession } from '@/lib/supabase-client'
import { getOrderWithItems } from '@/app/lib/api/orders'
import { openCashDrawer } from '@/app/lib/cashDrawer'
import BackButton from '@/components/BackButton'
import { useAuth } from '@/contexts/AuthContext'

interface Order {
  id: string
  order_number: string
  order_type: string
  total: number
  payment_method: string | null
  created_at: string
  paid_at: string | null
  table_id: string | null
}

interface OrderWithItems extends Order {
  order_items: Array<{
    quantity: number
    price: number
    menu_item: {
      name: string
      name_bangla: string | null
    }
  }>
  table?: {
    table_number: string
  }
}

export default function OrdersPage() {
  const { organization } = useAuth()
  const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Filter states
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('all')

  // Get unique years, months, dates from orders
  const years = ['all', ...Array.from(new Set(orders.map(o => new Date(o.created_at).getFullYear().toString())))]
  const months = ['all', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
  const dates = ['all', ...Array.from(new Set(orders.map(o => new Date(o.created_at).getDate().toString()))).sort((a, b) => Number(a) - Number(b))]

  // Fetch orders
  useEffect(() => {
    if (orgId) fetchOrders()
    else setLoading(false)
  }, [orgId])

  // Apply filters
  useEffect(() => {
    let filtered = orders

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Year filter
    if (selectedYear !== 'all') {
      filtered = filtered.filter(order => 
        new Date(order.created_at).getFullYear().toString() === selectedYear
      )
    }

    // Month filter
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(order => {
        const month = (new Date(order.created_at).getMonth() + 1).toString().padStart(2, '0')
        return month === selectedMonth
      })
    }

    // Date filter
    if (selectedDate !== 'all') {
      filtered = filtered.filter(order => 
        new Date(order.created_at).getDate().toString() === selectedDate
      )
    }

    setFilteredOrders(filtered)
  }, [searchQuery, selectedYear, selectedMonth, selectedDate, orders])

  const fetchOrders = async () => {
    await ensureSession()
    if (!orgId) return
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setOrders(data || [])
      setFilteredOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderDetails = async (orderId: string) => {
    await ensureSession()
    if (!orgId) return
    try {
      const { order, items } = await getOrderWithItems(orgId, orderId)
      const orderItems = (items || []).map((item: { item_name: string; item_name_bangla: string | null; quantity: number; unit_price: number }) => ({
        quantity: item.quantity,
        price: item.unit_price,
        menu_item: { name: item.item_name, name_bangla: item.item_name_bangla }
      }))
      setSelectedOrder({ ...order, order_items: orderItems } as OrderWithItems)
      setShowModal(true)
    } catch (error) {
      console.error('Error fetching order details:', error)
    }
  }

  const handleDelete = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Delete Order ${orderNumber}?\n\nThis action cannot be undone.`)) return
    if (!orgId) return
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .eq('organization_id', orgId)

      if (error) throw error
      
      alert('✅ Order deleted successfully!')
      fetchOrders()
    } catch (error) {
      console.error('Error deleting order:', error)
      alert('❌ Failed to delete order')
    }
  }

  const handleEdit = (orderId: string) => {
    alert('Edit functionality coming in Week 4!\n\nWill allow:\n- Change order items\n- Update quantities\n- Adjust prices\n- Modify payment method')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }
    return date.toLocaleDateString('en-US', options)
  }

  const printReceipt = async (openDrawer: boolean) => {
    if (openDrawer) await openCashDrawer()
    window.print()
  }

  // Calculate totals
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0)
  const totalOrders = filteredOrders.length
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <BackButton />
        <div>
          <h1 className="text-3xl font-brand font-black text-slate-900">📋 ORDERS</h1>
          <p className="text-slate-600">Order history & management</p>
        </div>
      </div>

      {/* Filters - compact in one row */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Years</option>
            {years.filter(y => y !== 'all').map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Months</option>
            <option value="01">Jan</option>
            <option value="02">Feb</option>
            <option value="03">Mar</option>
            <option value="04">Apr</option>
            <option value="05">May</option>
            <option value="06">Jun</option>
            <option value="07">Jul</option>
            <option value="08">Aug</option>
            <option value="09">Sep</option>
            <option value="10">Oct</option>
            <option value="11">Nov</option>
            <option value="12">Dec</option>
          </select>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Dates</option>
            {dates.filter(d => d !== 'all').map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #"
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-emerald-500 focus:outline-none placeholder:text-slate-400"
          />
        </div>
        {(searchQuery || selectedYear !== 'all' || selectedMonth !== 'all' || selectedDate !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setSelectedYear('all')
              setSelectedMonth('all')
              setSelectedDate('all')
            }}
            className="mt-3 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Stats - compact */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
          <div className="text-xs text-emerald-600 font-semibold">Total Orders</div>
          <div className="text-2xl font-bold text-emerald-700">{totalOrders}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs text-blue-600 font-semibold">Total Revenue</div>
          <div className="text-2xl font-bold text-blue-700">৳{totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <div className="text-xs text-purple-600 font-semibold">Avg Order</div>
          <div className="text-2xl font-bold text-purple-700">৳{avgOrder.toFixed(2)}</div>
        </div>
      </div>

      {/* Table - cleaner */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">ORDER #</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">DATE & TIME</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">TYPE</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">PAYMENT</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-slate-600">AMOUNT</th>
                <th className="px-3 py-2 text-center text-xs font-bold text-slate-600">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <span className="font-semibold text-slate-900">{order.order_number}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{formatDate(order.created_at)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        order.order_type === 'dine-in' ? 'bg-blue-100 text-blue-700' :
                        order.order_type === 'takeaway' ? 'bg-orange-100 text-orange-700' :
                        order.order_type === 'online' ? 'bg-violet-100 text-violet-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {order.order_type?.toUpperCase() || 'DINE-IN'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        order.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-700' :
                        order.payment_method === 'card' ? 'bg-blue-100 text-blue-700' :
                        order.payment_method === 'mobile' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {order.payment_method?.toUpperCase() || 'CASH'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-bold text-emerald-600">৳{order.total.toFixed(2)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => fetchOrderDetails(order.id)}
                          className="px-2 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(order.id)}
                          className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(order.id, order.order_number)}
                          className="px-2 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredOrders.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right font-semibold text-slate-700">
                    Total ({totalOrders} orders)
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-700" colSpan={2}>
                    ৳{totalRevenue.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Receipt Header */}
            <div className="text-center mb-6 pb-6 border-b-2 border-slate-200">
              <h1 className="text-3xl font-brand font-black text-slate-900 mb-2">{organization?.display_name || organization?.name || 'Orders'}</h1>
              <p className="text-sm text-slate-600">Restaurant POS System</p>
            </div>

            {/* Order Info */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-sm text-slate-500">Order Number</div>
                  <div className="text-2xl font-bold text-slate-900">{selectedOrder.order_number}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500">Order Date</div>
                  <div className="text-sm font-semibold text-slate-700">{formatDate(selectedOrder.created_at)}</div>
                </div>
              </div>

              <div className="flex gap-4 mb-4">
                <div>
                  <div className="text-sm text-slate-500">Type</div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    selectedOrder.order_type === 'dine-in' ? 'bg-blue-100 text-blue-700' :
                    selectedOrder.order_type === 'takeaway' ? 'bg-orange-100 text-orange-700' :
                    'bg-violet-100 text-violet-700'
                  }`}>
                    {selectedOrder.order_type?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Payment</div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    {selectedOrder.payment_method?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Order Items</h3>
              <div className="space-y-2">
                {selectedOrder.order_items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between py-2 border-b border-slate-200">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{item.menu_item.name}</div>
                      {item.menu_item.name_bangla && (
                        <div className="text-sm text-slate-500">{item.menu_item.name_bangla}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">×{item.quantity}</div>
                      <div className="font-semibold text-slate-900">৳{(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="bg-emerald-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-slate-900">TOTAL</span>
                <span className="text-3xl font-brand font-black text-emerald-600">৳{selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={() => printReceipt(true)}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
                >
                  🖨️ Print (open drawer)
                </button>
                <button
                  onClick={() => printReceipt(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-500 hover:bg-slate-600 text-white font-bold transition-colors"
                >
                  🖨️ Print (no drawer)
                </button>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

