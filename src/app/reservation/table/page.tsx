'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { getFloors, getTablesByFloor, Floor, Table } from '@/app/lib/api/tables'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function ReservationTablePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [floors, setFloors] = useState<Floor[]>([])
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFloors().then(data => {
      setFloors(data)
      if (data.length > 0) setSelectedFloor(data[0])
    })
  }, [])

  useEffect(() => {
    if (!selectedFloor) return
    setLoading(true)
    getTablesByFloor(selectedFloor.id).then(data => {
      setTables(data)
      setLoading(false)
    })
  }, [selectedFloor])

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-50 text-slate-600"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
              ← Dashboard
            </Link>
            <span className="text-slate-300">|</span>
            <h1 className="text-lg font-semibold text-slate-800">Table Reservation</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-2xl">
            <p className="text-slate-600 mb-6">
              Select a table to reserve. Full reservation flow (date, time, guest count) can be added here later.
            </p>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {floors.map(floor => (
                <button
                  key={floor.id}
                  onClick={() => setSelectedFloor(floor)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    selectedFloor?.id === floor.id
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {floor.name}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-48 rounded-xl bg-slate-50 border border-slate-100">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {tables.map(table => (
                  <button
                    key={table.id}
                    type="button"
                    className="bg-white border-2 border-slate-200 rounded-xl p-4 text-center hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
                  >
                    <span className="text-2xl font-black text-slate-900">{table.table_number}</span>
                    <div className="text-xs text-slate-500 mt-1">{table.seats} seats</div>
                    <div className="text-xs font-semibold text-slate-400 mt-1 uppercase">{table.status}</div>
                  </button>
                ))}
              </div>
            )}

            {!loading && tables.length === 0 && (
              <div className="text-center py-12 text-slate-500">No tables in this floor.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
