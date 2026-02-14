'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { getFloors, getTablesByFloor, Floor, Table } from '@/app/lib/api/tables'
import { getTodayStats, getWeeklyStats } from '@/app/lib/api/orders'
import TableModal from '@/components/TableModal'
import LoadingSpinner from '@/components/LoadingSpinner'
import { supabase } from '@/app/lib/api/tables'

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

  // Fetch floors
  useEffect(() => {
    async function loadFloors() {
      try {
        const floorsData = await getFloors()
        setFloors(floorsData)
        if (floorsData.length > 0) {
          setSelectedFloor(floorsData[0])
        }
      } catch (error) {
        console.error('Error loading floors:', error)
      }
    }
    loadFloors()
  }, [])

  // Fetch tables when floor changes
  useEffect(() => {
    async function loadTables() {
      if (!selectedFloor) return
      setLoading(true)
      try {
        const tablesData = await getTablesByFloor(selectedFloor.id)
        setTables(tablesData)
      } catch (error) {
        console.error('Error loading tables:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTables()
  }, [selectedFloor])

  // Fetch analytics
  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [today, weekly] = await Promise.all([
          getTodayStats(),
          getWeeklyStats()
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
  }, [])

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
    <div className="flex h-screen bg-slate-50/50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
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
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-slate-800 truncate">NextTable</h1>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 lg:p-8 bg-slate-50/30">
          <div className="max-w-7xl mx-auto space-y-8 md:space-y-10">
            {/* Row 1: Today stats */}
            <section>
              <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3 sm:mb-4">Today</h2>
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
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3 sm:mb-4">Order type</h3>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Link href="/pos" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors">
                  <span>🍽️</span> Dine-in
                </Link>
                <Link href="/pos" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors">
                  <span>🥡</span> Takeaway
                </Link>
                <Link href="/pos" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors">
                  <span>📱</span> Online
                </Link>
                <Link href="/pos" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors">
                  <span>🎉</span> Event
                </Link>
                <Link href="/reservation/table" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors">
                  <span>📅</span> Reservation
                </Link>
              </div>
            </section>

            {/* Row 3: Quick Actions */}
            <section>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3 sm:mb-4">Quick Actions</h3>
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
              <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3 sm:mb-4">Tables</h2>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {tables.map((table) => {
                    const colors = getStatusColors(table.status)
                    return (
                      <div
                        key={table.id}
                        onClick={() => handleTableClick(table)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTableClick(table); } }}
                        className={`${colors.bg} border ${colors.border} rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] min-h-[100px] sm:min-h-[110px]`}
                      >
                        <div className="text-[10px] text-slate-500 font-semibold mb-0.5">TABLE</div>
                        <div className={`text-xl sm:text-2xl font-black ${colors.text} font-brand mb-1`}>{table.table_number}</div>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${colors.badge} text-white`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                          <span className="font-bold text-[10px] uppercase">{table.status}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{table.seats} Seats</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Row 5: Top selling (if any) */}
          {todayStats.popularItems.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">Top selling today</h2>
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
      </div>
    </div>
  )
}
