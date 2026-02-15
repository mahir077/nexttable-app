'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/api/tables'
import BackButton from '@/components/BackButton'

interface MenuItem {
  id: string
  name: string
  name_bangla: string | null
  category: string
  stock_quantity: number
}

export default function StockPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('name')

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStock = async (itemId: string, change: number) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const newQuantity = Math.max(0, (item.stock_quantity || 0) + change)

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ stock_quantity: newQuantity })
        .eq('id', itemId)

      if (error) throw error
      fetchItems()
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to update stock')
    }
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.name_bangla?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const lowStock = items.filter(i => (i.stock_quantity || 0) < 10).length
  const outOfStock = items.filter(i => (i.stock_quantity || 0) === 0).length

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="mb-4 flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl lg:text-3xl font-brand font-black text-slate-900">📦 Stock</h1>
          <p className="text-slate-600 text-sm">Track and update inventory</p>
        </div>
      </div>

      {/* Stats - compact and clear */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-slate-200 text-center">
          <div className="text-xs text-slate-500 font-semibold uppercase">Items</div>
          <div className="text-xl font-bold text-slate-900">{items.length}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-center">
          <div className="text-xs text-amber-700 font-semibold uppercase">Low (&lt;10)</div>
          <div className="text-xl font-bold text-amber-700">{lowStock}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
          <div className="text-xs text-red-700 font-semibold uppercase">Out</div>
          <div className="text-xl font-bold text-red-700">{outOfStock}</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border-2 border-slate-200 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">ITEM</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">CATEGORY</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">STOCK</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No items found</td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const stock = item.stock_quantity || 0
                const stockColor = stock === 0 ? 'text-red-600' : stock < 10 ? 'text-orange-600' : 'text-emerald-600'
                
                return (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      {item.name_bangla && (
                        <div className="text-sm text-slate-500">{item.name_bangla}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.category}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-2xl font-bold ${stockColor}`}>{stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-center gap-1 lg:gap-2">
                        <button
                          type="button"
                          onClick={() => updateStock(item.id, -10)}
                          className="px-2 py-1 lg:px-3 lg:py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs lg:text-sm"
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStock(item.id, -1)}
                          className="px-2 py-1 lg:px-3 lg:py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs lg:text-sm"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStock(item.id, 1)}
                          className="px-2 py-1 lg:px-3 lg:py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs lg:text-sm"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStock(item.id, 10)}
                          className="px-2 py-1 lg:px-3 lg:py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs lg:text-sm"
                        >
                          +10
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}