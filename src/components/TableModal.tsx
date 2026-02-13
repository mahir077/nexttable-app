'use client'

import { useState } from 'react'
import { Table } from '@/app/lib/api/tables'

type TableStatus = Table['status']

interface TableModalProps {
  table: Table | null
  isOpen: boolean
  onClose: () => void
  onStatusChange: (tableId: string, newStatus: string) => void
}

export default function TableModal({ table, isOpen, onClose, onStatusChange }: TableModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<TableStatus>(table?.status || 'available')

  if (!isOpen || !table) return null

  const statuses: { value: TableStatus; label: string; color: string }[] = [
    { value: 'available', label: 'AVAILABLE', color: 'emerald' },
    { value: 'reserved', label: 'RESERVED', color: 'orange' },
    { value: 'occupied', label: 'OCCUPIED', color: 'rose' },
    { value: 'billing', label: 'BILLING', color: 'blue' }
  ]

  const handleSave = () => {
    onStatusChange(table.id, selectedStatus)
    onClose()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'billing': return 'text-blue-600 bg-blue-50 border-blue-500'
      case 'reserved': return 'text-orange-600 bg-orange-50 border-orange-500'
      case 'occupied': return 'text-rose-600 bg-rose-50 border-rose-500'
      case 'available': return 'text-emerald-600 bg-emerald-50 border-emerald-500'
      default: return 'text-slate-600 bg-slate-50 border-slate-500'
    }
  }

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-brand font-black text-slate-900">
              Table {table.table_number}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Table Info */}
          <div className="mb-6 space-y-4">
            {/* Current Status */}
            <div>
              <p className="text-xs text-slate-500 font-semibold mb-2">CURRENT STATUS</p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 ${getStatusColor(table.status)}`}>
                <span className="w-3 h-3 rounded-full bg-current"></span>
                <span className="font-bold text-sm">{table.status.toUpperCase()}</span>
              </div>
            </div>

            {/* Seats */}
            <div>
              <p className="text-xs text-slate-500 font-semibold mb-2">CAPACITY</p>
              <div className="flex items-center gap-2 text-slate-900">
                <span className="text-2xl">👥</span>
                <span className="text-lg font-bold">{table.seats} Seats</span>
              </div>
            </div>

            {/* Floor */}
            {table.floor && (
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-2">LOCATION</p>
                <div className="flex items-center gap-2 text-slate-900">
                  <span className="text-2xl">📍</span>
                  <span className="text-lg font-bold">{table.floor.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Change Status */}
          <div className="mb-6">
            <p className="text-xs text-slate-500 font-semibold mb-3">CHANGE STATUS TO:</p>
            <div className="grid grid-cols-2 gap-2">
              {statuses.map((status) => (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(status.value)}
                  className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                    selectedStatus === status.value
                      ? `bg-${status.color}-500 text-white shadow-lg scale-105`
                      : `bg-${status.color}-50 text-${status.color}-700 hover:bg-${status.color}-100`
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-lg"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  )
}