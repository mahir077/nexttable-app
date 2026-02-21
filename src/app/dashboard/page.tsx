'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { getFloors, getTablesByFloor, getAllTables, Floor, Table } from '@/app/lib/api/tables'
import { getTodayStats, getWeeklyStats } from '@/app/lib/api/orders'
import type { Order } from '@/app/lib/api/orders'
import TableModal from '@/components/TableModal'
import LoadingSpinner from '@/components/LoadingSpinner'
import { supabase } from '@/app/lib/api/tables'
import { useAuth } from '@/contexts/AuthContext'

interface TodayStats {
  totalRevenue: number
  totalOrders: number
  paymentBreakdown: Record<string, number>
  popularItems: Array<{
    name: string
    name_bangla: string | null
    quantity: number
    revenue: number
  }>
}

export default function DashboardPage() {
  const { organization } = useAuth()
  const [currentDate, setCurrentDate] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const [floors, setFloors] = useState<Floor[]>([])
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Analytics states
  const [todayStats, setTodayStats] = useState<TodayStats>({
    totalRevenue: 0,
    totalOrders: 0,
    paymentBreakdown: {},
    popularItems: []
  })
  const [weeklyRevenue, setWeeklyRevenue] = useState(0)
  // Per-table food status: 'kot' = in kitchen, 'table' = at table
  const [tableFoodStatus, setTableFoodStatus] = useState<Record<string, 'kot' | 'table'>>({})
  // Pending bill amount per table (ready + served orders)
  const [tablePendingBills, setTablePendingBills] = useState<Record<string, number>>({})

  // Merge Table modal
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [allTables, setAllTables] = useState<Table[]>([])
  const [mergeSelectedIds, setMergeSelectedIds] = useState<Set<string>>(new Set())
  const [mergePrimaryId, setMergePrimaryId] = useState<string>('')
  const [mergeLoading, setMergeLoading] = useState(false)

  // Change Table modal
  const [showChangeModal, setShowChangeModal] = useState(false)
  const [activeDineInOrders, setActiveDineInOrders] = useState<Order[]>([])
  const [availableTables, setAvailableTables] = useState<Table[]>([])
  const [changeOrderId, setChangeOrderId] = useState<string>('')
  const [changeNewTableId, setChangeNewTableId] = useState<string>('')
  const [changeLoading, setChangeLoading] = useState(false)

  // Restaurant name from settings (DB first, then localStorage fallback)
  const [restaurantName, setRestaurantName] = useState<string>('NextTable')

  // Available tables count (for Dine-in quick action)
  const [availableTablesCount, setAvailableTablesCount] = useState<number>(0)

  const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)

  useEffect(() => {
    const fetchRestaurantInfo = async () => {
      if (!orgId) return
      try {
        const { data, error } = await supabase
          .from('restaurant_settings')
          .select('display_name')
          .eq('organization_id', orgId)
          .limit(1)
          .maybeSingle()

        if (!error && data?.display_name) {
          setRestaurantName(String(data.display_name))
          return
        }
      } catch (e) {
        console.error('Error fetching restaurant info:', e)
      }
      try {
        const saved = localStorage.getItem('restaurantInfo')
        if (saved) {
          const info = JSON.parse(saved) as { name?: string }
          if (info.name && typeof info.name === 'string') setRestaurantName(info.name)
        }
      } catch {
        // keep default
      }
    }
    fetchRestaurantInfo()
  }, [orgId])

  // Set current date
  useEffect(() => {
    const today = new Date()
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
    setCurrentDate(today.toLocaleDateString('en-US', options).toUpperCase())
  }, [])

  // Fetch floors for current org
  useEffect(() => {
    if (!orgId) return
    async function loadFloors() {
      try {
        const floorsData = await getFloors(orgId)
        setFloors(floorsData)
        if (floorsData.length > 0) {
          setSelectedFloor(floorsData[0])
        }
      } catch (error) {
        console.error('Error loading floors:', error)
      }
    }
    loadFloors()
  }, [orgId])

  // Fetch tables when floor changes
  useEffect(() => {
    if (!orgId || !selectedFloor) return
    const floor = selectedFloor
    const oid = orgId
    async function loadTables() {
      setLoading(true)
      try {
        const tablesData = await getTablesByFloor(floor.id, oid)
        setTables(tablesData)
      } catch (error) {
        console.error('Error loading tables:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTables()
  }, [orgId, selectedFloor])

  // Fetch available tables count (for Dine-in link)
  useEffect(() => {
    if (!orgId) return
    getAllTables(orgId).then(data => {
      const count = data.filter(t => t.status === 'available').length
      setAvailableTablesCount(count)
    })
  }, [orgId])

  // Fetch order/food status per table (KOT vs At table) + pending bill per table
  useEffect(() => {
    if (tables.length === 0) {
      setTableFoodStatus({})
      setTablePendingBills({})
      return
    }
    const tableIds = tables.map(t => t.id)
    async function fetchFoodStatusAndBills() {
      if (!orgId) return
      try {
        const { data } = await supabase
          .from('orders')
          .select('table_id, status, total')
          .eq('organization_id', orgId)
          .in('table_id', tableIds)
          .in('status', ['pending', 'preparing', 'ready', 'served'])
        const statusMap: Record<string, 'kot' | 'table'> = {}
        const billsMap: Record<string, number> = {}
        ;(data || []).forEach((row: { table_id: string | null; status: string; total?: number }) => {
          if (!row.table_id) return
          if (row.status === 'preparing' || row.status === 'pending') statusMap[row.table_id] = 'kot'
          if (row.status === 'ready' || row.status === 'served') statusMap[row.table_id] = 'table'
          if (row.status === 'ready' || row.status === 'served') {
            billsMap[row.table_id] = (billsMap[row.table_id] || 0) + (row.total ?? 0)
          }
        })
        setTableFoodStatus(statusMap)
        setTablePendingBills(billsMap)
      } catch {
        setTableFoodStatus({})
        setTablePendingBills({})
      }
    }
    fetchFoodStatusAndBills()
  }, [orgId, tables])

  // Fetch analytics
  useEffect(() => {
    if (!orgId) return
    const oid = orgId
    async function loadAnalytics() {
      try {
        const [today, weekly] = await Promise.all([
          getTodayStats(oid),
          getWeeklyStats(oid)
        ])
        setTodayStats(today)
        setWeeklyRevenue(weekly.totalRevenue)
      } catch (error) {
        console.error('Error loading analytics:', error)
      }
    }
    loadAnalytics()
    const interval = setInterval(loadAnalytics, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [orgId])

  // Handle table click
  const handleTableClick = (table: Table) => {
    setSelectedTable(table)
    setIsModalOpen(true)
  }

  // Handle status change
  const handleStatusChange = async (tableId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tables')
        .update({ status: newStatus })
        .eq('id', tableId)

      if (error) throw error

      setTables(prevTables =>
        prevTables.map(table =>
          table.id === tableId
            ? { ...table, status: newStatus as any }
            : table
        )
      )
    } catch (error) {
      console.error('Error updating table status:', error)
      alert('Failed to update table status')
    }
  }

  // Open Merge Table modal: load all tables
  const openMergeModal = async () => {
    if (!orgId) return
    setShowMergeModal(true)
    setMergeSelectedIds(new Set())
    setMergePrimaryId('')
    try {
      const tables = await getAllTables(orgId)
      setAllTables(tables)
    } catch (e) {
      console.error(e)
      alert('Failed to load tables')
    }
  }

  const toggleMergeTable = (tableId: string) => {
    setMergeSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(tableId)) next.delete(tableId)
      else next.add(tableId)
      return next
    })
  }

  const handleMergeTables = async () => {
    const selected = Array.from(mergeSelectedIds)
    if (selected.length < 2) {
      alert('Select at least 2 tables to merge.')
      return
    }
    if (!mergePrimaryId || !selected.includes(mergePrimaryId)) {
      alert('Choose which table is the primary (table to keep).')
      return
    }
    setMergeLoading(true)
    try {
      const otherIds = selected.filter(id => id !== mergePrimaryId)
      const { data: ordersToMove } = await supabase
        .from('orders')
        .select('id')
        .eq('organization_id', orgId)
        .in('table_id', otherIds)
        .in('status', ['pending', 'preparing', 'ready', 'served'])
      if (ordersToMove && ordersToMove.length > 0) {
        await supabase
          .from('orders')
          .update({ table_id: mergePrimaryId, updated_at: new Date().toISOString() })
          .eq('organization_id', orgId)
          .in('id', ordersToMove.map(o => o.id))
      }
      for (const id of otherIds) {
        await supabase.from('tables').update({ status: 'available' }).eq('id', id)
      }
      setShowMergeModal(false)
      if (selectedFloor && orgId) {
        const tablesData = await getTablesByFloor(selectedFloor.id, orgId)
        setTables(tablesData)
      }
      alert('Tables merged successfully. All orders are now on the primary table.')
    } catch (e) {
      console.error(e)
      alert('Failed to merge tables')
    } finally {
      setMergeLoading(false)
    }
  }

  // Open Change Table modal: load active dine-in orders and available tables
  const openChangeModal = async () => {
    if (!orgId) return
    setShowChangeModal(true)
    setChangeOrderId('')
    setChangeNewTableId('')
    try {
      const [ordersRes, tablesRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('organization_id', orgId)
          .eq('order_type', 'dine-in')
          .not('table_id', 'is', null)
          .in('status', ['pending', 'preparing', 'ready', 'served'])
          .order('created_at', { ascending: false }),
        getAllTables(orgId)
      ])
      const tablesList = tablesRes || []
      setActiveDineInOrders((ordersRes.data as Order[]) || [])
      setAvailableTables(tablesList.filter(t => t.status === 'available'))
      setAllTables(tablesList)
    } catch (e) {
      console.error(e)
      alert('Failed to load data')
    }
  }

  const handleChangeTable = async () => {
    if (!changeOrderId || !changeNewTableId) {
      alert('Select an order and a new table.')
      return
    }
    const order = activeDineInOrders.find(o => o.id === changeOrderId)
    if (!order || !order.table_id) return
    const oldTableId = order.table_id
    if (oldTableId === changeNewTableId) {
      alert('New table must be different from current table.')
      return
    }
    setChangeLoading(true)
    try {
      await supabase
        .from('orders')
        .update({ table_id: changeNewTableId, updated_at: new Date().toISOString() })
        .eq('id', changeOrderId)
      await supabase.from('tables').update({ status: 'available' }).eq('id', oldTableId)
      await supabase.from('tables').update({ status: 'occupied' }).eq('id', changeNewTableId)
      setShowChangeModal(false)
      if (selectedFloor && orgId) {
        const tablesData = await getTablesByFloor(selectedFloor.id, orgId)
        setTables(tablesData)
      }
      alert('Order moved to new table successfully.')
    } catch (e) {
      console.error(e)
      alert('Failed to change table')
    } finally {
      setChangeLoading(false)
    }
  }

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'billing':
        return {
          bg: 'bg-sky-50/80',
          border: 'border-sky-200',
          text: 'text-sky-700',
          badge: 'bg-sky-500/90'
        }
      case 'reserved':
        return {
          bg: 'bg-amber-50/80',
          border: 'border-amber-200',
          text: 'text-amber-700',
          badge: 'bg-amber-500/90'
        }
      case 'occupied':
        return {
          bg: 'bg-rose-50/80',
          border: 'border-rose-200',
          text: 'text-rose-700',
          badge: 'bg-rose-500/90'
        }
      case 'available':
        return {
          bg: 'bg-emerald-50/80',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          badge: 'bg-emerald-500/90'
        }
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          text: 'text-slate-700',
          badge: 'bg-slate-500/90'
        }
    }
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header - compact on mobile */}
        <header className="bg-white border-b border-slate-100 px-4 sm:px-5 md:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden flex-shrink-0 p-2 rounded-lg hover:bg-slate-50 text-slate-600"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-slate-800 truncate">{organization?.display_name || organization?.name || restaurantName || 'Restaurant'}</h1>
              <p className="text-xs text-slate-400 hidden sm:block">{currentDate}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs sm:text-sm font-medium text-slate-600 whitespace-nowrap">
              ৳{todayStats.totalRevenue.toFixed(0)} · {todayStats.totalOrders} orders
            </div>
          </div>
        </header>

        {/* Main Content - row by row, responsive: mobile → tablet → PC */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 lg:p-8 bg-white">
          <div className="w-full space-y-8 md:space-y-10">
            {/* Row 1: Today stats */}
            <section>
              <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3 sm:mb-4">Today</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-100 shadow-sm">
                  <div className="text-xs text-slate-500 font-black uppercase">Daily Sale</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 font-brand mt-0.5">৳{todayStats.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-100 shadow-sm">
                  <div className="text-xs text-slate-500 font-black uppercase">Orders</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 font-brand mt-0.5">{todayStats.totalOrders}</div>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-100 shadow-sm">
                  <div className="text-xs text-slate-500 font-black uppercase">Weekly</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 font-brand mt-0.5">৳{weeklyRevenue.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-100 shadow-sm">
                  <div className="text-xs text-slate-500 font-black uppercase">Avg Order</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 font-brand mt-0.5">৳{todayStats.totalOrders > 0 ? (todayStats.totalRevenue / todayStats.totalOrders).toFixed(0) : '0'}</div>
                </div>
              </div>
            </section>

            {/* Row 2: Order type */}
            <section>
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3 sm:mb-4">Order type</h3>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link href="/pos?type=dine-in" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer">
              <svg className="w-5 h-5 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <span>🍽️ Dine-in</span>
              <span className="text-xs text-slate-500 font-normal">({availableTablesCount} available)</span>
            </Link>
            <Link href="/pos?type=takeaway" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer">
              <svg className="w-5 h-5 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              Takeaway
            </Link>
            <Link href="/pos?type=online" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer">
              <svg className="w-5 h-5 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              Online
            </Link>
            <Link href="/pos?type=event" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer">
              <svg className="w-5 h-5 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              Event
            </Link>
            <Link href="/reservations" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer">
              <svg className="w-5 h-5 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Reservation
            </Link>

            <Link
              href="/kitchen"
              className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 text-emerald-300 text-xs font-semibold shadow-sm hover:bg-slate-800"
            >
              🍳 KOT
            </Link>
          </div>
            </section>

            {/* Row 3: Quick Actions */}
            <section>
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3 sm:mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <Link href="/billing" className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-sm transition-all min-h-[88px] sm:min-h-[96px]">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <span className="text-xs sm:text-sm font-bold text-center leading-tight">Billing Hub</span>
                </Link>
                <Link href="/orders" className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-all min-h-[88px] sm:min-h-[96px]">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <span className="text-xs sm:text-sm font-bold text-center leading-tight">Sales History</span>
                </Link>
                <Link href="/kitchen" className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition-all min-h-[88px] sm:min-h-[96px]">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <span className="text-xs sm:text-sm font-bold text-center leading-tight">KOT Screen</span>
                </Link>
                <button type="button" onClick={() => alert('Merge Token coming soon!')} className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white shadow-sm transition-all min-h-[88px] sm:min-h-[96px]">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  <span className="text-xs sm:text-sm font-bold text-center leading-tight">Merge Token</span>
                </button>
                <button type="button" onClick={openMergeModal} className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-all min-h-[88px] sm:min-h-[96px]">
                  <span className="text-2xl">🔀</span>
                  <span className="text-xs sm:text-sm font-bold text-center leading-tight">Merge Table</span>
                </button>
                <button type="button" onClick={openChangeModal} className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all min-h-[88px] sm:min-h-[96px]">
                  <span className="text-2xl">↔️</span>
                  <span className="text-xs sm:text-sm font-bold text-center leading-tight">Change Table</span>
                </button>
                <Link href="/stock" className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-all min-h-[88px] sm:min-h-[96px]">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  <span className="text-xs sm:text-sm font-bold text-center leading-tight">Stock</span>
                </Link>
                <Link href="/menu" className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-all min-h-[88px] sm:min-h-[96px]">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  <span className="text-xs sm:text-sm font-bold text-center leading-tight">Menu</span>
                </Link>
              </div>
            </section>

            {/* Row 4: Tables */}
            <section>
              <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3 sm:mb-4">Tables</h2>
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
                {floors.map((floor) => (
                  <button
                    key={floor.id}
                    onClick={() => setSelectedFloor(floor)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                      selectedFloor?.id === floor.id ? 'bg-slate-200 text-slate-800 shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    {floor.name}
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-48 sm:h-56 rounded-xl bg-white border border-slate-100">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                  {tables.map((table) => {
                    const foodStatus = tableFoodStatus[table.id]
                    const pendingBill = tablePendingBills[table.id] ?? 0
                    return (
                      <div
                        key={table.id}
                        onClick={() => handleTableClick(table)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTableClick(table); } }}
                        className={`bg-white rounded-xl p-4 lg:p-6 border-2 min-h-[160px] lg:min-h-[200px] hover:shadow-xl transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                          table.status === 'available' ? 'border-emerald-200 hover:border-emerald-400' :
                          table.status === 'occupied' ? 'border-red-200 hover:border-red-400' :
                          table.status === 'reserved' ? 'border-yellow-200 hover:border-yellow-400' :
                          table.status === 'billing' ? 'border-blue-200 hover:border-blue-400' :
                          'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <div className="text-3xl lg:text-4xl font-black text-slate-900 mb-3">
                          {table.table_number}
                        </div>
                        <div className="text-xs lg:text-sm text-slate-500 mb-3 font-semibold uppercase">
                          Table
                        </div>
                        <div className="text-base lg:text-lg text-slate-600 font-bold mb-2">
                          👥 {table.seats} seats
                        </div>
                        {table.floor && (
                          <div className="text-xs text-slate-500 mb-3">
                            📍 {table.floor.name}
                          </div>
                        )}
                        {foodStatus && (
                          <span className={`mb-2 px-2 py-1 rounded text-xs font-bold uppercase ${foodStatus === 'kot' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
                            {foodStatus === 'kot' ? 'KOT' : 'At Table'}
                          </span>
                        )}
                        <div className={`px-3 py-2 rounded-lg text-sm lg:text-base font-bold ${
                          table.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                          table.status === 'occupied' ? 'bg-red-100 text-red-700' :
                          table.status === 'reserved' ? 'bg-yellow-100 text-yellow-700' :
                          table.status === 'billing' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {table.status === 'available' && '🟢 Available'}
                          {table.status === 'occupied' && '🔴 Occupied'}
                          {table.status === 'reserved' && '🟡 Reserved'}
                          {table.status === 'billing' && '🔵 Billing'}
                        </div>
                        {pendingBill > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 w-full">
                            <div className="text-xs text-slate-500">Pending</div>
                            <div className="text-lg font-bold text-emerald-700">৳{pendingBill.toFixed(0)}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Row 5: Top selling (if any) */}
          {todayStats.popularItems.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Top selling today</h2>
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-3 lg:px-4 py-2.5 text-left text-xs font-medium text-slate-500">#</th>
                        <th className="px-3 lg:px-4 py-2.5 text-left text-xs font-medium text-slate-500">Item</th>
                        <th className="px-3 lg:px-4 py-2.5 text-right text-xs font-medium text-slate-500">Qty</th>
                        <th className="px-3 lg:px-4 py-2.5 text-right text-xs font-medium text-slate-500">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayStats.popularItems.slice(0, 5).map((item, index) => (
                        <tr key={index} className="border-t border-slate-100">
                          <td className="px-3 lg:px-4 py-2.5 text-slate-400 text-sm">{index + 1}</td>
                          <td className="px-3 lg:px-4 py-2.5">
                            <div className="font-medium text-slate-800 text-sm">{item.name}</div>
                            {item.name_bangla && (
                              <div className="text-xs text-slate-400">{item.name_bangla}</div>
                            )}
                          </td>
                          <td className="px-3 lg:px-4 py-2.5 text-right font-medium text-slate-700 text-sm">×{item.quantity}</td>
                          <td className="px-3 lg:px-4 py-2.5 text-right font-medium text-slate-700 text-sm">৳{item.revenue.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Table Modal */}
        <TableModal
          table={selectedTable}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onStatusChange={handleStatusChange}
        />

        {/* Merge Table Modal */}
        {showMergeModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowMergeModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">🔀 Merge Table</h2>
                <button type="button" onClick={() => setShowMergeModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-4">
                <p className="text-sm text-slate-600">Select 2+ tables, then choose the primary table (orders will move there).</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tables</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allTables.map(t => (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mergeSelectedIds.has(t.id)}
                          onChange={() => toggleMergeTable(t.id)}
                          className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="font-medium text-slate-800">Table {t.table_number}</span>
                        <span className="text-xs text-slate-500">({t.seats} seats · {t.status})</span>
                      </label>
                    ))}
                  </div>
                </div>
                {mergeSelectedIds.size >= 2 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Primary table (keep this one)</label>
                    <select
                      value={mergePrimaryId}
                      onChange={e => setMergePrimaryId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                    >
                      <option value="">Select primary table</option>
                      {Array.from(mergeSelectedIds).map(id => {
                        const t = allTables.find(x => x.id === id)
                        return t ? <option key={t.id} value={t.id}>Table {t.table_number}</option> : null
                      })}
                    </select>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-200 flex gap-3">
                <button type="button" onClick={() => setShowMergeModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">
                  Cancel
                </button>
                <button type="button" onClick={handleMergeTables} disabled={mergeLoading || mergeSelectedIds.size < 2 || !mergePrimaryId} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  {mergeLoading ? 'Merging...' : 'Merge'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Table Modal */}
        {showChangeModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowChangeModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">↔️ Change Table</h2>
                <button type="button" onClick={() => setShowChangeModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Order</label>
                  <select
                    value={changeOrderId}
                    onChange={e => setChangeOrderId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                  >
                    <option value="">Select order</option>
                    {activeDineInOrders.map(o => {
                      const tbl = allTables.find(t => t.id === o.table_id) || { table_number: '?' }
                      return (
                        <option key={o.id} value={o.id}>
                          {o.order_number} (Table {tbl.table_number})
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">New table</label>
                  <select
                    value={changeNewTableId}
                    onChange={e => setChangeNewTableId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                  >
                    <option value="">Select new table</option>
                    {availableTables.map(t => (
                      <option key={t.id} value={t.id}>Table {t.table_number} ({t.seats} seats)</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 flex gap-3">
                <button type="button" onClick={() => setShowChangeModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">
                  Cancel
                </button>
                <button type="button" onClick={handleChangeTable} disabled={changeLoading || !changeOrderId || !changeNewTableId} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  {changeLoading ? 'Changing...' : 'Change'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
