'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { getFloors, getTablesByFloor, Floor, Table } from '@/app/lib/api/tables'
import { getTodayStats, getWeeklyStats } from '@/app/lib/api/orders'
import TableModal from '@/components/TableModal'
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
      console.error('Error updating status:', error)
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
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl lg:text-2xl font-brand font-black text-slate-900">
                NextTable
              </h1>
              <p className="text-xs lg:text-sm text-slate-500 font-semibold">RESTAURANT CONTROL HUB</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs lg:text-sm font-semibold text-slate-900">TODAY TOTAL: ৳{todayStats.totalRevenue.toFixed(0)}</div>
            <div className="text-xs text-slate-500">{currentDate}</div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-white">
          {/* Analytics Section */}
          <div className="mb-8">
            <h2 className="text-xl font-brand font-black text-slate-900 mb-4">TODAY SNAPSHOT</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {/* Daily Sale */}
              <div className="bg-emerald-50 rounded-2xl p-4 lg:p-6 border-2 border-emerald-200">
                <div className="text-xs text-emerald-600 font-semibold mb-1">Daily Sale</div>
                <div className="text-2xl lg:text-3xl font-brand font-black text-emerald-700">
                  ৳{todayStats.totalRevenue.toLocaleString()}
                </div>
              </div>

              {/* Orders */}
              <div className="bg-blue-50 rounded-2xl p-4 lg:p-6 border-2 border-blue-200">
                <div className="text-xs text-blue-600 font-semibold mb-1">Orders</div>
                <div className="text-2xl lg:text-3xl font-brand font-black text-blue-700">
                  {todayStats.totalOrders}
                </div>
              </div>

              {/* Weekly Revenue */}
              <div className="bg-purple-50 rounded-2xl p-4 lg:p-6 border-2 border-purple-200">
                <div className="text-xs text-purple-600 font-semibold mb-1">Weekly Revenue</div>
                <div className="text-2xl lg:text-3xl font-brand font-black text-purple-700">
                  ৳{weeklyRevenue.toLocaleString()}
                </div>
              </div>

              {/* Average Order */}
              <div className="bg-orange-50 rounded-2xl p-4 lg:p-6 border-2 border-orange-200">
                <div className="text-xs text-orange-600 font-semibold mb-1">Avg Order</div>
                <div className="text-2xl lg:text-3xl font-brand font-black text-orange-700">
                  ৳{todayStats.totalOrders > 0 ? (todayStats.totalRevenue / todayStats.totalOrders).toFixed(0) : '0'}
                </div>
              </div>
            </div>
          </div>

          {/* Popular Items */}
          {todayStats.popularItems.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-brand font-black text-slate-900 mb-4">TOP SELLING TODAY</h2>
              <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">#</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">ITEM</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">QTY</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">REVENUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayStats.popularItems.slice(0, 5).map((item, index) => (
                        <tr key={index} className="border-t border-slate-200">
                          <td className="px-4 py-3 text-emerald-600 font-bold">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                            {item.name_bangla && (
                              <div className="text-xs text-slate-500">{item.name_bangla}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">×{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">৳{item.revenue.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tables Section */}
          <div>
            <h2 className="text-xl font-brand font-black text-slate-900 mb-4">TABLES</h2>
            
            {/* Floor Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {floors.map((floor) => (
                <button
                  key={floor.id}
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
                    selectedFloor?.id === floor.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {floor.name.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Tables Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-slate-500">Loading tables...</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-24">
                {tables.map((table) => {
                  const colors = getStatusColors(table.status)
                  return (
                    <div
                      key={table.id}
                      onClick={() => handleTableClick(table)}
                      className={`${colors.bg} border-2 ${colors.border} rounded-2xl p-3 lg:p-5 cursor-pointer hover:shadow-xl transition-all active:scale-95`}
                    >
                      <div className="text-center">
                        <div className="text-xs text-slate-500 font-semibold mb-1">TABLE</div>
                        <div className={`text-4xl lg:text-5xl font-brand font-black ${colors.text} mb-3`}>
                          {table.table_number}
                        </div>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.badge} text-white mb-3`}>
                          <span className="w-2 h-2 rounded-full bg-white"></span>
                          <span className="font-bold text-xs">{table.status.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1 text-slate-600">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                          </svg>
                          <span className="text-sm font-semibold">{table.seats} Seats</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
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
