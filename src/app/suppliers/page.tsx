'use client'

import { useState, useEffect } from 'react'
import { supabase, ensureSession } from '@/lib/supabase-client'
import BackButton from '@/components/BackButton'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'

interface Supplier {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export default function SuppliersPage() {
  const { organization } = useAuth()
  const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  })

  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    if (orgId) fetchSuppliers()
    else setLoading(false)
  }, [orgId])

  const fetchSuppliers = async () => {
    await ensureSession()
    if (!orgId) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to load suppliers', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showToast('Please enter supplier name', 'error')
      return
    }
    if (!orgId) {
      showToast('Organization not set. Please refresh and try again.', 'error')
      return
    }

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSupplier.id)
          .eq('organization_id', orgId)

        if (error) throw error
        showToast('✅ Supplier updated!', 'success')
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert({
            ...formData,
            is_active: true,
            organization_id: orgId,
          })

        if (error) throw error
        showToast('✅ Supplier added!', 'success')
      }

      setShowForm(false)
      setEditingSupplier(null)
      setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })
      fetchSuppliers()
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to save supplier', 'error')
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || ''
    })
    setShowForm(true)
  }

  const handleToggleActive = async (supplier: Supplier) => {
    if (!orgId) return
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: !supplier.is_active })
        .eq('id', supplier.id)
        .eq('organization_id', orgId)

      if (error) throw error
      showToast(supplier.is_active ? 'Supplier deactivated' : 'Supplier activated', 'success')
      fetchSuppliers()
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to update supplier', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 lg:p-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 lg:gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl lg:text-4xl font-brand font-black text-slate-900">🏢 SUPPLIERS</h1>
            <p className="text-xs lg:text-sm text-slate-600">Manage your suppliers</p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowForm(true)
            setEditingSupplier(null)
            setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })
          }}
          className="w-full sm:w-auto px-6 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600"
        >
          + Add Supplier
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border-2 border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Total Suppliers</div>
          <div className="text-3xl font-bold text-slate-900">{suppliers.length}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
          <div className="text-xs text-emerald-600 mb-1">Active</div>
          <div className="text-3xl font-bold text-emerald-700">
            {suppliers.filter(s => s.is_active).length}
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
          <div className="text-xs text-red-600 mb-1">Inactive</div>
          <div className="text-3xl font-bold text-red-700">
            {suppliers.filter(s => !s.is_active).length}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-2xl">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., ABC Trading"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                    placeholder="e.g., John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                    placeholder="e.g., 01711-123456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                  placeholder="e.g., supplier@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                  placeholder="Full address"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600"
                >
                  {editingSupplier ? 'Update' : 'Add'} Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suppliers List */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
          <div className="text-6xl mb-4">🏢</div>
          <div className="text-xl font-bold text-slate-900 mb-2">No Suppliers Yet</div>
          <div className="text-slate-600 mb-4">Add your first supplier to get started</div>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600"
          >
            + Add Supplier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(supplier => (
            <div
              key={supplier.id}
              className={`bg-white rounded-xl p-4 border-2 ${
                supplier.is_active ? 'border-slate-200' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{supplier.name}</h3>
                  {supplier.contact_person && (
                    <div className="text-sm text-slate-600">👤 {supplier.contact_person}</div>
                  )}
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${
                  supplier.is_active
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {supplier.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>

              {supplier.phone && (
                <div className="text-sm text-slate-600 mb-1">📞 {supplier.phone}</div>
              )}
              {supplier.email && (
                <div className="text-sm text-slate-600 mb-1">📧 {supplier.email}</div>
              )}
              {supplier.address && (
                <div className="text-sm text-slate-600 mb-3">📍 {supplier.address}</div>
              )}

              <div className="flex gap-2 mt-4 pt-3 border-t">
                <button
                  onClick={() => handleEdit(supplier)}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded font-bold text-sm hover:bg-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(supplier)}
                  className={`flex-1 px-3 py-2 rounded font-bold text-sm ${
                    supplier.is_active
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  {supplier.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
