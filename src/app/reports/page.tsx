'use client'

import { useState, useEffect } from 'react'
import { ensureSession } from '@/lib/supabase-client'
import BackButton from '@/components/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import {
  getOrdersReportBaseQuery,
  getOrdersReportFallbackQuery,
} from '@/app/lib/db/orders'
import {
  getStockSummaryBaseQuery,
  getStockSummaryFallbackQuery,
} from '@/app/lib/db/stock'
import { fetchPurchasesWithSuppliers } from '@/app/lib/db/purchases'

interface Order {
  id: string
  total: number
  created_at: string
  payment_method: string | null
  order_type: string | null
  status?: string
}

interface OrderItem {
  quantity: number
  price?: number
  unit_price?: number
  item_name?: string
  menu_item?: {
    name: string
    category: string | { name?: string }
    cost?: number
  }
}

interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

export default function ReportsPage() {
  const { organization } = useAuth()
  const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)
  const [activeTab, setActiveTab] = useState('daily-sales')
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [stockData, setStockData] = useState<{ opening_value?: number; total_in_value?: number; total_out_value?: number; current_value?: number; menu_item?: { name?: string; category?: string } }[]>([])
  const [purchases, setPurchases] = useState<{ total_amount?: number; purchase_date?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('today')

  const fetchStockData = async () => {
    await ensureSession()
    if (!orgId) return
    try {
      const { data, error } = await getStockSummaryBaseQuery(orgId)
      if (error) {
        const { data: fallbackData } = await getStockSummaryFallbackQuery(orgId)
        setStockData(fallbackData || [])
        return
      }
      setStockData(data || [])
    } catch {
      setStockData([])
    }
  }

  const fetchPurchases = async () => {
    await ensureSession()
    if (!orgId) return
    try {
      const { data, error } = await fetchPurchasesWithSuppliers(orgId)
      if (error) { setPurchases([]); return }
      let filtered = data || []
      if (dateFilter === 'today') {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        filtered = filtered.filter(p => new Date(p.purchase_date ?? '') >= today)
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
        filtered = filtered.filter(p => new Date(p.purchase_date ?? '') >= weekAgo)
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)
        filtered = filtered.filter(p => new Date(p.purchase_date ?? '') >= monthAgo)
      }
      setPurchases(filtered || [])
    } catch {
      setPurchases([])
    }
  }

  useEffect(() => {
    if (!orgId) return
    fetchOrders()
    fetchStockData()
    fetchPurchases()
  }, [orgId, dateFilter])

  const fetchOrders = async () => {
    await ensureSession()
    if (!orgId) return
    try {
      setLoading(true)
      let query = getOrdersReportBaseQuery(orgId)
      if (dateFilter === 'today') {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        query = query.gte('created_at', today.toISOString())
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)
        query = query.gte('created_at', monthAgo.toISOString())
      }
      const { data, error } = await query
      if (error) {
        let fallback = getOrdersReportFallbackQuery(orgId)
        if (dateFilter === 'today') {
          const today = new Date(); today.setHours(0, 0, 0, 0)
          fallback = fallback.gte('created_at', today.toISOString())
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
          fallback = fallback.gte('created_at', weekAgo.toISOString())
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)
          fallback = fallback.gte('created_at', monthAgo.toISOString())
        }
        const { data: fallbackData, error: fallbackError } = await fallback
        if (fallbackError) { setOrders([]); return }
        setOrders((fallbackData || []) as unknown as OrderWithItems[])
        return
      }
      setOrders((data || []) as unknown as OrderWithItems[])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const paidOrders = orders.filter(o => o.status === 'paid')
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  const totalOrders = paidOrders.length
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const cashSales = paidOrders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (o.total || 0), 0)
  const cardSales = paidOrders.filter(o => o.payment_method === 'card').reduce((sum, o) => sum + (o.total || 0), 0)
  const mobileSales = paidOrders.filter(o => o.payment_method === 'mobile').reduce((sum, o) => sum + (o.total || 0), 0)

  const itemSales: Record<string, { name: string; quantity: number; revenue: number; cost: number }> = {}
  paidOrders.forEach(order => {
    if (order.order_items && Array.isArray(order.order_items)) {
      order.order_items.forEach(item => {
        const name = item.menu_item?.name ?? item.item_name
        if (name) {
          const price = item.price ?? item.unit_price ?? 0
          const qty = item.quantity || 0
          const makingCost = item.menu_item?.cost ?? 0
          if (!itemSales[name]) itemSales[name] = { name, quantity: 0, revenue: 0, cost: 0 }
          itemSales[name].quantity += qty
          itemSales[name].revenue += price * qty
          itemSales[name].cost += makingCost * qty
        }
      })
    }
  })
  const topItems = Object.values(itemSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  const totalCost = Object.values(itemSales).reduce((sum, d) => sum + (d.cost ?? 0), 0)
  const totalProfit = totalRevenue - totalCost
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  const categorySales: Record<string, { category: string; quantity: number; revenue: number }> = {}
  paidOrders.forEach(order => {
    if (order.order_items && Array.isArray(order.order_items)) {
      order.order_items.forEach(item => {
        const rawCat = item.menu_item?.category
        const cat = typeof rawCat === 'object' && rawCat !== null && 'name' in rawCat
          ? (rawCat as { name?: string }).name ?? 'Uncategorized'
          : (typeof rawCat === 'string' ? rawCat : null)
        if (cat) {
          const price = item.price ?? item.unit_price ?? 0
          if (!categorySales[cat]) categorySales[cat] = { category: cat, quantity: 0, revenue: 0 }
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
    { id: 'stock-value', name: 'Stock Value', icon: '📦' },
    { id: 'cost-analysis', name: 'Cost Analysis', icon: '💵' },
    { id: 'purchase-sales', name: 'Purchase vs Sales', icon: '📊' },
  ]

  const totalPurchases = purchases.reduce((s, p) => s + (p.total_amount || 0), 0)

  return (
    <div className="min-h-screen bg-slate-50 p-3 lg:p-6">
      <div className="mb-4 lg:mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3 lg:gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl lg:text-4xl font-brand font-black text-slate-900">📊 REPORTS</h1>
            <p className="text-xs lg:text-sm text-slate-600">Business analytics</p>
          </div>
        </div>
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

      <div className="bg-white rounded-xl border-2 border-slate-200 mb-4 lg:mb-6 overflow-x-auto">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] px-4 py-3 lg:py-4 font-bold text-xs lg:text-sm ${
                activeTab === tab.id ? 'bg-emerald-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <div className="text-slate-600">Loading...</div>
        </div>
      ) : (
        <>
          {activeTab === 'daily-sales' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
              <div className="bg-emerald-50 rounded-xl p-4 lg:p-6 border-2 border-emerald-200">
                <div className="text-xs lg:text-sm text-emerald-700 font-semibold mb-1">Total Revenue</div>
                <div className="text-2xl lg:text-3xl font-bold text-emerald-700">৳{totalRevenue.toFixed(2)}</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 lg:p-6 border-2 border-blue-200">
                <div className="text-xs lg:text-sm text-blue-700 font-semibold mb-1">Total Orders</div>
                <div className="text-2xl lg:text-3xl font-bold text-blue-700">{totalOrders}</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 lg:p-6 border-2 border-purple-200">
                <div className="text-xs lg:text-sm text-purple-700 font-semibold mb-1">Avg Order</div>
                <div className="text-2xl lg:text-3xl font-bold text-purple-700">৳{avgOrder.toFixed(2)}</div>
              </div>
            </div>
          )}

          {activeTab === 'profit-loss' && (
            <div className="bg-white rounded-xl p-4 lg:p-6 border-2 border-slate-200">
              <h2 className="text-xl lg:text-2xl font-bold mb-4 text-slate-900">💰 Profit & Loss</h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b">
                  <span className="font-semibold text-slate-800">Total Revenue</span>
                  <span className="text-emerald-600 font-bold">৳{totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 border-b">
                  <span className="font-semibold text-slate-800">Cost (Not tracked)</span>
                  <span className="text-slate-600 font-semibold">৳0.00</span>
                </div>
                <div className="flex justify-between py-3 bg-emerald-50 px-4 rounded-lg">
                  <span className="font-bold text-lg text-slate-900">Gross Profit</span>
                  <span className="text-emerald-600 font-bold text-lg">৳{totalRevenue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'item-wise' && (
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-x-auto">
              <div className="p-4 lg:p-6 border-b">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900">🍽️ Top Items</h2>
              </div>
              {topItems.length === 0 ? (
                <div className="p-8 text-center text-slate-600">No data</div>
              ) : (
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700">ITEM</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">QTY</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">REVENUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-3 text-slate-700">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-right text-slate-700">×{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-bold">৳{item.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'category-wise' && (
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-x-auto">
              <div className="p-4 lg:p-6 border-b">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900">📁 Categories</h2>
              </div>
              {categoryData.length === 0 ? (
                <div className="p-8 text-center text-slate-600">No data</div>
              ) : (
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700">CATEGORY</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">QTY</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">REVENUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((cat, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-3 font-semibold text-slate-800">{cat.category}</td>
                        <td className="px-4 py-3 text-right text-slate-700">×{cat.quantity}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-bold">৳{cat.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'payment-methods' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
              <div className="bg-white rounded-xl p-4 lg:p-6 border-2 border-emerald-200">
                <div className="text-sm text-emerald-700 font-semibold mb-2">💵 Cash</div>
                <div className="text-2xl lg:text-3xl font-bold text-emerald-700">৳{cashSales.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 lg:p-6 border-2 border-blue-200">
                <div className="text-sm text-blue-700 font-semibold mb-2">💳 Card</div>
                <div className="text-2xl lg:text-3xl font-bold text-blue-700">৳{cardSales.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 lg:p-6 border-2 border-purple-200">
                <div className="text-sm text-purple-700 font-semibold mb-2">📱 Mobile</div>
                <div className="text-2xl lg:text-3xl font-bold text-purple-700">৳{mobileSales.toFixed(2)}</div>
              </div>
            </div>
          )}

          {activeTab === 'cost-analysis' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
                <div className="bg-emerald-50 rounded-xl p-4 lg:p-6 border-2 border-emerald-200">
                  <div className="text-xs lg:text-sm text-emerald-700 font-semibold mb-1">Total Revenue</div>
                  <div className="text-2xl lg:text-3xl font-bold text-emerald-700">৳{totalRevenue.toFixed(2)}</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 lg:p-6 border-2 border-red-200">
                  <div className="text-xs lg:text-sm text-red-700 font-semibold mb-1">Total Cost</div>
                  <div className="text-2xl lg:text-3xl font-bold text-red-700">৳{totalCost.toFixed(2)}</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 lg:p-6 border-2 border-blue-200">
                  <div className="text-xs lg:text-sm text-blue-700 font-semibold mb-1">Net Profit</div>
                  <div className="text-2xl lg:text-3xl font-bold text-blue-700">৳{totalProfit.toFixed(2)}</div>
                  <div className="text-xs text-blue-700 mt-1">{profitMargin.toFixed(1)}% margin</div>
                </div>
              </div>

              <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
                <div className="p-4 lg:p-6 border-b">
                  <h2 className="text-xl lg:text-2xl font-bold text-slate-900">💵 Item-wise Cost & Profit Analysis</h2>
                </div>
                {Object.keys(itemSales).length === 0 ? (
                  <div className="p-8 text-center text-slate-600">No sales data available</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700">Item</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">Qty Sold</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">Avg Price</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">Avg Cost</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">Total Cost</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">Profit</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">Margin %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(itemSales)
                          .sort(([, a], [, b]) => (b.revenue - (b.cost || 0)) - (a.revenue - (a.cost || 0)))
                          .map(([name, data], idx) => {
                            const itemCost = data.cost || 0
                            const itemProfit = data.revenue - itemCost
                            const itemMargin = data.revenue > 0 ? (itemProfit / data.revenue) * 100 : 0
                            return (
                              <tr key={idx} className="border-t hover:bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-slate-800">{name}</td>
                                <td className="px-4 py-3 text-right text-slate-700">{data.quantity}</td>
                                <td className="px-4 py-3 text-right text-slate-700">৳{(data.quantity > 0 ? data.revenue / data.quantity : 0).toFixed(2)}</td>
                                <td className="px-4 py-3 text-right text-red-600">৳{data.quantity > 0 ? (itemCost / data.quantity).toFixed(2) : '0.00'}</td>
                                <td className="px-4 py-3 text-right text-emerald-600 font-bold">৳{data.revenue.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right text-red-600">৳{itemCost.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right font-bold text-blue-600">৳{itemProfit.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    itemMargin >= 50 ? 'bg-emerald-100 text-emerald-700' :
                                    itemMargin >= 30 ? 'bg-blue-100 text-blue-700' :
                                    itemMargin >= 15 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>{itemMargin.toFixed(1)}%</span>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {totalCost === 0 && totalRevenue > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <div className="text-yellow-800 font-bold mb-1">⚠️ Cost Data Missing</div>
                  <div className="text-sm text-yellow-700">Set making costs for menu items in Menu page to see accurate cost analysis.</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'purchase-sales' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 lg:p-6 border-2 border-blue-200">
                  <div className="text-xs lg:text-sm text-blue-700 font-semibold mb-1">Total Purchases</div>
                  <div className="text-2xl lg:text-3xl font-bold text-blue-700">৳{totalPurchases.toFixed(2)}</div>
                  <div className="text-xs text-blue-700 mt-1">{purchases.length} purchases</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 lg:p-6 border-2 border-emerald-200">
                  <div className="text-xs lg:text-sm text-emerald-700 font-semibold mb-1">Total Sales</div>
                  <div className="text-2xl lg:text-3xl font-bold text-emerald-700">৳{totalRevenue.toFixed(2)}</div>
                  <div className="text-xs text-emerald-700 mt-1">{totalOrders} orders</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 lg:p-6 border-2 border-purple-200">
                  <div className="text-xs lg:text-sm text-purple-700 font-semibold mb-1">Difference</div>
                  <div className={`text-2xl lg:text-3xl font-bold ${totalRevenue > totalPurchases ? 'text-emerald-700' : 'text-red-700'}`}>
                    ৳{(totalRevenue - totalPurchases).toFixed(2)}
                  </div>
                  <div className="text-xs text-purple-700 mt-1">{totalRevenue > totalPurchases ? 'Profit' : 'Loss'}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border-2 border-slate-200 mb-6">
                <h3 className="text-xl font-bold mb-4 text-slate-900">📊 Purchase vs Sales Comparison</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-blue-700">Purchases</span>
                      <span className="text-sm font-bold text-blue-700">৳{totalPurchases.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full flex items-center justify-end px-3 text-white text-xs font-bold"
                        style={{ width: `${Math.min(100, (totalPurchases / Math.max(totalRevenue, totalPurchases, 1)) * 100)}%` }}
                      >
                        {purchases.length} purchases
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-emerald-700">Sales</span>
                      <span className="text-sm font-bold text-emerald-700">৳{totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-emerald-100 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full flex items-center justify-end px-3 text-white text-xs font-bold"
                        style={{ width: `${Math.min(100, (totalRevenue / Math.max(totalRevenue, totalPurchases, 1)) * 100)}%` }}
                      >
                        {totalOrders} orders
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-3">📈 Sales Insights</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-700">Average Order Value:</span>
                      <span className="font-bold text-slate-900">৳{avgOrder.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Total Orders:</span>
                      <span className="font-bold text-slate-900">{totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Total Revenue:</span>
                      <span className="font-bold text-emerald-600">৳{totalRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-3">🛒 Purchase Insights</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-700">Average Purchase:</span>
                      <span className="font-bold text-slate-900">৳{purchases.length > 0 ? (totalPurchases / purchases.length).toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Total Purchases:</span>
                      <span className="font-bold text-slate-900">{purchases.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Total Spent:</span>
                      <span className="font-bold text-blue-600">৳{totalPurchases.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stock-value' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 lg:gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 lg:p-6 border-2 border-blue-200">
                  <div className="text-xs lg:text-sm text-blue-700 font-semibold mb-1">Opening Value</div>
                  <div className="text-2xl lg:text-3xl font-bold text-blue-700">৳{stockData.reduce((sum, item) => sum + (item.opening_value || 0), 0).toFixed(2)}</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 lg:p-6 border-2 border-emerald-200">
                  <div className="text-xs lg:text-sm text-emerald-700 font-semibold mb-1">Stock IN (+)</div>
                  <div className="text-2xl lg:text-3xl font-bold text-emerald-700">৳{stockData.reduce((sum, item) => sum + (item.total_in_value || 0), 0).toFixed(2)}</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 lg:p-6 border-2 border-red-200">
                  <div className="text-xs lg:text-sm text-red-700 font-semibold mb-1">Stock OUT (-)</div>
                  <div className="text-2xl lg:text-3xl font-bold text-red-700">৳{stockData.reduce((sum, item) => sum + (item.total_out_value || 0), 0).toFixed(2)}</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 lg:p-6 border-2 border-purple-200">
                  <div className="text-xs lg:text-sm text-purple-700 font-semibold mb-1">Closing Value</div>
                  <div className="text-2xl lg:text-3xl font-bold text-purple-700">৳{stockData.reduce((sum, item) => sum + (item.current_value || 0), 0).toFixed(2)}</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-6 border-2 border-slate-200">
                <div className="text-sm font-bold text-slate-800 mb-2">Stock Value Formula:</div>
                <div className="text-slate-700 text-sm">
                  <span className="font-bold text-blue-600">Opening Value</span>
                  <span className="mx-2">+</span>
                  <span className="font-bold text-emerald-600">Purchases (IN)</span>
                  <span className="mx-2">-</span>
                  <span className="font-bold text-red-600">Sales (OUT)</span>
                  <span className="mx-2">=</span>
                  <span className="font-bold text-purple-600">Closing Value</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
                <div className="p-4 lg:p-6 border-b">
                  <h2 className="text-xl lg:text-2xl font-bold text-slate-900">📦 Item-wise Stock Value</h2>
                </div>
                {stockData.length === 0 ? (
                  <div className="p-8 text-center text-slate-600">No stock data available</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700">Item</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700">Category</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">Opening</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">+ IN</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">- OUT</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">Closing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockData.map((item, idx) => (
                          <tr key={idx} className="border-t hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-800">{item.menu_item?.name}</td>
                            <td className="px-4 py-3 text-slate-700 capitalize">
                              {typeof item.menu_item?.category === 'object' && item.menu_item?.category !== null && 'name' in item.menu_item.category
                                ? (item.menu_item.category as { name: string }).name
                                : String(item.menu_item?.category ?? '')}
                            </td>
                            <td className="px-4 py-3 text-right text-blue-600">৳{(item.opening_value ?? 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right text-emerald-600 font-bold">+৳{(item.total_in_value ?? 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right text-red-600 font-bold">-৳{(item.total_out_value ?? 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-black text-lg text-purple-600">৳{(item.current_value ?? 0).toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 bg-purple-50 font-bold">
                          <td colSpan={2} className="px-4 py-4 text-right text-slate-800">TOTAL:</td>
                          <td className="px-4 py-4 text-right text-blue-700">৳{stockData.reduce((s, i) => s + (i.opening_value ?? 0), 0).toFixed(2)}</td>
                          <td className="px-4 py-4 text-right text-emerald-700">+৳{stockData.reduce((s, i) => s + (i.total_in_value ?? 0), 0).toFixed(2)}</td>
                          <td className="px-4 py-4 text-right text-red-700">-৳{stockData.reduce((s, i) => s + (i.total_out_value ?? 0), 0).toFixed(2)}</td>
                          <td className="px-4 py-4 text-right text-xl text-purple-700">৳{stockData.reduce((s, i) => s + (i.current_value ?? 0), 0).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}