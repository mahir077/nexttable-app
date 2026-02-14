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
          bg: 'bg-blue-50',
          border: 'border-blue-500',
          text: 'text-blue-600',
          badge: 'bg-blue-500'
        }
      case 'reserved':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-500',
          text: 'text-orange-600',
          badge: 'bg-orange-500'
        }
      case 'occupied':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-500',
          text: 'text-rose-600',
          badge: 'bg-rose-500'
        }
      case 'available':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-500',
          text: 'text-emerald-600',
          badge: 'bg-emerald-500'
        }
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-500',
          text: 'text-slate-600',
          badge: 'bg-slate-500'
        }
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - compact on mobile */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg lg:text-2xl font-brand font-black text-slate-900">
                NextTable
              </h1>
              <p className="text-xs lg:text-sm text-slate-500 font-semibold hidden sm:block">RESTAURANT CONTROL HUB</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs lg:text-sm font-semibold text-slate-900">
              TODAY: ৳{todayStats.totalRevenue.toFixed(0)} • {todayStats.totalOrders} Orders
            </div>
            <div className="text-xs text-slate-500 hidden sm:block">{currentDate}</div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50/50">
          {/* Today Snapshot - modern cards */}
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Today</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-emerald-50 rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border-2 border-emerald-200 min-w-0">
                <div className="text-[10px] sm:text-xs text-emerald-600 font-semibold mb-1">Daily Sale</div>
                <div className="text-lg sm:text-xl lg:text-3xl font-brand font-black text-emerald-700 leading-tight break-words">
                  ৳{todayStats.totalRevenue.toLocaleString()}
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border-2 border-blue-200 min-w-0">
                <div className="text-[10px] sm:text-xs text-blue-600 font-semibold mb-1">Orders</div>
                <div className="text-lg sm:text-xl lg:text-3xl font-brand font-black text-blue-700 leading-tight break-words">
                  {todayStats.totalOrders}
                </div>
              </div>
              <div className="bg-purple-50 rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border-2 border-purple-200 min-w-0">
                <div className="text-[10px] sm:text-xs text-purple-600 font-semibold mb-1">Weekly Revenue</div>
                <div className="text-lg sm:text-xl lg:text-3xl font-brand font-black text-purple-700 leading-tight break-words">
                  ৳{weeklyRevenue.toLocaleString()}
                </div>
              </div>
              <div className="bg-orange-50 rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border-2 border-orange-200 min-w-0">
                <div className="text-[10px] sm:text-xs text-orange-600 font-semibold mb-1">Avg Order</div>
                <div className="text-lg sm:text-xl lg:text-3xl font-brand font-black text-orange-700 leading-tight break-words">
                  ৳{todayStats.totalOrders > 0 ? (todayStats.totalRevenue / todayStats.totalOrders).toFixed(0) : '0'}
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wide">Quick Actions</h3>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2">
              <Link
                href="/billing"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-blue-700 text-center leading-tight">Billing Hub</span>
              </Link>

              <Link
                href="/kitchen"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-orange-50 border-2 border-orange-200 hover:bg-orange-100 hover:border-orange-300 transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-orange-700 text-center leading-tight">KOT</span>
              </Link>

              <button
                type="button"
                onClick={() => alert('Merge Token feature coming in Week 3!')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-purple-50 border-2 border-purple-200 hover:bg-purple-100 hover:border-purple-300 transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-purple-700 text-center leading-tight">Merge Token</span>
              </button>

              <button
                type="button"
                onClick={() => alert('Merge Table feature coming in Week 4!')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-pink-50 border-2 border-pink-200 hover:bg-pink-100 hover:border-pink-300 transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-pink-700 text-center leading-tight">Merge Table</span>
              </button>

              <Link
                href="/orders"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-emerald-700 text-center leading-tight">Daily Sales</span>
              </Link>

              <Link
                href="/menu"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-amber-50 border-2 border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-amber-700 text-center leading-tight">Stock</span>
              </Link>
            </div>
          </div>

          {todayStats.popularItems.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-brand font-black text-slate-900 mb-4">TOP SELLING TODAY</h2>
              <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 lg:px-4 py-3 text-left text-xs font-bold text-slate-600">#</th>
                        <th className="px-3 lg:px-4 py-3 text-left text-xs font-bold text-slate-600">ITEM</th>
                        <th className="px-3 lg:px-4 py-3 text-right text-xs font-bold text-slate-600">QTY</th>
                        <th className="px-3 lg:px-4 py-3 text-right text-xs font-bold text-slate-600">REVENUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayStats.popularItems.slice(0, 5).map((item, index) => (
                        <tr key={index} className="border-t border-slate-200">
                          <td className="px-3 lg:px-4 py-3 text-emerald-600 font-bold">{index + 1}</td>
                          <td className="px-3 lg:px-4 py-3">
                            <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                            {item.name_bangla && (
                              <div className="text-xs text-slate-500">{item.name_bangla}</div>
                            )}
                          </td>
                          <td className="px-3 lg:px-4 py-3 text-right font-bold text-slate-900">×{item.quantity}</td>
                          <td className="px-3 lg:px-4 py-3 text-right font-bold text-emerald-600">৳{item.revenue.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tables Section */}
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Tables</h2>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
              {floors.map((floor) => (
                <button
                  key={floor.id}
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap min-w-[120px] transition-all ${
                    selectedFloor?.id === floor.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100'
                  }`}
                >
                  {floor.name}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64 rounded-2xl bg-white border border-slate-100">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 mb-24">
                {tables.map((table) => {
                  const colors = getStatusColors(table.status)
                  return (
                    <div
                      key={table.id}
                      onClick={() => handleTableClick(table)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTableClick(table); } }}
                      className={`${colors.bg} border-2 ${colors.border} rounded-xl lg:rounded-2xl p-3 lg:p-5 cursor-pointer hover:shadow-xl transition-all active:scale-95 min-h-[120px] sm:min-h-[140px] lg:min-h-[160px]`}
                    >
                      <div className="text-center">
                        <div className="text-[10px] sm:text-xs text-slate-500 font-semibold mb-1">TABLE</div>
                        <div className={`text-3xl sm:text-4xl lg:text-5xl font-brand font-black ${colors.text} mb-2`}>
                          {table.table_number}
                        </div>
                        <div className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${colors.badge} text-white mb-2`}>
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white"></span>
                          <span className="font-bold text-[10px] sm:text-xs uppercase">{table.status}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1 text-slate-600">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                          </svg>
                          <span className="text-[11px] sm:text-sm font-semibold">{table.seats}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
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
