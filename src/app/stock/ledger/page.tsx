'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/api/tables'
import BackButton from '@/components/BackButton'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'

interface StockMovement {
  id: string
  menu_item_id: string
  movement_type: string
  quantity: number
  unit_cost: number
  total_value: number
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  movement_date: string
  menu_item?: {
    name: string
    category: string
  }
}

interface MenuItemOption {
  id: string
  name: string
}

export default function StockLedgerPage() {
  const { organization } = useAuth()
  const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterItem, setFilterItem] = useState('all')
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([])

  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    if (orgId) fetchData()
    else setMovements([])
  }, [orgId, filterType, filterItem])

  const fetchData = async () => {
    if (!orgId) return
    try {
      setLoading(true)

      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          menu_item:menu_items(name, category:categories(name))
        `)
        .eq('organization_id', orgId)
        .order('movement_date', { ascending: false })
        .limit(200)

      if (filterType !== 'all') {
        query = query.eq('movement_type', filterType)
      }

      if (filterItem !== 'all') {
        query = query.eq('menu_item_id', filterItem)
      }

      let { data, error } = await query

      if (error) {
        let fallback = supabase
          .from('stock_movements')
          .select('*, menu_item:menu_items(name)')
          .eq('organization_id', orgId)
          .order('movement_date', { ascending: false })
          .limit(200)
        if (filterType !== 'all') fallback = fallback.eq('movement_type', filterType)
        if (filterItem !== 'all') fallback = fallback.eq('menu_item_id', filterItem)
        const res = await fallback
        if (res.error) {
          let bare = supabase.from('stock_movements').select('*').eq('organization_id', orgId).order('movement_date', { ascending: false }).limit(200)
          if (filterType !== 'all') bare = bare.eq('movement_type', filterType)
          if (filterItem !== 'all') bare = bare.eq('menu_item_id', filterItem)
          const bareRes = await bare
          if (bareRes.error) throw bareRes.error
          data = bareRes.data || []
        } else {
          data = res.data
        }
      }

      setMovements((data || []) as StockMovement[])

      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('id, name')
        .eq('organization_id', orgId)
        .order('name')

      setMenuItems(itemsData || [])
    } catch (err) {
      showToast('Failed to load movements', 'error')
      setMovements([])
    } finally {
      setLoading(false)
    }
  }

  const totalIn = movements
    .filter(m => m.movement_type !== 'sale')
    .reduce((sum, m) => sum + m.total_value, 0)

  const totalOut = movements
    .filter(m => m.movement_type === 'sale')
    .reduce((sum, m) => sum + m.total_value, 0)

  return (
    <div className="min-h-screen bg-slate-50 p-3 lg:p-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex items-center gap-3 lg:gap-4">
        <BackButton />
        <div>
          <h1 className="text-2xl lg:text-4xl font-brand font-black text-slate-900">📜 STOCK LEDGER</h1>
          <p className="text-xs lg:text-sm text-slate-600">Complete stock movement history</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border-2 border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Total Movements</div>
          <div className="text-3xl font-bold text-slate-900">{movements.length}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
          <div className="text-xs text-emerald-600 mb-1">Total IN</div>
          <div className="text-2xl lg:text-3xl font-bold text-emerald-700">৳{totalIn.toFixed(2)}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
          <div className="text-xs text-red-600 mb-1">Total OUT</div>
          <div className="text-2xl lg:text-3xl font-bold text-red-700">৳{totalOut.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Movement Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg text-slate-900"
            >
              <option value="all">All Types</option>
              <option value="opening">Opening Balance</option>
              <option value="purchase">Purchases (IN)</option>
              <option value="sale">Sales (OUT)</option>
              <option value="adjustment">Adjustments</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Item</label>
            <select
              value={filterItem}
              onChange={(e) => setFilterItem(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg text-slate-900"
            >
              <option value="all">All Items</option>
              {menuItems.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : movements.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
          <div className="text-6xl mb-4">📜</div>
          <div className="text-xl font-bold text-slate-900 mb-2">No Movements Found</div>
          <div className="text-slate-600">Stock movements will appear here</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-bold">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-bold">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-bold">Unit Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-bold">Total Value</th>
                  <th className="px-4 py-3 text-left text-xs font-bold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(movement => (
                  <tr key={movement.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs">
                      {new Date(movement.movement_date).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {movement.menu_item?.name ?? menuItems.find(m => m.id === movement.menu_item_id)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        movement.movement_type === 'opening' ? 'bg-blue-100 text-blue-700' :
                        movement.movement_type === 'purchase' ? 'bg-emerald-100 text-emerald-700' :
                        movement.movement_type === 'sale' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {movement.movement_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {movement.movement_type === 'sale' ? '-' : '+'}{movement.quantity.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ৳{movement.unit_cost.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      movement.movement_type === 'sale' ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {movement.movement_type === 'sale' ? '-' : '+'}৳{movement.total_value.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {movement.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
