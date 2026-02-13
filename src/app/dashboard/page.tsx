'use client'

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import type { Floor, Table } from '@/app/lib/api/tables';
import { getFloors, getTablesByFloor } from '@/app/lib/api/tables';

import TableModal from '@/components/TableModal'
import { supabase } from '@/app/lib/api/tables'

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [floors, setFloors] = useState<Floor[]>([])
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  // Fetch floors on mount
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


// Handle table click
  const handleTableClick = (table: Table) => {
    setSelectedTable(table)
    setIsModalOpen(true)
  }

  // Handle status change
  const handleStatusChange = async (tableId: string, newStatus: string) => {
    try {
      // Update in database
      const { error } = await supabase
        .from('tables')
        .update({ status: newStatus })
        .eq('id', tableId)

      if (error) throw error

      // Update in local state
      setTables(prevTables => 
        prevTables.map(table => 
          table.id === tableId 
            ? { ...table, status: newStatus as any }
            : table
        )
      )

      console.log('Status updated successfully!')
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update table status')
    }
  }
  // Get status color classes
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Hamburger Menu */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div>
                <h1 className="text-xl lg:text-2xl font-brand font-black">
                  <span className="text-slate-900">Next</span>
                  <span className="text-emerald-500">Table</span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  RESTAURANT CONTROL HUB
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-base lg:text-xl font-brand font-black text-slate-900">
                TODAY TOTAL: ৳0
              </div>
              <div className="text-xs text-slate-600 font-medium">
                {currentDate}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          
          {/* Today Snapshot */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wide">
              TODAY SNAPSHOT
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              
              <div className="bg-white rounded-2xl p-4 border border-slate-200">
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Daily Sale
                </div>
                <div className="text-xl lg:text-2xl font-brand font-black text-emerald-600">
                  ৳12,450
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200">
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Stock Value
                </div>
                <div className="text-xl lg:text-2xl font-brand font-black text-blue-600">
                  ৳3,000
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200">
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Daily Expense
                </div>
                <div className="text-xl lg:text-2xl font-brand font-black text-orange-600">
                  ৳0
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200">
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Expected Cash
                </div>
                <div className="text-xl lg:text-2xl font-brand font-black text-purple-600">
                  ৳0
                </div>
              </div>
            </div>
          </div>

          {/* Service & Booking */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wide">
              SERVICE & BOOKING
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              
              <div className="bg-white rounded-2xl p-4 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-semibold mb-1">SERVICE</div>
                    <div className="text-base lg:text-lg font-bold text-slate-900">Dine In</div>
                  </div>
                  <div className="text-3xl lg:text-4xl">🍽️</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-semibold mb-1">RETAIL</div>
                    <div className="text-base lg:text-lg font-bold text-slate-900">Takeaway</div>
                  </div>
                  <div className="text-3xl lg:text-4xl">🛍️</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-semibold mb-1">PLATFORM</div>
                    <div className="text-base lg:text-lg font-bold text-slate-900">Online</div>
                  </div>
                  <div className="text-3xl lg:text-4xl">🌐</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-semibold mb-1">BOOKING</div>
                    <div className="text-base lg:text-lg font-bold text-slate-900">Event Hub</div>
                  </div>
                  <div className="text-3xl lg:text-4xl">🎉</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-semibold mb-1">SEATING</div>
                    <div className="text-base lg:text-lg font-bold text-slate-900">Reservation</div>
                  </div>
                  <div className="text-3xl lg:text-4xl">📅</div>
                </div>
              </div>
            </div>
          </div>

          {/* Floor Tabs */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => setSelectedFloor(floor)}
                className={`px-4 lg:px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                  selectedFloor?.id === floor.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {floor.name.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Tables Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-slate-500">Loading tables...</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-24">
              {tables.map((table) => {
                const colors = getStatusColors(table.status)
                return (
                  <div
                    key={table.id}
                    onClick={() => handleTableClick(table)}
                    className={`${colors.bg} border-2 ${colors.border} rounded-2xl p-4 lg:p-6 cursor-pointer hover:shadow-xl transition-all active:scale-95`}
                  >
                    <div className="text-center">
                      <div className={`text-xs font-semibold ${colors.text} mb-2`}>TABLE</div>
                      <div className={`text-4xl lg:text-5xl font-brand font-black ${colors.text} mb-3`}>
                        {table.table_number}
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-3 lg:px-4 py-1.5 rounded-full ${colors.badge} text-white text-xs font-bold mb-3`}>
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        {table.status.toUpperCase()}
                      </div>
                      <div className={`text-sm ${colors.text} font-medium`}>👥 {table.seats} Seats</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-slate-900 border-t border-slate-800 p-3 lg:p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
            <button className="py-3 lg:py-3.5 rounded-xl lg:rounded-2xl bg-cyan-500 text-white font-bold text-xs lg:text-sm hover:bg-cyan-600 transition-colors active:scale-95">
              💳 BILLING HUB
            </button>
            <button className="py-3 lg:py-3.5 rounded-xl lg:rounded-2xl bg-slate-800 text-white font-bold text-xs lg:text-sm hover:bg-slate-700 transition-colors active:scale-95">
              👨‍🍳 KOT SCREEN
            </button>
            <button className="py-3 lg:py-3.5 rounded-xl lg:rounded-2xl bg-purple-600 text-white font-bold text-xs lg:text-sm hover:bg-purple-700 transition-colors active:scale-95">
              🔀 MERGE TOKEN
            </button>
            <button className="py-3 lg:py-3.5 rounded-xl lg:rounded-2xl bg-white text-slate-900 font-bold text-xs lg:text-sm hover:bg-slate-100 transition-colors active:scale-95">
              📦 STOCK
            </button>
          </div>
        </div>
      </div>

      <TableModal
        table={selectedTable}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}