'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/api/tables'
import BackButton from '@/components/BackButton'

interface Order {
  id: string
  total: number
  created_at: string
  payment_method: string | null
}

interface OrderWithItems extends Order {
  order_items?: Array<{
    quantity: number
    unit_price?: number
    price?: number
    item_name?: string
    menu_item_id?: string
    menu_item?: {
      name?: string
      category?: string | { name?: string }
    }
  }>
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily-sales')
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('today')

  useEffect(() => {
    fetchOrders()
  }, [dateFilter])

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            unit_price,
            item_name,
            menu_item_id,
            menu_item:menu_items (
              name,
              category:categories(name)
            )
          )
        `)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })

      if (dateFilter === 'today') {
        const today = new Date().toISOString().split('T')[0]
        query = query.gte('created_at', today)
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', weekAgo)
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', monthAgo)
      }

      const { data, error } = await query

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const totalOrders = orders.length
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Payment breakdown
  const cashSales = orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + o.total, 0)
  const cardSales = orders.filter(o => o.payment_method === 'card').reduce((sum, o) => sum + o.total, 0)
  const mobileSales = orders.filter(o => o.payment_method === 'mobile').reduce((sum, o) => sum + o.total, 0)

  // Item-wise sales (use item_name from order_items or menu_item.name; use unit_price)
  const itemSales = orders.flatMap(o => (o.order_items || []).filter(Boolean)).reduce((acc: any, item: any) => {
    const name = item.item_name || item.menu_item?.name || 'Unknown'
    const qty = item.quantity || 0
    const price = item.unit_price ?? item.price ?? 0
    if (!acc[name]) {
      acc[name] = { name, quantity: 0, revenue: 0 }
    }
    acc[name].quantity += qty
    acc[name].revenue += price * qty
    return acc
  }, {})
  const topItems = Object.values(itemSales).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10)

  // Category-wise sales (category from menu_item.category.name)
  const categorySales = orders.flatMap(o => (o.order_items || []).filter(Boolean)).reduce((acc: any, item: any) => {
    const cat = item.menu_item?.category?.name ?? item.menu_item?.category ?? 'Uncategorized'
    const qty = item.quantity || 0
    const price = item.unit_price ?? item.price ?? 0
    if (!acc[cat]) {
      acc[cat] = { category: cat, quantity: 0, revenue: 0 }
    }
    acc[cat].quantity += qty
    acc[cat].revenue += price * qty
    return acc
  }, {})
  const categoryData = Object.values(categorySales)

  const tabs = [
    { id: 'daily-sales', name: 'Daily Sales', icon: '📊' },
    { id: 'profit-loss', name: 'Profit & Loss', icon: '💰' },
    { id: 'item-wise', name: 'Item-wise', icon: '🍽️' },
    { id: 'category-wise', name: 'Category-wise', icon: '📁' },
    { id: 'payment-methods', name: 'Payment Methods', icon: '💳' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-4xl font-brand font-black text-slate-900">📊 REPORTS</h1>
            <p className="text-slate-600">Business analytics and insights</p>
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
      <div className="bg-white rounded-2xl border-2 border-slate-200 mb-6 overflow-hidden">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[150px] px-4 py-4 font-bold text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'daily-sales' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-xl p-6 border-2 border-emerald-200">
              <div className="text-sm text-emerald-600 mb-1">Total Revenue</div>
              <div className="text-3xl font-bold text-emerald-700">৳{totalRevenue.toFixed(2)}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="text-sm text-blue-600 mb-1">Total Orders</div>
              <div className="text-3xl font-bold text-blue-700">{totalOrders}</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
              <div className="text-sm text-purple-600 mb-1">Avg Order</div>
              <div className="text-3xl font-bold text-purple-700">৳{avgOrder.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profit-loss' && (
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200">
          <h2 className="text-2xl font-bold mb-4">💰 Profit & Loss</h2>
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

      {activeTab === 'item-wise' && (
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">🍽️ Top Selling Items</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold">ITEM</th>
                <th className="px-4 py-3 text-right text-xs font-bold">QTY</th>
                <th className="px-4 py-3 text-right text-xs font-bold">REVENUE</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((item: any, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold">{item.name}</td>
                  <td className="px-4 py-3 text-right">×{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-bold">৳{(item.revenue || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'category-wise' && (
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">📁 Category-wise Sales</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold">CATEGORY</th>
                <th className="px-4 py-3 text-right text-xs font-bold">QTY</th>
                <th className="px-4 py-3 text-right text-xs font-bold">REVENUE</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((cat: any, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-3 font-semibold">{cat.category}</td>
                  <td className="px-4 py-3 text-right">×{cat.quantity}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-bold">৳{cat.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payment-methods' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 border-2 border-emerald-200">
            <div className="text-sm text-emerald-600 mb-2">💵 Cash</div>
            <div className="text-3xl font-bold text-emerald-700">৳{cashSales.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl p-6 border-2 border-blue-200">
            <div className="text-sm text-blue-600 mb-2">💳 Card</div>
            <div className="text-3xl font-bold text-blue-700">৳{cardSales.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl p-6 border-2 border-purple-200">
            <div className="text-sm text-purple-600 mb-2">📱 Mobile</div>
            <div className="text-3xl font-bold text-purple-700">৳{mobileSales.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  )
}