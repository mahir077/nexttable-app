'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/api/tables'
import BackButton from '@/components/BackButton'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/Toast'

interface MenuItem {
  id: string
  name: string
  making_cost: number
  category: string
}

interface StockSummary {
  id: string
  menu_item_id: string
  current_quantity: number
  opening_value: number
  total_in_value: number
  total_out_value: number
  current_value: number
  last_updated: string
  menu_item?: MenuItem
}

export default function StockPage() {
  const [stockData, setStockData] = useState<StockSummary[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showOpeningModal, setShowOpeningModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState('')
  const [openingQty, setOpeningQty] = useState('')
  const [openingValue, setOpeningValue] = useState('')

  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch stock summary - simplified query
      const { data: stockDataRes, error: stockError } = await supabase
        .from('stock_summary')
        .select('*')
        .order('last_updated', { ascending: false })

      if (stockError) {
        console.error('Stock error:', stockError)
        throw stockError
      }

      console.log('Stock data fetched:', stockDataRes?.length)

      // Fetch menu items separately
      const menuItemIds = stockDataRes?.map((s: { menu_item_id?: string }) => s.menu_item_id).filter(Boolean) || []

      let itemsMap: Record<string, { id: string; name: string; making_cost: number; category: string }> = {}
      if (menuItemIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('menu_items')
          .select('id, name, making_cost, category')
          .in('id', menuItemIds)

        if (!itemsError && itemsData) {
          itemsMap = itemsData.reduce((acc, item) => {
            acc[item.id] = item
            return acc
          }, {} as Record<string, { id: string; name: string; making_cost: number; category: string }>)
        }
      }

      // Combine data
      const combinedData = (stockDataRes || []).map((stock: StockSummary) => ({
        ...stock,
        menu_item: itemsMap[stock.menu_item_id] || null
      }))

      setStockData(combinedData)

      // Fetch all menu items for opening balance dropdown
      const { data: allItems } = await supabase
        .from('menu_items')
        .select('id, name, making_cost, category')
        .order('name')

      setMenuItems(allItems || [])
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to load stock data: ' + (error as Error).message, 'error')
      setStockData([])
    } finally {
      setLoading(false)
    }
  }

  const handleSetOpening = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedItem || !openingQty || !openingValue) {
      showToast('Please fill all fields', 'error')
      return
    }

    try {
      const quantity = parseFloat(openingQty)
      const value = parseFloat(openingValue)

      // Create opening stock movement
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          menu_item_id: selectedItem,
          movement_type: 'opening',
          quantity: quantity,
          unit_cost: value / quantity,
          total_value: value,
          notes: 'Opening stock balance'
        })

      if (movementError) throw movementError

      // Update stock summary
      const { error: summaryError } = await supabase
        .from('stock_summary')
        .upsert({
          menu_item_id: selectedItem,
          current_quantity: quantity,
          opening_value: value,
          total_in_value: 0,
          total_out_value: 0,
          current_value: value,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'menu_item_id'
        })

      if (summaryError) throw summaryError

      showToast('✅ Opening balance set!', 'success')
      setShowOpeningModal(false)
      setSelectedItem('')
      setOpeningQty('')
      setOpeningValue('')
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to set opening balance', 'error')
    }
  }

  // Calculate totals
  const totalStockValue = stockData.reduce((sum, item) => sum + (item.current_value || 0), 0)
  const totalInValue = stockData.reduce((sum, item) => sum + (item.total_in_value || 0), 0)
  const totalOutValue = stockData.reduce((sum, item) => sum + (item.total_out_value || 0), 0)

  return (
    <div className="min-h-screen bg-slate-50 p-3 lg:p-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 lg:gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl lg:text-4xl font-brand font-black text-slate-900">📦 STOCK VALUE</h1>
            <p className="text-xs lg:text-sm text-slate-600">Value-based inventory tracking</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/stock/ledger"
            className="px-4 py-3 bg-slate-600 text-white rounded-lg font-bold hover:bg-slate-700 text-center"
          >
            📜 View Ledger
          </Link>
          <button
            onClick={() => setShowOpeningModal(true)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600"
          >
            📝 Set Opening Balance
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
          <div className="text-xs text-blue-600 mb-1">Current Stock Value</div>
          <div className="text-2xl lg:text-3xl font-bold text-blue-700">
            ৳{totalStockValue.toFixed(2)}
          </div>
        </div>

        <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
          <div className="text-xs text-emerald-600 mb-1">Total IN (Purchases)</div>
          <div className="text-2xl lg:text-3xl font-bold text-emerald-700">
            ৳{totalInValue.toFixed(2)}
          </div>
        </div>

        <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
          <div className="text-xs text-red-600 mb-1">Total OUT (Sales)</div>
          <div className="text-2xl lg:text-3xl font-bold text-red-700">
            ৳{totalOutValue.toFixed(2)}
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
          <div className="text-xs text-purple-600 mb-1">Total Items</div>
          <div className="text-2xl lg:text-3xl font-bold text-purple-700">
            {stockData.length}
          </div>
        </div>
      </div>

      {/* Opening Balance Modal */}
      {showOpeningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Set Opening Balance</h2>
              <button type="button" onClick={() => setShowOpeningModal(false)} className="text-2xl">×</button>
            </div>

            <form onSubmit={handleSetOpening} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Select Item *
                </label>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="">Choose item...</option>
                  {menuItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Cost: ৳{item.making_cost})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Opening Quantity *
                </label>
                <input
                  type="number"
                  value={openingQty}
                  onChange={(e) => setOpeningQty(e.target.value)}
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                  placeholder="e.g., 100"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Opening Value (৳) *
                </label>
                <input
                  type="number"
                  value={openingValue}
                  onChange={(e) => setOpeningValue(e.target.value)}
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                  placeholder="e.g., 5000.00"
                />
                {openingQty && openingValue && (
                  <p className="text-xs text-slate-500 mt-1">
                    Unit cost: ৳{(parseFloat(openingValue) / parseFloat(openingQty)).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOpeningModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-lg font-bold"
                >
                  Set Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Table */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <div className="text-slate-500">Loading stock data...</div>
        </div>
      ) : stockData.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
          <div className="text-6xl mb-4">📦</div>
          <div className="text-xl font-bold text-slate-900 mb-2">No Stock Data Yet</div>
          <div className="text-slate-600 mb-4">
            Set opening balances or make purchases to start tracking stock values
          </div>
          <button
            onClick={() => setShowOpeningModal(true)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600"
          >
            📝 Set Opening Balance
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold">Item Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-bold">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-bold">Opening Value</th>
                  <th className="px-4 py-3 text-right text-xs font-bold">IN (+৳)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold">OUT (-৳)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold">Current Value</th>
                </tr>
              </thead>
              <tbody>
                {stockData.map(item => (
                  <tr key={item.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {item.menu_item?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">
                      {item.menu_item?.category}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {item.current_quantity.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600">
                      ৳{item.opening_value.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                      +৳{item.total_in_value.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">
                      -৳{item.total_out_value.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-lg text-slate-900">
                      ৳{item.current_value.toFixed(2)}
                    </td>
                  </tr>
                ))}

                {/* Totals Row */}
                <tr className="border-t-2 bg-slate-100 font-bold">
                  <td colSpan={3} className="px-4 py-4 text-right">TOTAL:</td>
                  <td className="px-4 py-4 text-right text-blue-700">
                    ৳{stockData.reduce((s, i) => s + i.opening_value, 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right text-emerald-700">
                    +৳{totalInValue.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right text-red-700">
                    -৳{totalOutValue.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right text-xl text-slate-900">
                    ৳{totalStockValue.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
