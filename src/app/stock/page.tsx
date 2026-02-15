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
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <BackButton />
        <div>
          <h1 className="text-3xl font-brand font-black text-slate-900">📦 STOCK</h1>
          <p className="text-slate-600">Inventory management</p>
        </div>
      </div>

      {/* Stats - compact */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500">Total Items</div>
          <div className="text-xl font-bold text-slate-900">{items.length}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-orange-200">
          <div className="text-xs text-orange-600">Low Stock</div>
          <div className="text-xl font-bold text-orange-600">{lowStock}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-red-200">
          <div className="text-xs text-red-600">Out of Stock</div>
          <div className="text-xl font-bold text-red-600">{outOfStock}</div>
        </div>
      </div>

      {/* Search - compact */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          className="w-full px-4 py-2 rounded-lg border border-slate-200 text-slate-900 focus:border-emerald-500 focus:outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Table - cleaner */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">ITEM</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">CATEGORY</th>
                <th className="px-3 py-2 text-center text-xs font-bold text-slate-600">STOCK</th>
                <th className="px-3 py-2 text-center text-xs font-bold text-slate-600">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">No items found</td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const stock = item.stock_quantity || 0
                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        {item.name_bangla && (
                          <div className="text-xs text-slate-500">{item.name_bangla}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{item.category}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`text-lg font-bold ${
                            stock === 0 ? 'text-red-600' : stock < 10 ? 'text-orange-600' : 'text-emerald-600'
                          }`}
                        >
                          {stock}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => updateStock(item.id, -10)}
                            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-bold"
                          >
                            -10
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStock(item.id, -1)}
                            className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-bold"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStock(item.id, 1)}
                            className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-bold"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStock(item.id, 10)}
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-bold"
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
    </div>
  )
}