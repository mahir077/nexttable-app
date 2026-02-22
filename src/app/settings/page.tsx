'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSupabase } from '@/contexts/SupabaseContext'
import { getTablesByFloor, Floor, Table } from '@/app/lib/api/tables'
import { getCashDrawerUrl, setCashDrawerUrl as saveCashDrawerUrl } from '@/app/lib/cashDrawer'
import BackButton from '@/components/BackButton'
import Toast from '@/components/Toast'
import { useToast } from '@/hooks/useToast'

type InvoiceSettings = {
  show_logo: boolean
  show_business_info: boolean
  show_table_number: boolean
  show_order_type: boolean
  show_customer_name: boolean
  show_date_time: boolean
  show_item_prices: boolean
  show_thank_you: boolean
  custom_header: string
  custom_footer: string
}

const defaultInvoiceSettings: InvoiceSettings = {
  show_logo: true,
  show_business_info: true,
  show_table_number: true,
  show_order_type: true,
  show_customer_name: true,
  show_date_time: true,
  show_item_prices: true,
  show_thank_you: true,
  custom_header: '',
  custom_footer: 'Thank you for your visit!\nPlease come again'
}

export default function SettingsPage() {
  // ===== FIX 1: Get org from AuthContext + localStorage fallback =====
  const { organization } = useAuth()
  const supabase = useSupabase()
  const [orgId, setOrgId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('current_organization_id')
    }
    return null
  })

  // Sync with AuthContext when it loads (takes priority)
  useEffect(() => {
    if (organization?.id && organization.id !== orgId) {
      setOrgId(organization.id)
    }
  }, [organization])

  const [activeTab, setActiveTab] = useState<'restaurant' | 'tables' | 'printer' | 'invoice'>('restaurant')
  
  // Restaurant info state
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  })
  const [restaurantSettingsId, setRestaurantSettingsId] = useState<string | null>(null)
  const [restaurantInfoLoading, setRestaurantInfoLoading] = useState(false)

  // Track if loadSettings has run to prevent re-runs
  const loadSettingsRanRef = useRef(false)

  // Tables state
  const [floors, setFloors] = useState<Floor[]>([])
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showFloorModal, setShowFloorModal] = useState(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null)
  const [editingTable, setEditingTable] = useState<Table | null>(null)

  // Form states
  const [floorForm, setFloorForm] = useState({ name: '' })
  const [tableForm, setTableForm] = useState<{ 
    table_number: string
    floor_id: string
    seats: string
  }>({ 
    table_number: '', 
    floor_id: '',
    seats: '4'
  })

  // Printer & Cash Drawer
  const [cashDrawerUrl, setCashDrawerUrl] = useState('')

  // Invoice customization
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(defaultInvoiceSettings)

  const { toast, showToast, hideToast } = useToast()

  // Fetch data when org is available
  useEffect(() => {
    if (orgId) fetchFloors()
  }, [orgId])

  useEffect(() => {
    if (selectedFloor) {
      fetchTables()
    }
  }, [selectedFloor])

  useEffect(() => {
    setCashDrawerUrl(getCashDrawerUrl())
  }, [activeTab])

  useEffect(() => {
    loadInvoiceSettings()
  }, [orgId])

  // ===== FIX 2: loadSettings with timeout to prevent hanging on Vercel =====
  const loadSettings = async () => {
    if (!orgId) return
    setRestaurantInfoLoading(true)
    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    try {
      let orgData: { id: string; name: string; display_name?: string | null; slug?: string } | null = null

      const { data: orgResp, error: orgError } = await Promise.race([
        supabase.from('organizations').select('id, name, display_name, slug').eq('id', orgId).single(),
        timeout(8000)
      ]) as any

      if (orgResp && !orgError) {
        orgData = orgResp
        setRestaurantInfo(prev => ({
          ...prev,
          name: (orgResp.display_name || orgResp.name) ?? prev.name
        }))
      }

      const { data: settingsData, error: settingsError } = await Promise.race([
        supabase.from('restaurant_settings').select('*').eq('organization_id', orgId).maybeSingle(),
        timeout(8000)
      ]) as any

      if (settingsData && !settingsError) {
        setRestaurantSettingsId(settingsData.id)
        setRestaurantInfo({
          name: (orgData?.display_name || orgData?.name) || (settingsData.display_name as string) || '',
          address: (settingsData.address as string) ?? '',
          phone: (settingsData.phone as string) ?? '',
          email: (settingsData.email as string) ?? ''
        })
      } else {
        setRestaurantInfo(prev => ({
          name: (orgData?.display_name || orgData?.name) ?? prev.name,
          address: prev.address,
          phone: prev.phone,
          email: prev.email
        }))
      }
    } catch (e) {
      if (e instanceof Error && (e.name === 'AbortError' || e.message === 'timeout')) {
        console.log('loadSettings timeout/abort - using cached data')
      } else {
        console.error('Load settings error:', e)
      }
    } finally {
      setRestaurantInfoLoading(false)
    }
  }

  // Run loadSettings once when orgId is available
  useEffect(() => {
    if (orgId) {
      loadSettingsRanRef.current = false
      loadSettings()
    }
  }, [orgId])

  const fetchFloors = async () => {
    if (!orgId) return
    try {
      const { data, error } = await supabase
        .from('floors')
        .select('*')
        .order('name')
        .eq('organization_id', orgId)

      if (error) {
        console.error('Error fetching floors:', error)
        showToast('Failed to load floors', 'error')
        return
      }
      setFloors(data || [])
      if (data && data.length > 0 && !selectedFloor) {
        setSelectedFloor(data[0])
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Error fetching floors:', error)
      showToast('Failed to load floors', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchTables = async () => {
    if (!selectedFloor || !orgId) return
    try {
      const data = await getTablesByFloor(selectedFloor.id, orgId)
      setTables(data)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Error fetching tables:', error)
    }
  }

  // ===== FIX 3: Save with proper AbortError handling =====
  const handleSaveRestaurantInfo = async () => {
    if (!restaurantInfo.name?.trim()) {
      showToast('Please enter restaurant name', 'error')
      return
    }
    if (!orgId) {
      showToast('No organization selected. Please wait or refresh.', 'error')
      return
    }
    setRestaurantInfoLoading(true)
    const timeoutMs = 20000
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Save timed out. Please try again.')), timeoutMs)
    )
    try {
      const displayName = restaurantInfo.name.trim()
      const updatedAt = new Date().toISOString()

      const savePromise = (async () => {
        // 1) Save restaurant_settings
        const { data: existing } = await supabase
          .from('restaurant_settings')
          .select('id')
          .eq('organization_id', orgId)
          .limit(1)
          .maybeSingle()

        if (existing) {
          const { error } = await supabase
            .from('restaurant_settings')
            .update({
              display_name: displayName,
              address: restaurantInfo.address?.trim() ?? null,
              phone: restaurantInfo.phone?.trim() ?? null,
              email: restaurantInfo.email?.trim() ?? null,
              updated_at: updatedAt
            })
            .eq('id', existing.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('restaurant_settings')
            .insert({
              organization_id: orgId,
              display_name: displayName,
              address: restaurantInfo.address?.trim() ?? null,
              phone: restaurantInfo.phone?.trim() ?? null,
              email: restaurantInfo.email?.trim() ?? null
            })

          if (error) throw error
        }

        // 2) Try to update organization display_name
        try {
          const { error: orgError } = await supabase
            .from('organizations')
            .update({ display_name: displayName, updated_at: updatedAt })
            .eq('id', orgId)
          if (orgError) throw orgError
        } catch {
          // Org update is optional
        }

        localStorage.setItem('restaurantInfo', JSON.stringify(restaurantInfo))
      })()

      await Promise.race([savePromise, timeoutPromise])

      showToast('Settings saved!', 'success')
      await loadSettings()
    } catch (error) {
      // ===== FIX: Ignore AbortError silently =====
      if (error instanceof Error && error.name === 'AbortError') {
        // Do nothing - don't show error toast
      } else {
        console.error('Save error:', error)
        const msg = String((error as Error)?.message || (error as { message?: string })?.message || 'Unknown error')
        const isPermissionError = /app\.current_tenant_id|current_tenant_id|row-level security|policy|permission denied|violates row-level security/i.test(msg)
        if (msg.includes('timed out')) {
          showToast(msg, 'error')
        } else if (isPermissionError) {
          showToast(`Failed: ${msg.slice(0, 80)}${msg.length > 80 ? '…' : ''}. Already ran RUN_ONCE_settings_fix.sql? Try Save again.`, 'error')
        } else {
          showToast('Failed: ' + msg, 'error')
        }
      }
    } finally {
      // ===== FIX: ALWAYS reset loading =====
      setRestaurantInfoLoading(false)
    }
  }

  // Add/Edit Floor
  const handleSaveFloor = async () => {
    if (!floorForm.name.trim()) {
      showToast('Please enter floor name', 'error')
      return
    }
    if (!orgId) {
      showToast('No organization selected. Please wait or refresh.', 'error')
      return
    }
    if (editingFloor) {
      try {
        const { error } = await supabase
          .from('floors')
          .update({ name: floorForm.name })
          .eq('id', editingFloor.id)
          .eq('organization_id', orgId)

        if (error) throw error
        showToast('Floor updated!', 'success')
        setShowFloorModal(false)
        setEditingFloor(null)
        setFloorForm({ name: '' })
        setFloors(prev => prev.map(f => f.id === editingFloor.id ? { ...f, name: floorForm.name.trim() } : f))
      } catch (error) {
        console.error('Error saving floor:', error)
        const errMsg = error instanceof Error ? error.message : JSON.stringify(error)
        showToast('Failed to save floor: ' + errMsg, 'error')
      }
      return
    }

    // Add new floor — optimistic UI
    const tempId = `temp-floor-${Date.now()}`
    const optimisticFloor: Floor = {
      id: tempId,
      name: floorForm.name.trim(),
      display_order: floors.length,
      is_active: true
    }
    setFloors(prev => [...prev, optimisticFloor])
    setShowFloorModal(false)
    setEditingFloor(null)
    setFloorForm({ name: '' })

    try {
      const { data, error } = await supabase
        .from('floors')
        .insert({
          name: optimisticFloor.name,
          is_active: true,
          organization_id: orgId,
          display_order: optimisticFloor.display_order
        })
        .select()
        .single()

      if (error) throw error
      showToast('Floor added!', 'success')
      setFloors(prev => prev.map(f => f.id === tempId ? (data as Floor) : f))
    } catch (error) {
      console.error('Floor insert error:', error)
      setFloors(prev => prev.filter(f => f.id !== tempId))
      const errMsg = (error as { message?: string })?.message ?? (error instanceof Error ? error.message : JSON.stringify(error))
      showToast('Failed to save floor: ' + errMsg, 'error')
    }
  }

  // Delete Floor
  const handleDeleteFloor = async (floor: Floor) => {
    if (!confirm(`Delete floor "${floor.name}"? This will delete all tables on this floor.`)) return
    if (!orgId) return
    if (floor.id.startsWith('temp-')) {
      setFloors(prev => prev.filter(f => f.id !== floor.id))
      return
    }
    const prevFloors = floors
    setFloors(prev => prev.filter(f => f.id !== floor.id))
    if (selectedFloor?.id === floor.id) {
      const next = prevFloors.find(f => f.id !== floor.id)
      setSelectedFloor(next ?? null)
      setTables([])
    }
    try {
      const { error } = await supabase
        .from('floors')
        .delete()
        .eq('id', floor.id)
        .eq('organization_id', orgId)

      if (error) throw error
      showToast('Floor deleted!', 'success')
    } catch (error) {
      console.error('Error deleting floor:', error)
      setFloors(prevFloors)
      if (selectedFloor?.id === floor.id) setSelectedFloor(floor)
      showToast('Failed to delete floor', 'error')
    }
  }

  // Add/Edit Table
  const handleSaveTable = async () => {
    if (!tableForm.table_number.trim()) {
      showToast('Please enter table number', 'error')
      return
    }

    if (!editingTable && !tableForm.floor_id) {
      showToast('Please select a floor', 'error')
      return
    }

    if (editingTable) {
      try {
        const { error } = await supabase
          .from('tables')
          .update({
            table_number: tableForm.table_number.trim(),
            seats: parseInt(tableForm.seats, 10) || 4
          })
          .eq('id', editingTable.id)

        if (error) throw error
        showToast('Table updated!', 'success')
        setShowTableModal(false)
        setEditingTable(null)
        setTableForm({ table_number: '', floor_id: '', seats: '4' })
        setTables(prev => prev.map(t => t.id === editingTable.id
          ? { ...t, table_number: parseInt(tableForm.table_number, 10) || t.table_number, seats: parseInt(tableForm.seats, 10) || 4 }
          : t))
      } catch (error) {
        console.error('Error saving table:', error)
        showToast('Failed to save table', 'error')
      }
      return
    }

    // Add new table
    if (!orgId) {
      showToast('No organization selected. Please wait or refresh.', 'error')
      return
    }
    const floorId = tableForm.floor_id
    const floor = floors.find(f => f.id === floorId)
    const tableNum = parseInt(tableForm.table_number, 10) || 0
    const seats = parseInt(tableForm.seats, 10) || 4
    const tempId = `temp-table-${Date.now()}`
    const optimisticTable: Table = {
      id: tempId,
      floor_id: floorId,
      table_number: tableNum,
      seats,
      status: 'available',
      is_active: true,
      floor: floor ?? undefined
    }
    setShowTableModal(false)
    setEditingTable(null)
    setTableForm({ table_number: '', floor_id: '', seats: '4' })
    if (floor) setSelectedFloor(floor)
    if (floorId === selectedFloor?.id) {
      setTables(prev => [...prev, optimisticTable])
    }

    try {
      const { data, error } = await supabase
        .from('tables')
        .insert({
          floor_id: floorId,
          table_number: String(tableNum),
          seats,
          status: 'available',
          is_active: true,
          organization_id: orgId
        })
        .select(`
          *,
          floor:floors(*)
        `)
        .single()

      if (error) throw error
      showToast('Table created successfully!', 'success')
      setTables(prev => prev.map(t => t.id === tempId ? (data as Table) : t))
    } catch (error) {
      console.error('Table creation error:', error)
      setTables(prev => prev.filter(t => t.id !== tempId))
      const errMsg = (error as { message?: string })?.message ?? (error instanceof Error ? error.message : JSON.stringify(error))
      showToast('Failed to create table: ' + errMsg, 'error')
    }
  }

  // Delete Table
  const handleDeleteTable = async (table: Table) => {
    if (!confirm(`Delete Table ${table.table_number}?`)) return

    const prevTables = tables
    setTables(prev => prev.filter(t => t.id !== table.id))

    if (table.id.startsWith('temp-')) return

    try {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', table.id)

      if (error) throw error
      showToast('Table deleted!', 'success')
    } catch (error) {
      console.error('Error deleting table:', error)
      setTables(prevTables)
      showToast('Failed to delete table', 'error')
    }
  }

  const saveInvoiceSettings = async () => {
    if (!orgId) {
      showToast('No organization selected. Please wait or refresh.', 'error')
      return
    }
    try {
      const updatedAt = new Date().toISOString()
      const { data: existing } = await supabase
        .from('invoice_settings')
        .select('id')
        .eq('organization_id', orgId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('invoice_settings')
          .update({ ...invoiceSettings, updated_at: updatedAt })
          .eq('id', existing.id)
          .eq('organization_id', orgId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('invoice_settings')
          .insert({ ...invoiceSettings, organization_id: orgId, updated_at: updatedAt })
        if (error) throw error
      }
      showToast('✅ Invoice settings saved!', 'success')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Save error:', error)
      showToast('Failed to save settings', 'error')
    }
  }

  const loadInvoiceSettings = async () => {
    if (!orgId) return
    try {
      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()

      if (!error && data) {
        setInvoiceSettings(prev => ({
          ...defaultInvoiceSettings,
          ...prev,
          ...(data as Partial<InvoiceSettings>)
        }))
      }
    } catch {
      // keep default invoice settings
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <BackButton />
        <div>
          <h1 className="text-3xl lg:text-4xl font-brand font-black text-slate-900 mb-1">⚙️ SETTINGS</h1>
          <p className="text-slate-600 text-sm">Manage your restaurant configuration</p>
        </div>
      </div>

      {!orgId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm mb-6">
          <span>
            No organization selected. Try{' '}
            <button type="button" onClick={() => window.location.reload()} className="underline font-bold hover:no-underline">
              refreshing the page
            </button>
            {' '}or log in again.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border-2 border-slate-200 mb-6 overflow-x-auto">
        <div className="flex min-w-max p-1">
          <button
            type="button"
            onClick={() => setActiveTab('restaurant')}
            className={`px-6 py-4 whitespace-nowrap rounded-xl font-bold transition-all ${
              activeTab === 'restaurant'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300'
            }`}
          >
            🏪 Restaurant Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`px-6 py-4 whitespace-nowrap rounded-xl font-bold transition-all ml-1 ${
              activeTab === 'tables'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300'
            }`}
          >
            🪑 Tables & Floors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('printer')}
            className={`px-6 py-4 whitespace-nowrap rounded-xl font-bold transition-all ml-1 ${
              activeTab === 'printer'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300'
            }`}
          >
            🖨️ Printer & Cash Drawer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoice')}
            className={`px-6 py-4 whitespace-nowrap rounded-xl font-bold transition-all ml-1 ${
              activeTab === 'invoice'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300'
            }`}
          >
            🧾 Invoice
          </button>
        </div>
      </div>

      {/* Restaurant Info Tab */}
      {activeTab === 'restaurant' && (
        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-8 border-2 border-slate-200">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-6">Restaurant Information</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Restaurant Name (Business Name)</label>
              <input
                type="text"
                value={restaurantInfo.name}
                onChange={(e) => setRestaurantInfo({ ...restaurantInfo, name: e.target.value })}
                className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Address</label>
              <input
                type="text"
                value={restaurantInfo.address}
                onChange={(e) => setRestaurantInfo({ ...restaurantInfo, address: e.target.value })}
                className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Phone</label>
              <input
                type="tel"
                value={restaurantInfo.phone}
                onChange={(e) => setRestaurantInfo({ ...restaurantInfo, phone: e.target.value })}
                className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
              <input
                type="email"
                value={restaurantInfo.email}
                onChange={(e) => setRestaurantInfo({ ...restaurantInfo, email: e.target.value })}
                className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveRestaurantInfo}
            disabled={restaurantInfoLoading || !orgId}
            className="mt-6 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors disabled:opacity-60"
          >
            {!orgId ? 'No organization' : restaurantInfoLoading ? 'Saving…' : '💾 Save Restaurant Info'}
          </button>
        </div>
      )}

      {/* Printer & Cash Drawer Tab */}
      {activeTab === 'printer' && (
        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-8 border-2 border-slate-200">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-6">Printer & Cash Drawer</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Cash drawer endpoint</label>
              <input
                type="text"
                value={cashDrawerUrl}
                onChange={(e) => setCashDrawerUrl(e.target.value)}
                onBlur={() => saveCashDrawerUrl(cashDrawerUrl)}
                placeholder="e.g. http://localhost:9100/open"
                className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-500 mt-1">বিল প্রিন্ট করার সময় &quot;Print (open drawer)&quot; দিলে এই URL এ request যাবে। লোকাল সার্ভিস চালু থাকলে ক্যাশ ড্রয়ার খুলবে।</p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Tab */}
      {activeTab === 'invoice' && (
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200">
          <h2 className="text-2xl font-bold mb-6">🖨️ Invoice Customization</h2>

          <div className="space-y-6">
            {/* Toggle Options */}
            <div>
              <h3 className="font-bold text-slate-700 mb-3">Show/Hide Elements</h3>
              <div className="space-y-3">
                {(
                  [
                    { key: 'show_business_info' as const, label: 'Business Info (Name, Address, Phone)' },
                    { key: 'show_table_number' as const, label: 'Table Number' },
                    { key: 'show_order_type' as const, label: 'Order Type (Dine-in/Takeaway)' },
                    { key: 'show_customer_name' as const, label: 'Customer Name' },
                    { key: 'show_date_time' as const, label: 'Date & Time' },
                    { key: 'show_item_prices' as const, label: 'Individual Item Prices' },
                    { key: 'show_thank_you' as const, label: 'Thank You Message' }
                  ] as const
                ).map(option => (
                  <label key={option.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                    <span className="font-medium text-slate-900">{option.label}</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={invoiceSettings[option.key]}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            [option.key]: e.target.checked
                          })
                        }
                        className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500"
                      />
                      <span
                        className={`text-xs font-bold ${
                          invoiceSettings[option.key] ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {invoiceSettings[option.key] ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Header */}
            <div>
              <label className="block font-bold text-slate-700 mb-2">Custom Header Text (Optional)</label>
              <input
                type="text"
                value={invoiceSettings.custom_header}
                onChange={(e) =>
                  setInvoiceSettings({
                    ...invoiceSettings,
                    custom_header: e.target.value
                  })
                }
                placeholder="e.g., Welcome to our restaurant!"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
              />
              <p className="text-xs text-slate-500 mt-1">Will appear at the top of invoice</p>
            </div>

            {/* Custom Footer */}
            <div>
              <label className="block font-bold text-slate-700 mb-2">Custom Footer Text</label>
              <textarea
                value={invoiceSettings.custom_footer}
                onChange={(e) =>
                  setInvoiceSettings({
                    ...invoiceSettings,
                    custom_footer: e.target.value
                  })
                }
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900"
              />
              <p className="text-xs text-slate-500 mt-1">Will appear at the bottom of invoice</p>
            </div>

            {/* Save & Preview */}
            <div className="flex gap-3 pt-4 border-t-2">
              <button
                type="button"
                onClick={saveInvoiceSettings}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600"
              >
                💾 Save Invoice Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('Preview when printing from Billing page', 'info')
                }}
                className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600"
              >
                👁️ Preview Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tables & Floors Tab */}
      {activeTab === 'tables' && (
        <div className="space-y-6">
          {/* Floors Section */}
          <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-8 border-2 border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Floors ({floors.length})</h2>
              <button
                type="button"
                onClick={() => {
                  setEditingFloor(null)
                  setFloorForm({ name: '' })
                  setShowFloorModal(true)
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors"
              >
                ➕ Add Floor
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
              {floors.map(floor => (
                <div key={floor.id} className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{floor.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingFloor(floor)
                          setFloorForm({ name: floor.name })
                          setShowFloorModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-700 font-bold text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteFloor(floor)}
                        className="text-rose-600 hover:text-rose-700 font-bold text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFloor(floor)}
                    className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors ${
                      selectedFloor?.id === floor.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    View Tables
                  </button>
                </div>
              ))}
              </div>
            </div>
          </div>

          {/* Tables Section */}
          {selectedFloor && (
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-8 border-2 border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900">
                  Tables on {selectedFloor.name} ({tables.length})
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTable(null)
                    setTableForm({
                      table_number: '',
                      floor_id: selectedFloor?.id ?? floors[0]?.id ?? '',
                      seats: '4'
                    })
                    setShowTableModal(true)
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
                >
                  ➕ Add Table
                </button>
              </div>

              <div className="overflow-x-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-w-0">
                  {tables.map(table => (
                    <div key={table.id} className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                      <div className="text-center mb-3">
                        <div className="text-3xl font-brand font-black text-emerald-600">
                          {table.table_number}
                        </div>
                        <div className="text-sm text-slate-600">{table.seats} seats</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTable(table)
                            setTableForm({
                              table_number: table.table_number.toString(),
                              floor_id: table.floor_id,
                              seats: table.seats.toString()
                            })
                            setShowTableModal(true)
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-blue-500 text-blue-600 bg-white hover:bg-blue-50 font-semibold text-xs sm:text-sm shadow-sm transition-colors"
                        >
                          ✏️ <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table)}
                          className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-sm font-bold shadow-sm transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floor Modal */}
      {showFloorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowFloorModal(false)}>
          <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-6">
              {editingFloor ? '✏️ Edit Floor' : '➕ Add Floor'}
            </h2>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Floor Name</label>
              <input
                type="text"
                value={floorForm.name}
                onChange={(e) => setFloorForm({ name: e.target.value })}
                placeholder="e.g., Ground Floor"
                className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowFloorModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFloor}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTableModal(false)}>
          <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-6">
              {editingTable ? '✏️ Edit Table' : '➕ Add Table'}
            </h2>
            {!editingTable && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Floor *</label>
                <select
                  value={tableForm.floor_id}
                  onChange={(e) => setTableForm({ ...tableForm, floor_id: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select Floor</option>
                  {floors.map(floor => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name}
                    </option>
                  ))}
                </select>
                {floors.length === 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    No floors found! Please create floors first in the Floors tab.
                  </div>
                )}
              </div>
            )}
            {editingTable && selectedFloor && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Floor</label>
                <div className="w-full px-4 py-3 rounded-lg bg-slate-100 text-slate-700 font-medium">
                  {selectedFloor.name}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Table Number *</label>
                <input
                  type="text"
                  value={tableForm.table_number}
                  onChange={(e) => setTableForm({ ...tableForm, table_number: e.target.value })}
                  placeholder="e.g., 1, A1, VIP-1"
                  className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Number of Seats *</label>
                <input
                  type="number"
                  min={1}
                  value={tableForm.seats}
                  onChange={(e) => setTableForm({ ...tableForm, seats: e.target.value })}
                  className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTable}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
