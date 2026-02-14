'use client'

import { useState, useEffect } from 'react'
import { getFloors, getTablesByFloor, Floor, Table } from '@/app/lib/api/tables'
import { supabase } from '@/app/lib/api/tables'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'restaurant' | 'tables'>('restaurant')
  
  // Restaurant info state
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: 'NextTable Restaurant',
    address: 'Dhaka, Bangladesh',
    phone: '+880 1234-567890',
    email: 'info@nexttable.com'
  })

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
  const [tableForm, setTableForm] = useState({ 
    table_number: '', 
    seats: '4',
    location: ''
  })

  // Fetch data
  useEffect(() => {
    fetchFloors()
  }, [])

  useEffect(() => {
    if (selectedFloor) {
      fetchTables()
    }
  }, [selectedFloor])

  const fetchFloors = async () => {
    try {
      const data = await getFloors()
      setFloors(data)
      if (data.length > 0 && !selectedFloor) {
        setSelectedFloor(data[0])
      }
    } catch (error) {
      console.error('Error fetching floors:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTables = async () => {
    if (!selectedFloor) return
    try {
      const data = await getTablesByFloor(selectedFloor.id)
      setTables(data)
    } catch (error) {
      console.error('Error fetching tables:', error)
    }
  }

  // Save restaurant info
  const handleSaveRestaurantInfo = () => {
    // In production, this would save to database
    localStorage.setItem('restaurantInfo', JSON.stringify(restaurantInfo))
    alert('✅ Restaurant information saved!')
  }

  // Add/Edit Floor
  const handleSaveFloor = async () => {
    if (!floorForm.name.trim()) {
      alert('❌ Please enter floor name')
      return
    }

    try {
      if (editingFloor) {
        // Update floor
        const { error } = await supabase
          .from('floors')
          .update({ name: floorForm.name })
          .eq('id', editingFloor.id)

        if (error) throw error
        alert('✅ Floor updated!')
      } else {
        // Add new floor
        const { error } = await supabase
          .from('floors')
          .insert({ name: floorForm.name, is_active: true })

        if (error) throw error
        alert('✅ Floor added!')
      }

      setShowFloorModal(false)
      setEditingFloor(null)
      setFloorForm({ name: '' })
      fetchFloors()
    } catch (error) {
      console.error('Error saving floor:', error)
      alert('❌ Failed to save floor')
    }
  }

  // Delete Floor
  const handleDeleteFloor = async (floor: Floor) => {
    if (!confirm(`Delete floor "${floor.name}"? This will delete all tables on this floor.`)) return

    try {
      const { error } = await supabase
        .from('floors')
        .delete()
        .eq('id', floor.id)

      if (error) throw error
      alert('✅ Floor deleted!')
      fetchFloors()
    } catch (error) {
      console.error('Error deleting floor:', error)
      alert('❌ Failed to delete floor')
    }
  }

  // Add/Edit Table
  const handleSaveTable = async () => {
    if (!selectedFloor || !tableForm.table_number.trim()) {
      alert('❌ Please enter table number')
      return
    }

    try {
      if (editingTable) {
        // Update table
        const { error } = await supabase
          .from('tables')
          .update({
            table_number: tableForm.table_number,
            seats: parseInt(tableForm.seats),
            location: tableForm.location
          })
          .eq('id', editingTable.id)

        if (error) throw error
        alert('✅ Table updated!')
      } else {
        // Add new table
        const { error } = await supabase
          .from('tables')
          .insert({
            floor_id: selectedFloor.id,
            table_number: tableForm.table_number,
            seats: parseInt(tableForm.seats),
            location: tableForm.location,
            status: 'available'
          })

        if (error) throw error
        alert('✅ Table added!')
      }

      setShowTableModal(false)
      setEditingTable(null)
      setTableForm({ table_number: '', seats: '4', location: '' })
      fetchTables()
    } catch (error) {
      console.error('Error saving table:', error)
      alert('❌ Failed to save table')
    }
  }

  // Delete Table
  const handleDeleteTable = async (table: Table) => {
    if (!confirm(`Delete Table ${table.table_number}?`)) return

    try {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', table.id)

      if (error) throw error
      alert('✅ Table deleted!')
      fetchTables()
    } catch (error) {
      console.error('Error deleting table:', error)
      alert('❌ Failed to delete table')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-brand font-black text-slate-900 mb-2">⚙️ SETTINGS</h1>
        <p className="text-slate-600">Manage your restaurant configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab('restaurant')}
          className={`px-8 py-4 rounded-2xl font-bold transition-all ${
            activeTab === 'restaurant'
              ? 'bg-slate-900 text-white shadow-lg'
              : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300'
          }`}
        >
          🏪 Restaurant Info
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`px-8 py-4 rounded-2xl font-bold transition-all ${
            activeTab === 'tables'
              ? 'bg-slate-900 text-white shadow-lg'
              : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300'
          }`}
        >
          🪑 Tables & Floors
        </button>
      </div>

      {/* Restaurant Info Tab */}
      {activeTab === 'restaurant' && (
        <div className="bg-white rounded-2xl p-8 border-2 border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Restaurant Information</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Restaurant Name</label>
              <input
                type="text"
                value={restaurantInfo.name}
                onChange={(e) => setRestaurantInfo({ ...restaurantInfo, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Address</label>
              <input
                type="text"
                value={restaurantInfo.address}
                onChange={(e) => setRestaurantInfo({ ...restaurantInfo, address: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={restaurantInfo.phone}
                  onChange={(e) => setRestaurantInfo({ ...restaurantInfo, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={restaurantInfo.email}
                  onChange={(e) => setRestaurantInfo({ ...restaurantInfo, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSaveRestaurantInfo}
              className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
            >
              💾 Save Restaurant Info
            </button>
          </div>
        </div>
      )}

      {/* Tables & Floors Tab */}
      {activeTab === 'tables' && (
        <div className="space-y-6">
          {/* Floors Section */}
          <div className="bg-white rounded-2xl p-8 border-2 border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Floors ({floors.length})</h2>
              <button
                onClick={() => {
                  setEditingFloor(null)
                  setFloorForm({ name: '' })
                  setShowFloorModal(true)
                }}
                className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors"
              >
                ➕ Add Floor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Tables Section */}
          {selectedFloor && (
            <div className="bg-white rounded-2xl p-8 border-2 border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Tables on {selectedFloor.name} ({tables.length})
                </h2>
                <button
                  onClick={() => {
                    setEditingTable(null)
                    setTableForm({ table_number: '', seats: '4', location: '' })
                    setShowTableModal(true)
                  }}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
                >
                  ➕ Add Table
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {tables.map(table => (
                  <div key={table.id} className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                    <div className="text-center mb-3">
                      <div className="text-3xl font-brand font-black text-emerald-600">
                        {table.table_number}
                      </div>
                      <div className="text-sm text-slate-600">{table.seats} seats</div>
                      {table.location && (
                        <div className="text-xs text-slate-500 mt-1">{table.location}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTable(table)
                          setTableForm({
                            table_number: table.table_number.toString(),
                            seats: table.seats.toString(),
                            location: table.location || ''
                          })
                          setShowTableModal(true)
                        }}
                        className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTable(table)}
                        className="flex-1 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floor Modal */}
      {showFloorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowFloorModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">
              {editingFloor ? '✏️ Edit Floor' : '➕ Add Floor'}
            </h2>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Floor Name</label>
              <input
                type="text"
                value={floorForm.name}
                onChange={(e) => setFloorForm({ name: e.target.value })}
                placeholder="e.g., Ground Floor"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFloorModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
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
          <div className="bg-white rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">
              {editingTable ? '✏️ Edit Table' : '➕ Add Table'}
            </h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Table Number*</label>
                <input
                  type="text"
                  value={tableForm.table_number}
                  onChange={(e) => setTableForm({ ...tableForm, table_number: e.target.value })}
                  placeholder="e.g., 1, A1, VIP-1"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Number of Seats*</label>
                <input
                  type="number"
                  min="1"
                  value={tableForm.seats}
                  onChange={(e) => setTableForm({ ...tableForm, seats: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Location (Optional)</label>
                <input
                  type="text"
                  value={tableForm.location}
                  onChange={(e) => setTableForm({ ...tableForm, location: e.target.value })}
                  placeholder="e.g., By Window, Corner"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTableModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTable}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
