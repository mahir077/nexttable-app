'use client'

import { useState, useEffect } from 'react'
import { supabase, getAllTables, type Table } from '@/app/lib/api/tables'
import BackButton from '@/components/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/Toast'

interface Reservation {
  id: string
  date: string
  time: string
  table_id: string
  guest_name: string
  guest_phone: string | null
  guest_count: number | null
  special_requests: string | null
  status: string
  created_at: string
}

export default function ReservationsPage() {
  const { organization } = useAuth()
  const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [tableId, setTableId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    if (orgId) {
      fetchReservations()
      fetchTables()
    } else setLoading(false)
  }, [orgId])

  const fetchReservations = async () => {
    if (!orgId) return
    setLoading(true)
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('date', { ascending: true })
      .order('time', { ascending: true })
    setReservations((data as Reservation[]) || [])
    setLoading(false)
  }

  const fetchTables = async () => {
    if (!orgId) return
    try {
      const data = await getAllTables(orgId)
      setTables(data || [])
    } catch (error) {
      console.error('Error fetching tables:', error)
      showToast('Failed to load tables', 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await supabase.from('reservations').insert({
      date,
      time,
      table_id: tableId,
      guest_name: guestName,
      guest_phone: guestPhone || null,
      guest_count: guestCount ? parseInt(guestCount, 10) : null,
      special_requests: specialRequests || null,
      status: 'pending',
      ...(orgId && { organization_id: orgId }),
    })

    if (!error) {
      alert('✅ Reservation created!')
      setShowForm(false)
      fetchReservations()
      setDate('')
      setTime('')
      setTableId('')
      setGuestName('')
      setGuestPhone('')
      setGuestCount('')
      setSpecialRequests('')
    } else {
      alert('Failed to create reservation: ' + error.message)
    }
  }

  const markAsArrived = async (reservation: Reservation) => {
    if (orgId) {
      await supabase.from('tables').update({ status: 'occupied' }).eq('id', reservation.table_id).eq('organization_id', orgId)
      await supabase.from('reservations').update({ status: 'arrived' }).eq('id', reservation.id).eq('organization_id', orgId)
    }
    alert('✅ Guest arrived!')
    fetchReservations()
  }

  const cancelReservation = async (id: string) => {
    if (confirm('Cancel this reservation?')) {
      if (orgId) await supabase.from('reservations').delete().eq('id', id).eq('organization_id', orgId)
      fetchReservations()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 lg:p-6">
      {/* Header - mobile friendly */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <BackButton />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-brand font-black text-slate-900 truncate">📅 RESERVATIONS</h1>
            <p className="text-xs sm:text-sm text-slate-600">Table booking</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto min-h-[44px] px-4 py-3 sm:px-6 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors touch-manipulation"
        >
          + New Reservation
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-slate-200 mb-4 sm:mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5 text-slate-700">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full min-h-[44px] px-4 py-3 text-base border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 text-slate-700">Time *</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-4 py-3 text-base border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5 text-slate-700">Table *</label>
                <select
                  value={tableId}
                  onChange={e => setTableId(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-4 py-3 text-base border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select Table</option>
                  {tables.map(table => (
                    <option key={table.id} value={table.id}>
                      Table {table.table_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 text-slate-700">Guest Count *</label>
                <input
                  type="number"
                  value={guestCount}
                  onChange={e => setGuestCount(e.target.value)}
                  required
                  min={1}
                  className="w-full min-h-[44px] px-4 py-3 text-base border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5 text-slate-700">Guest Name *</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-4 py-3 text-base border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 text-slate-700">Phone</label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-3 text-base border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5 text-slate-700">Special Requests</label>
              <textarea
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
                rows={3}
                className="w-full min-h-[80px] px-4 py-3 text-base border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="min-h-[44px] px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 touch-manipulation">
                Cancel
              </button>
              <button type="submit" className="min-h-[44px] px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 touch-manipulation">
                Create Reservation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List: cards on mobile, table on desktop */}
      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6 sm:p-8 text-center text-slate-500">Loading...</div>
        ) : reservations.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-slate-500">No pending reservations.</div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {reservations.map(res => (
                <div key={res.id} className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <div className="font-bold text-slate-900">{res.guest_name}</div>
                      {res.guest_phone && <div className="text-sm text-slate-500">{res.guest_phone}</div>}
                    </div>
                    <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">
                      {res.date} · {res.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                    <span>Table {tables.find(t => t.id === res.table_id)?.table_number ?? '—'}</span>
                    <span>·</span>
                    <span>{res.guest_count ?? '—'} guests</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => markAsArrived(res)}
                      className="flex-1 min-h-[44px] py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 touch-manipulation"
                    >
                      Arrived
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelReservation(res.id)}
                      className="flex-1 min-h-[44px] py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 touch-manipulation"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Table</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Guest</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Count</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(res => (
                    <tr key={res.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-800">{res.date}</td>
                      <td className="px-4 py-3 text-slate-800">{res.time}</td>
                      <td className="px-4 py-3 text-slate-800">
                        {tables.find(t => t.id === res.table_id)?.table_number ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{res.guest_name}</div>
                        {res.guest_phone && <div className="text-xs text-slate-500">{res.guest_phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-800">{res.guest_count ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => markAsArrived(res)}
                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600"
                          >
                            Arrived
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelReservation(res.id)}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
