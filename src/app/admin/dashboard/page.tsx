'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Client {
  id: string
  organization_id: string
  restaurant_name: string
  owner_email: string
  owner_name: string
  plan_name: string
  monthly_fee: number
  start_date: string
  last_payment_date: string | null
  next_payment_due: string
  payment_status: 'paid' | 'unpaid' | 'overdue'
  is_active: boolean
  days_running: number
  days_until_due: number
  notes: string | null
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    paid: 0,
    unpaid: 0,
    overdue: 0,
  })

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  const checkAdminAndLoadData = async () => {
    try {
      const response = await fetch('/api/check-admin')
      const data = await response.json()

      if (!data.isAdmin) {
        router.push('/admin/login')
        return
      }

      await loadClients()
    } catch (error) {
      console.error('Error:', error)
      router.push('/admin/login')
    }
  }

  const loadClients = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/clients')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to load clients')
      }

      const list = data.clients ?? []
      setClients(list)

      setStats({
        total: list.length,
        active: list.filter((c: Client) => c.is_active).length,
        inactive: list.filter((c: Client) => !c.is_active).length,
        paid: list.filter((c: Client) => c.payment_status === 'paid').length,
        unpaid: list.filter((c: Client) => c.payment_status === 'unpaid').length,
        overdue: list.filter((c: Client) => c.payment_status === 'overdue').length,
      })
    } catch (error) {
      console.error('Error loading clients:', error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const toggleActiveStatus = async (clientId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
      alert(currentStatus ? 'Client deactivated!' : 'Client activated!')
      loadClients()
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown'))
    }
  }

  const markAsPaid = async (clientId: string) => {
    try {
      const today = new Date()
      const nextDue = new Date(today)
      nextDue.setMonth(nextDue.getMonth() + 1)

      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: 'paid',
          last_payment_date: today.toISOString().split('T')[0],
          next_payment_due: nextDue.toISOString().split('T')[0],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
      alert('Payment recorded successfully!')
      loadClients()
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown'))
    }
  }

  const updateNotes = async (clientId: string, notes: string) => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Update failed')
      }
      loadClients()
    } catch (err: unknown) {
      console.error('Error updating notes:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2">
              🎛️ Super Admin Mother Panel
            </h1>
            <p className="text-slate-600">Manage all NextTable clients</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Back to app
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg border-2 p-4">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-600">Total Clients</div>
          </div>
          <div className="bg-emerald-50 rounded-lg border-2 border-emerald-200 p-4">
            <div className="text-2xl font-bold text-emerald-900">{stats.active}</div>
            <div className="text-sm text-emerald-700">Active</div>
          </div>
          <div className="bg-red-50 rounded-lg border-2 border-red-200 p-4">
            <div className="text-2xl font-bold text-red-900">{stats.inactive}</div>
            <div className="text-sm text-red-700">Inactive</div>
          </div>
          <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-4">
            <div className="text-2xl font-bold text-blue-900">{stats.paid}</div>
            <div className="text-sm text-blue-700">Paid</div>
          </div>
          <div className="bg-yellow-50 rounded-lg border-2 border-yellow-200 p-4">
            <div className="text-2xl font-bold text-yellow-900">{stats.unpaid}</div>
            <div className="text-sm text-yellow-700">Unpaid</div>
          </div>
          <div className="bg-orange-50 rounded-lg border-2 border-orange-200 p-4">
            <div className="text-2xl font-bold text-orange-900">{stats.overdue}</div>
            <div className="text-sm text-orange-700">Overdue</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => router.push('/admin/create-client')}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600"
          >
            ➕ Create New Client
          </button>
          <button
            onClick={loadClients}
            className="px-6 py-3 bg-slate-200 rounded-lg font-bold hover:bg-slate-300"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-xl border-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold">Restaurant</th>
                  <th className="px-4 py-3 text-left text-sm font-bold">Owner</th>
                  <th className="px-4 py-3 text-left text-sm font-bold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-bold">Payment</th>
                  <th className="px-4 py-3 text-left text-sm font-bold">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-bold">Next Due</th>
                  <th className="px-4 py-3 text-left text-sm font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((client) => (
                  <tr key={client.id} className={!client.is_active ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-bold">{client.restaurant_name}</div>
                      <div className="text-sm text-slate-500">
                        {client.plan_name} - ৳{client.monthly_fee}/mo
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{client.owner_name}</div>
                      <div className="text-xs text-slate-500">{client.owner_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {client.is_active ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-900 rounded text-xs font-bold">
                          ✅ Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-900 rounded text-xs font-bold">
                          ❌ Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {client.payment_status === 'paid' && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-900 rounded text-xs font-bold">
                          💰 Paid
                        </span>
                      )}
                      {client.payment_status === 'unpaid' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-900 rounded text-xs font-bold">
                          ⏳ Unpaid
                        </span>
                      )}
                      {client.payment_status === 'overdue' && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-900 rounded text-xs font-bold">
                          🚨 Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-bold">{client.days_running} days</div>
                      <div className="text-xs text-slate-500">
                        Since {new Date(client.start_date).toLocaleDateString('en-BD')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className={`text-sm font-bold ${client.days_until_due < 0 ? 'text-red-600' : ''}`}
                      >
                        {client.days_until_due < 0
                          ? `${Math.abs(client.days_until_due)} days overdue`
                          : `${client.days_until_due} days left`}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(client.next_payment_due).toLocaleDateString('en-BD')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => toggleActiveStatus(client.id, client.is_active)}
                          className={`px-3 py-1 rounded text-xs font-bold ${
                            client.is_active
                              ? 'bg-red-100 text-red-900 hover:bg-red-200'
                              : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                          }`}
                        >
                          {client.is_active ? '🔒 Deactivate' : '✅ Activate'}
                        </button>
                        {client.payment_status !== 'paid' && (
                          <button
                            onClick={() => markAsPaid(client.id)}
                            className="px-3 py-1 bg-blue-100 text-blue-900 rounded text-xs font-bold hover:bg-blue-200"
                          >
                            💰 Mark Paid
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Notes..."
                        defaultValue={client.notes ?? ''}
                        onBlur={(e) => updateNotes(client.id, e.target.value)}
                        className="mt-2 w-full min-w-[120px] px-2 py-1 text-xs border rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {clients.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No clients yet. Run the migration <code className="bg-slate-100 px-1 rounded">003_client_subscriptions.sql</code> in Supabase, then create your first client from Create New Client.
          </div>
        )}
      </div>
    </div>
  )
}
