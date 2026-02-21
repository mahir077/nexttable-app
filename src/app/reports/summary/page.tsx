'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import BackButton from '@/components/BackButton'
import { useAuth } from '@/contexts/AuthContext'

interface Order {
  id: string
  total: number
  created_at: string
  payment_method: string | null
  order_type: string | null
}

interface OrderItem {
  quantity: number
  price?: number
  unit_price?: number
  item_name?: string
  menu_item?: {
    name: string
    category: string | { name?: string }
  }
}

interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

export default function ReportsSummaryPage() {
  const { organization } = useAuth()
  const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)
  const [activeTab, setActiveTab] = useState('daily-sales')
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('today')

  useEffect(() => {
    if (orgId) fetchOrders()
    else setLoading(false)
  }, [orgId, dateFilter])

  const fetchOrders = async () => {
    if (!orgId) return
    try {
      setLoading(true)

      let query = supabase
        .from('orders')
        .select(`
          id,
          total,
          created_at,
          payment_method,
          order_type,
          order_items (
            quantity,
            unit_price,
            item_name,
            menu_item:menu_items (
              name,
              category:categories(name)
            )
          )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      // Apply date filter
      if (dateFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        query = query.gte('created_at', today.toISOString())
      } else if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setDate(monthAgo.getDate() - 30)
        query = query.gte('created_at', monthAgo.toISOString())
      }
      // 'all' = no date filter

      const { data, error } = await query

      if (error) {
        console.warn('Reports query with joins failed, trying simple query:', error.message)
        let fallback = supabase
          .from('orders')
          .select('id, total, created_at, payment_method, order_type, order_items (quantity, unit_price, item_name)')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
        if (dateFilter === 'today') {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          fallback = fallback.gte('created_at', today.toISOString())
        } else if (dateFilter === 'week') {
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          fallback = fallback.gte('created_at', weekAgo.toISOString())
        } else if (dateFilter === 'month') {
          const monthAgo = new Date()
          monthAgo.setDate(monthAgo.getDate() - 30)
          fallback = fallback.gte('created_at', monthAgo.toISOString())
        }
        const { data: fallbackData, error: fallbackError } = await fallback
        if (fallbackError) {
          console.error('Error fetching orders:', fallbackError)
          alert('Error loading reports: ' + fallbackError.message)
          setOrders([])
          return
        }
        setOrders((fallbackData || []) as unknown as OrderWithItems[])
        return
      }

      setOrders((data || []) as unknown as OrderWithItems[])
    } catch (error) {
      console.error('Fetch error:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats with null checks
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const totalOrders = orders.length
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Payment breakdown with null checks
  const cashSales = orders
    .filter(o => o.payment_method === 'cash')
    .reduce((sum, o) => sum + (o.total || 0), 0)

  const cardSales = orders
    .filter(o => o.payment_method === 'card')
    .reduce((sum, o) => sum + (o.total || 0), 0)

  const mobileSales = orders
    .filter(o => o.payment_method === 'mobile')
    .reduce((sum, o) => sum + (o.total || 0), 0)

  // Item-wise sales with null checks (support price, unit_price, menu_item.name, item_name)
  const itemSales: Record<string, { name: string; quantity: number; revenue: number }> = {}

  orders.forEach(order => {
    if (order.order_items && Array.isArray(order.order_items)) {
      order.order_items.forEach(item => {
        const name = item.menu_item?.name ?? item.item_name ?? null
        if (name) {
          const price = (item.price ?? item.unit_price ?? 0) as number
          if (!itemSales[name]) {
            itemSales[name] = { name, quantity: 0, revenue: 0 }
          }
          itemSales[name].quantity += item.quantity || 0
          itemSales[name].revenue += price * (item.quantity || 0)
        }
      })
    }
  })

  const topItems = Object.values(itemSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // Category-wise sales with null checks (category can be string or { name } from join)
  const categorySales: Record<string, { category: string; quantity: number; revenue: number }> = {}

  orders.forEach(order => {
    if (order.order_items && Array.isArray(order.order_items)) {
      order.order_items.forEach(item => {
        const rawCat = item.menu_item?.category
        const cat = typeof rawCat === 'object' && rawCat !== null && 'name' in rawCat
          ? (rawCat as { name?: string }).name ?? 'Uncategorized'
          : (typeof rawCat === 'string' ? rawCat : 'Uncategorized')
        if (cat) {
          const price = (item.price ?? item.unit_price ?? 0) as number
          if (!categorySales[cat]) {
            categorySales[cat] = { category: cat, quantity: 0, revenue: 0 }
          }
          categorySales[cat].quantity += item.quantity || 0
          categorySales[cat].revenue += price * (item.quantity || 0)
        }
      })
    }
  })

  const categoryData = Object.values(categorySales)

  const tabs = [
    { id: 'daily-sales', name: 'Daily Sales', icon: '📊' },
    { id: 'profit-loss', name: 'Profit & Loss', icon: '💰' },
    { id: 'item-wise', name: 'Item-wise', icon: '🍽️' },
    { id: 'category-wise', name: 'Category', icon: '📁' },
    { id: 'payment-methods', name: 'Payment', icon: '💳' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-3 lg:p-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3 lg:gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl lg:text-4xl font-brand font-black text-slate-900">📊 REPORTS</h1>
            <p className="text-xs lg:text-sm text-slate-600">Business analytics</p>
          </div>
        </div>

        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none font-bold text-slate-900"
        >
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border-2 border-slate-200 mb-4 lg:mb-6 overflow-x-auto">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] px-4 py-3 lg:py-4 font-bold text-xs lg:text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <div className="text-slate-500">Loading reports...</div>
        </div>
      ) : (
        <>
          {/* Daily Sales Tab */}
          {activeTab === 'daily-sales' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
                <div className="bg-emerald-50 rounded-xl p-4 lg:p-6 border-2 border-emerald-200">
                  <div className="text-xs lg:text-sm text-emerald-600 mb-1">Total Revenue</div>
                  <div className="text-2xl lg:text-3xl font-bold text-emerald-700">
                    ৳{totalRevenue.toFixed(2)}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 lg:p-6 border-2 border-blue-200">
                  <div className="text-xs lg:text-sm text-blue-600 mb-1">Total Orders</div>
                  <div className="text-2xl lg:text-3xl font-bold text-blue-700">
                    {totalOrders}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 lg:p-6 border-2 border-purple-200">
                  <div className="text-xs lg:text-sm text-purple-600 mb-1">Avg Order</div>
                  <div className="text-2xl lg:text-3xl font-bold text-purple-700">
                    ৳{avgOrder.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profit & Loss Tab */}
          {activeTab === 'profit-loss' && (
            <div className="bg-white rounded-xl p-4 lg:p-6 border-2 border-slate-200">
              <h2 className="text-xl lg:text-2xl font-bold mb-4">💰 Profit & Loss</h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b">
                  <span className="font-semibold">Total Revenue</span>
                  <span className="text-emerald-600 font-bold">৳{totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 border-b">
                  <span className="font-semibold">Cost (Not tracked yet)</span>
                  <span className="text-slate-400">৳0.00</span>
                </div>
                <div className="flex justify-between py-3 bg-emerald-50 px-4 rounded-lg">
                  <span className="font-bold text-lg">Gross Profit</span>
                  <span className="text-emerald-600 font-bold text-lg">৳{totalRevenue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Item-wise Tab */}
          {activeTab === 'item-wise' && (
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-x-auto">
              <div className="p-4 lg:p-6 border-b">
                <h2 className="text-xl lg:text-2xl font-bold">🍽️ Top Selling Items</h2>
              </div>
              {topItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No items sold yet</div>
              ) : (
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">ITEM</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">QTY</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">REVENUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.map((item, idx) => (
                      <tr key={idx} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold">{item.name}</td>
                        <td className="px-4 py-3 text-right">×{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                          ৳{item.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Category-wise Tab */}
          {activeTab === 'category-wise' && (
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-x-auto">
              <div className="p-4 lg:p-6 border-b">
                <h2 className="text-xl lg:text-2xl font-bold">📁 Category-wise Sales</h2>
              </div>
              {categoryData.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No sales data yet</div>
              ) : (
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">CATEGORY</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">QTY</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">REVENUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((cat, idx) => (
                      <tr key={idx} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold">{cat.category}</td>
                        <td className="px-4 py-3 text-right">×{cat.quantity}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                          ৳{cat.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Payment Methods Tab */}
          {activeTab === 'payment-methods' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
              <div className="bg-white rounded-xl p-4 lg:p-6 border-2 border-emerald-200">
                <div className="text-sm text-emerald-600 mb-2">💵 Cash</div>
                <div className="text-2xl lg:text-3xl font-bold text-emerald-700">
                  ৳{cashSales.toFixed(2)}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 lg:p-6 border-2 border-blue-200">
                <div className="text-sm text-blue-600 mb-2">💳 Card</div>
                <div className="text-2xl lg:text-3xl font-bold text-blue-700">
                  ৳{cardSales.toFixed(2)}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 lg:p-6 border-2 border-purple-200">
                <div className="text-sm text-purple-600 mb-2">📱 Mobile</div>
                <div className="text-2xl lg:text-3xl font-bold text-purple-700">
                  ৳{mobileSales.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
