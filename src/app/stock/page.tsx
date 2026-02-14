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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6 flex items-center gap-4">
        <BackButton />
        <div>
          <h1 className="text-4xl font-brand font-black text-slate-900">📦 STOCK MANAGEMENT</h1>
          <p className="text-slate-600">Track and manage inventory</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border-2 border-slate-200">
          <div className="text-sm text-slate-500 mb-1">Total Items</div>
          <div className="text-2xl font-bold text-slate-900">{items.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border-2 border-orange-200">
          <div className="text-sm text-orange-600 mb-1">Low Stock</div>
          <div className="text-2xl font-bold text-orange-600">{lowStock}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border-2 border-red-200">
          <div className="text-sm text-red-600 mb-1">Out of Stock</div>
          <div className="text-2xl font-bold text-red-600">{outOfStock}</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border-2 border-slate-200 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
        <table className="w-full">
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
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => updateStock(item.id, -10)}
                          className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-sm"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => updateStock(item.id, -1)}
                          className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => updateStock(item.id, 1)}
                          className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => updateStock(item.id, 10)}
                          className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm"
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