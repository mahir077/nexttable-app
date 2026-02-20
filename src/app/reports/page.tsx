'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/api/tables'
import BackButton from '@/components/BackButton'

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
    making_cost?: number
  }
}

interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily-sales')
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [stockData, setStockData] = useState<{ opening_value?: number; total_in_value?: number; total_out_value?: number; current_value?: number; menu_item?: { name?: string; category?: string } }[]>([])
  const [purchases, setPurchases] = useState<{ total_amount?: number; purchase_date?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('today')

  const fetchStockData = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_summary')
        .select(`
          *,
          menu_item:menu_items(name, category:categories(name))
        `)

      if (error) {
        const msg = (error as { message?: string; code?: string })?.message || (error as { message?: string; code?: string })?.code || String(error)
        console.warn('Stock data (using fallback):', msg)
        const { data: fallbackData } = await supabase.from('stock_summary').select('*')
        setStockData(fallbackData || [])
        return
      }
      setStockData(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('Stock data error:', msg)
      setStockData([])
    }
  }

  const fetchPurchases = async () => {
    try {
      let query = supabase
        .from('purchases')
        .select('total_amount, purchase_date')
        .order('purchase_date', { ascending: false })

      if (dateFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        query = query.gte('purchase_date', today.toISOString().split('T')[0])
      } else if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('purchase_date', weekAgo.toISOString().split('T')[0])
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setDate(monthAgo.getDate() - 30)
        query = query.gte('purchase_date', monthAgo.toISOString().split('T')[0])
      }

      const { data, error } = await query
      if (error) {
        const msg = (error as { message?: string; code?: string })?.message || String(error)
        console.warn('Purchases fetch error:', msg)
        setPurchases([])
        return
      }
      setPurchases(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('Purchases fetch error:', msg)
      setPurchases([])
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchStockData()
    fetchPurchases()
  }, [dateFilter])

  const fetchOrders = async () => {
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
              category:categories(name),
              making_cost
            )
          )
        `)
        .order('created_at', { ascending: false })

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

      const { data, error } = await query

      if (error) {
        const msg = (error as { message?: string; code?: string })?.message || (error as { message?: string; code?: string })?.code || String(error)
        console.warn('Orders fetch (using fallback):', msg)
        // Fallback without menu_items join
        let fallback = supabase
          .from('orders')
          .select('id, total, created_at, payment_method, order_type, order_items (quantity, unit_price, item_name)')
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
          setOrders([])
          return
        }
        setOrders((fallbackData || []) as unknown as OrderWithItems[])
        return
      }

      setOrders((data || []) as unknown as OrderWithItems[])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('Orders fetch error:', msg)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const totalOrders = orders.length
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const cashSales = orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (o.total || 0), 0)
  const cardSales = orders.filter(o => o.payment_method === 'card').reduce((sum, o) => sum + (o.total || 0), 0)
  const mobileSales = orders.filter(o => o.payment_method === 'mobile').reduce((sum, o) => sum + (o.total || 0), 0)

  const itemSales: Record<string, { name: string; quantity: number; revenue: number; cost: number }> = {}
  orders.forEach(order => {
    if (order.order_items && Array.isArray(order.order_items)) {
      order.order_items.forEach(item => {
        const name = item.menu_item?.name ?? item.item_name
        if (name) {
          const price = item.price ?? item.unit_price ?? 0
          const qty = item.quantity || 0
          const makingCost = item.menu_item?.making_cost ?? 0
          if (!itemSales[name]) {
            itemSales[name] = { name, quantity: 0, revenue: 0, cost: 0 }
          }
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
  orders.forEach(order => {
    if (order.order_items && Array.isArray(order.order_items)) {
      order.order_items.forEach(item => {
        const rawCat = item.menu_item?.category
        const cat = typeof rawCat === 'object' && rawCat !== null && 'name' in rawCat
          ? (rawCat as { name?: string }).name ?? 'Uncategorized'
          : (typeof rawCat === 'string' ? rawCat : null)
        if (cat) {
          const price = item.price ?? item.unit_price ?? 0
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
    { id: 'stock-value', name: 'Stock Value', icon: '📦' },
    { id: 'cost-analysis', name: 'Cost Analysis', icon: '💵' },
    { id: 'purchase-sales', name: 'Purchase vs Sales', icon: '📊' },
  ]

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
                activeTab === tab.id ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
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
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {activeTab === 'daily-sales' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
              <div className="bg-emerald-50 rounded-xl p-4 lg:p-6 border-2 border-emerald-200">
                <div className="text-xs lg:text-sm text-emerald-600 mb-1">Total Revenue</div>
                <div className="text-2xl lg:text-3xl font-bold text-emerald-700">৳{totalRevenue.toFixed(2)}</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 lg:p-6 border-2 border-blue-200">
                <div className="text-xs lg:text-sm text-blue-600 mb-1">Total Orders</div>
                <div className="text-2xl lg:text-3xl font-bold text-blue-700">{totalOrders}</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 lg:p-6 border-2 border-purple-200">
                <div className="text-xs lg:text-sm text-purple-600 mb-1">Avg Order</div>
                <div className="text-2xl lg:text-3xl font-bold text-purple-700">৳{avgOrder.toFixed(2)}</div>
              </div>
            </div>
          )}

          {activeTab === 'profit-loss' && (
            <div className="bg-white rounded-xl p-4 lg:p-6 border-2 border-slate-200">
              <h2 className="text-xl lg:text-2xl font-bold mb-4">💰 Profit & Loss</h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b">
                  <span className="font-semibold">Total Revenue</span>
                  <span className="text-emerald-600 font-bold">৳{totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 border-b">
                  <span className="font-semibold">Cost (Not tracked)</span>
                  <span className="text-slate-400">৳0.00</span>
                </div>
                <div className="flex justify-between py-3 bg-emerald-50 px-4 rounded-lg">
                  <span className="font-bold text-lg">Gross Profit</span>
                  <span className="text-emerald-600 font-bold text-lg">৳{totalRevenue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'item-wise' && (
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-x-auto">
              <div className="p-4 lg:p-6 border-b">
                <h2 className="text-xl lg:text-2xl font-bold">🍽️ Top Items</h2>
              </div>
              {topItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No data</div>
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
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-3">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold">{item.name}</td>
                        <td className="px-4 py-3 text-right">×{item.quantity}</td>
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
                <h2 className="text-xl lg:text-2xl font-bold">📁 Categories</h2>
              </div>
              {categoryData.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No data</div>
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
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-3 font-semibold">{cat.category}</td>
                        <td className="px-4 py-3 text-right">×{cat.quantity}</td>
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
                <div className="text-sm text-emerald-600 mb-2">💵 Cash</div>
                <div className="text-2xl lg:text-3xl font-bold text-emerald-700">৳{cashSales.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 lg:p-6 border-2 border-blue-200">
                <div className="text-sm text-blue-600 mb-2">💳 Card</div>
                <div className="text-2xl lg:text-3xl font-bold text-blue-700">৳{cardSales.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 lg:p-6 border-2 border-purple-200">
                <div className="text-sm text-purple-600 mb-2">📱 Mobile</div>
                <div className="text-2xl lg:text-3xl font-bold text-purple-700">৳{mobileSales.toFixed(2)}</div>
              </div>
            </div>
          )}

          {activeTab === 'cost-analysis' && (
            <div>
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
                <div className="bg-emerald-50 rounded-xl p-4 lg:p-6 border-2 border-emerald-200">
                  <div className="text-xs lg:text-sm text-emerald-600 mb-1">Total Revenue</div>
                  <div className="text-2xl lg:text-3xl font-bold text-emerald-700">
                    ৳{totalRevenue.toFixed(2)}
                  </div>
                </div>

                <div className="bg-red-50 rounded-xl p-4 lg:p-6 border-2 border-red-200">
                  <div className="text-xs lg:text-sm text-red-600 mb-1">Total Cost</div>
                  <div className="text-2xl lg:text-3xl font-bold text-red-700">
                    ৳{totalCost.toFixed(2)}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 lg:p-6 border-2 border-blue-200">
                  <div className="text-xs lg:text-sm text-blue-600 mb-1">Net Profit</div>
                  <div className="text-2xl lg:text-3xl font-bold text-blue-700">
                    ৳{totalProfit.toFixed(2)}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {profitMargin.toFixed(1)}% margin
                  </div>
                </div>
              </div>

              {/* Item-wise Cost & Profit Table */}
              <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
                <div className="p-4 lg:p-6 border-b">
                  <h2 className="text-xl lg:text-2xl font-bold">💵 Item-wise Cost & Profit Analysis</h2>
                </div>

                {Object.keys(itemSales).length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No sales data available</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">Item</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">Qty Sold</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">Avg Price</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">Avg Cost</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">Total Cost</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">Profit</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">Margin %</th>
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
                                <td className="px-4 py-3 font-semibold">{name}</td>
                                <td className="px-4 py-3 text-right">{data.quantity}</td>
                                <td className="px-4 py-3 text-right">৳{(data.quantity > 0 ? data.revenue / data.quantity : 0).toFixed(2)}</td>
                                <td className="px-4 py-3 text-right text-red-600">
                                  ৳{data.quantity > 0 ? (itemCost / data.quantity).toFixed(2) : '0.00'}
                                </td>
                                <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                                  ৳{data.revenue.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right text-red-600">
                                  ৳{itemCost.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-blue-600">
                                  ৳{itemProfit.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    itemMargin >= 50 ? 'bg-emerald-100 text-emerald-700' :
                                    itemMargin >= 30 ? 'bg-blue-100 text-blue-700' :
                                    itemMargin >= 15 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {itemMargin.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Warning if costs missing */}
              {totalCost === 0 && totalRevenue > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <div className="text-yellow-800 font-bold mb-1">⚠️ Cost Data Missing</div>
                  <div className="text-sm text-yellow-700">
                    Set making costs for menu items in Menu page to see accurate cost analysis.
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'purchase-sales' && (
            <div>
              {/* Comparison Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 lg:p-6 border-2 border-blue-200">
                  <div className="text-xs lg:text-sm text-blue-600 mb-1">Total Purchases</div>
                  <div className="text-2xl lg:text-3xl font-bold text-blue-700">
                    ৳{purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">{purchases.length} purchases</div>
                </div>

                <div className="bg-emerald-50 rounded-xl p-4 lg:p-6 border-2 border-emerald-200">
                  <div className="text-xs lg:text-sm text-emerald-600 mb-1">Total Sales</div>
                  <div className="text-2xl lg:text-3xl font-bold text-emerald-700">
                    ৳{totalRevenue.toFixed(2)}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">{totalOrders} orders</div>
                </div>

                <div className="bg-purple-50 rounded-xl p-4 lg:p-6 border-2 border-purple-200">
                  <div className="text-xs lg:text-sm text-purple-600 mb-1">Difference</div>
                  <div className={`text-2xl lg:text-3xl font-bold ${
                    totalRevenue > purchases.reduce((s, p) => s + (p.total_amount || 0), 0)
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }`}>
                    ৳{(totalRevenue - purchases.reduce((s, p) => s + (p.total_amount || 0), 0)).toFixed(2)}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    {totalRevenue > purchases.reduce((s, p) => s + (p.total_amount || 0), 0) ? 'Profit' : 'Loss'}
                  </div>
                </div>
              </div>

              {/* Chart Comparison */}
              <div className="bg-white rounded-xl p-6 border-2 border-slate-200 mb-6">
                <h3 className="text-xl font-bold mb-4">📊 Purchase vs Sales Comparison</h3>

                <div className="space-y-4">
                  {/* Purchases Bar */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-blue-700">Purchases</span>
                      <span className="text-sm font-bold text-blue-700">
                        ৳{purchases.reduce((s, p) => s + (p.total_amount || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full flex items-center justify-end px-3 text-white text-xs font-bold"
                        style={{
                          width: `${Math.min(100, (() => {
                            const totalPurchases = purchases.reduce((s, p) => s + (p.total_amount || 0), 0)
                            const maxVal = Math.max(totalRevenue, totalPurchases, 1)
                            return (totalPurchases / maxVal) * 100
                          })())}%`
                        }}
                      >
                        {purchases.length} purchases
                      </div>
                    </div>
                  </div>

                  {/* Sales Bar */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-emerald-700">Sales</span>
                      <span className="text-sm font-bold text-emerald-700">
                        ৳{totalRevenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-emerald-100 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full flex items-center justify-end px-3 text-white text-xs font-bold"
                        style={{
                          width: `${Math.min(100, (() => {
                            const totalPurchases = purchases.reduce((s, p) => s + (p.total_amount || 0), 0)
                            const maxVal = Math.max(totalRevenue, totalPurchases, 1)
                            return (totalRevenue / maxVal) * 100
                          })())}%`
                        }}
                      >
                        {totalOrders} orders
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-3">📈 Sales Insights</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Average Order Value:</span>
                      <span className="font-bold">৳{avgOrder.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Orders:</span>
                      <span className="font-bold">{totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Revenue:</span>
                      <span className="font-bold text-emerald-600">৳{totalRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-3">🛒 Purchase Insights</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Average Purchase:</span>
                      <span className="font-bold">
                        ৳{purchases.length > 0 ? (purchases.reduce((s, p) => s + (p.total_amount || 0), 0) / purchases.length).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Purchases:</span>
                      <span className="font-bold">{purchases.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Spent:</span>
                      <span className="font-bold text-blue-600">
                        ৳{purchases.reduce((s, p) => s + (p.total_amount || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stock-value' && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 lg:gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 lg:p-6 border-2 border-blue-200">
                  <div className="text-xs lg:text-sm text-blue-600 mb-1">Opening Value</div>
                  <div className="text-2xl lg:text-3xl font-bold text-blue-700">
                    ৳{stockData.reduce((sum, item) => sum + (item.opening_value || 0), 0).toFixed(2)}
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-xl p-4 lg:p-6 border-2 border-emerald-200">
                  <div className="text-xs lg:text-sm text-emerald-600 mb-1">Stock IN (+)</div>
                  <div className="text-2xl lg:text-3xl font-bold text-emerald-700">
                    ৳{stockData.reduce((sum, item) => sum + (item.total_in_value || 0), 0).toFixed(2)}
                  </div>
                </div>

                <div className="bg-red-50 rounded-xl p-4 lg:p-6 border-2 border-red-200">
                  <div className="text-xs lg:text-sm text-red-600 mb-1">Stock OUT (-)</div>
                  <div className="text-2xl lg:text-3xl font-bold text-red-700">
                    ৳{stockData.reduce((sum, item) => sum + (item.total_out_value || 0), 0).toFixed(2)}
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-4 lg:p-6 border-2 border-purple-200">
                  <div className="text-xs lg:text-sm text-purple-600 mb-1">Closing Value</div>
                  <div className="text-2xl lg:text-3xl font-bold text-purple-700">
                    ৳{stockData.reduce((sum, item) => sum + (item.current_value || 0), 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Formula Explanation */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6 border-2 border-slate-200">
                <div className="text-sm font-bold text-slate-700 mb-2">Stock Value Formula:</div>
                <div className="text-slate-600 text-sm">
                  <span className="font-bold text-blue-600">Opening Value</span>
                  <span className="mx-2">+</span>
                  <span className="font-bold text-emerald-600">Purchases (IN)</span>
                  <span className="mx-2">-</span>
                  <span className="font-bold text-red-600">Sales (OUT)</span>
                  <span className="mx-2">=</span>
                  <span className="font-bold text-purple-600">Closing Value</span>
                </div>
              </div>

              {/* Item-wise Stock Value Table */}
              <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
                <div className="p-4 lg:p-6 border-b">
                  <h2 className="text-xl lg:text-2xl font-bold">📦 Item-wise Stock Value</h2>
                </div>

                {stockData.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No stock data available</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">Item</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">Category</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">Opening</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">+ IN</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">- OUT</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">Closing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockData.map((item, idx) => (
                          <tr key={idx} className="border-t hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold">{item.menu_item?.name}</td>
                            <td className="px-4 py-3 text-slate-600 capitalize">{item.menu_item?.category}</td>
                            <td className="px-4 py-3 text-right text-blue-600">৳{(item.opening_value ?? 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                              +৳{(item.total_in_value ?? 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600 font-bold">
                              -৳{(item.total_out_value ?? 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-lg text-purple-600">
                              ৳{(item.current_value ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}

                        {/* Totals */}
                        <tr className="border-t-2 bg-purple-50 font-bold">
                          <td colSpan={2} className="px-4 py-4 text-right">TOTAL:</td>
                          <td className="px-4 py-4 text-right text-blue-700">
                            ৳{stockData.reduce((s, i) => s + (i.opening_value ?? 0), 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-4 text-right text-emerald-700">
                            +৳{stockData.reduce((s, i) => s + (i.total_in_value ?? 0), 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-4 text-right text-red-700">
                            -৳{stockData.reduce((s, i) => s + (i.total_out_value ?? 0), 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-4 text-right text-xl text-purple-700">
                            ৳{stockData.reduce((s, i) => s + (i.current_value ?? 0), 0).toFixed(2)}
                          </td>
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
