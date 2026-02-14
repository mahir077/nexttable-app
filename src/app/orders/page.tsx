'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/api/tables'
import BackButton from '@/components/BackButton'

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
    fetchOrders()
  }, [])

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
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'completed')
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
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price,
            menu_item:menu_items (
              name,
              name_bangla
            )
          ),
          table:tables (
            table_number
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error
      setSelectedOrder(data)
      setShowModal(true)
    } catch (error) {
      console.error('Error fetching order details:', error)
    }
  }

  const handleDelete = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Delete Order ${orderNumber}?\n\nThis action cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

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

  const printReceipt = () => {
    window.print()
  }

  // Calculate totals
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0)
  const totalOrders = filteredOrders.length

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header with Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-4xl font-brand font-black text-slate-900">📋 ORDER HISTORY</h1>
            <p className="text-slate-600">View and manage past orders</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
          <div className="text-sm text-slate-500 mb-1">TOTAL ORDERS</div>
          <div className="text-3xl font-brand font-black text-slate-900">{totalOrders}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
          <div className="text-sm text-slate-500 mb-1">TOTAL REVENUE</div>
          <div className="text-3xl font-brand font-black text-emerald-600">৳{totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
          <div className="text-sm text-slate-500 mb-1">AVERAGE ORDER</div>
          <div className="text-3xl font-brand font-black text-blue-600">
            ৳{totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0'}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">🔍 Search & Filter</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Search Order #</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ORD-001"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Years</option>
              {years.filter(y => y !== 'all').map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Months</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Dates</option>
              {dates.filter(d => d !== 'all').map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchQuery || selectedYear !== 'all' || selectedMonth !== 'all' || selectedDate !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedYear('all')
              setSelectedMonth('all')
              setSelectedDate('all')
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">ORDER #</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">DATE & TIME</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">TYPE</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">PAYMENT</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">AMOUNT</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{order.order_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{formatDate(order.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                        order.order_type === 'dine-in' ? 'bg-blue-100 text-blue-700' :
                        order.order_type === 'takeaway' ? 'bg-orange-100 text-orange-700' :
                        order.order_type === 'online' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {order.order_type?.toUpperCase() || 'DINE-IN'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                        order.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-700' :
                        order.payment_method === 'card' ? 'bg-blue-100 text-blue-700' :
                        order.payment_method === 'mobile' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {order.payment_method?.toUpperCase() || 'CASH'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-emerald-600">৳{order.total.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => fetchOrderDetails(order.id)}
                          className="px-3 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(order.id)}
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(order.id, order.order_number)}
                          className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Total Row */}
            {filteredOrders.length > 0 && (
              <tfoot className="bg-emerald-50 border-t-4 border-emerald-500">
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-right">
                    <span className="text-lg font-bold text-slate-900">TOTAL ({totalOrders} orders):</span>
                  </td>
                  <td className="px-4 py-4 text-right" colSpan={2}>
                    <span className="text-2xl font-brand font-black text-emerald-700">৳{totalRevenue.toFixed(2)}</span>
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
              <h1 className="text-3xl font-brand font-black text-slate-900 mb-2">NextTable</h1>
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
                    'bg-purple-100 text-purple-700'
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
            <div className="flex gap-3">
              <button
                onClick={printReceipt}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
              >
                🖨️ Print Receipt
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
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

