'use client'

import { useState, useEffect } from 'react'
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
        {/* Header - clean & minimal */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 px-4 lg:px-8 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg lg:text-xl font-semibold text-slate-900 tracking-tight">
                NextTable
              </h1>
              <p className="text-xs text-slate-400 font-medium">Restaurant control hub</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs lg:text-sm font-semibold text-slate-900">
              TODAY: ৳{todayStats.totalRevenue.toFixed(0)} • {todayStats.totalOrders} Orders
            </div>
            <div className="text-xs text-slate-400">{currentDate}</div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50/50">
          {/* Today Snapshot - modern cards */}
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Today</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-xs font-medium text-slate-400 mb-1">Daily sale</p>
                <p className="text-2xl lg:text-3xl font-semibold text-slate-900 tracking-tight">
                  ৳{todayStats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-xs font-medium text-slate-400 mb-1">Orders</p>
                <p className="text-2xl lg:text-3xl font-semibold text-slate-900 tracking-tight">
                  {todayStats.totalOrders}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-xs font-medium text-slate-400 mb-1">Weekly revenue</p>
                <p className="text-2xl lg:text-3xl font-semibold text-slate-900 tracking-tight">
                  ৳{weeklyRevenue.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-xs font-medium text-slate-400 mb-1">Avg order</p>
                <p className="text-2xl lg:text-3xl font-semibold text-slate-900 tracking-tight">
                  ৳{todayStats.totalOrders > 0 ? (todayStats.totalRevenue / todayStats.totalOrders).toFixed(0) : '0'}
                </p>
              </div>
            </div>
          </section>

          {/* Top Selling - clean table */}
          {todayStats.popularItems.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Top selling today</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">#</th>
                        <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Item</th>
                        <th className="px-5 py-3.5 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Qty</th>
                        <th className="px-5 py-3.5 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {todayStats.popularItems.slice(0, 5).map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-medium text-slate-400">{index + 1}</td>
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-slate-900">{item.name}</div>
                            {item.name_bangla && (
                              <div className="text-xs text-slate-400 mt-0.5">{item.name_bangla}</div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-medium text-slate-700">×{item.quantity}</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">৳{item.revenue.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Tables Section */}
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Tables</h2>
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {floors.map((floor) => (
                <button
                  key={floor.id}
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
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
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-24">
                {tables.map((table) => {
                  const colors = getStatusColors(table.status)
                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => handleTableClick(table)}
                      className={`${colors.bg} border ${colors.border} rounded-2xl p-4 lg:p-5 text-center hover:shadow-lg transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2`}
                    >
                      <div className="text-xs font-medium text-slate-500 mb-1">Table</div>
                      <div className={`text-3xl lg:text-4xl font-semibold ${colors.text} mb-2`}>
                        {table.table_number}
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${colors.badge} text-white text-xs font-medium`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                        {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-2 text-slate-500 text-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        <span>{table.seats} seats</span>
                      </div>
                    </button>
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
