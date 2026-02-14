'use client'

import { useState, useEffect } from 'react'
import { 
  getCategories, 
  getAllMenuItems, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem,
  toggleItemAvailability,
  Category, 
  MenuItem 
} from '@/app/lib/api/menu'

export default function MenuManagementPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    name_bangla: '',
    description: '',
    price: '',
    category_id: '',
    image_url: ''
  })

  // Fetch data
  const fetchData = async () => {
    try {
      const [categoriesData, itemsData] = await Promise.all([
        getCategories(),
        getAllMenuItems()
      ])
      setCategories(categoriesData)
      setMenuItems(itemsData)
      if (categoriesData.length > 0 && !formData.category_id) {
        setFormData(prev => ({ ...prev, category_id: categoriesData[0].id }))
      }
    } catch (error) {
      console.error('Error fetching categories and menu items:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter items
  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category_id === selectedCategory)

  // Handle add/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const itemData = {
      ...formData,
      price: parseFloat(formData.price)
    }

    let success = false
    if (editingItem) {
      const result = await updateMenuItem(editingItem.id, itemData)
      success = !!result
    } else {
      const result = await createMenuItem(itemData)
      success = !!result
    }

    if (success) {
      alert(editingItem ? '✅ Item updated!' : '✅ Item added!')
      setShowAddModal(false)
      setEditingItem(null)
      resetForm()
      fetchData()
    } else {
      alert('❌ Failed to save item')
    }
  }

  // Handle delete
  const handleDelete = async (itemId: string, itemName: string) => {
    if (!confirm(`Delete "${itemName}"?`)) return
    
    const success = await deleteMenuItem(itemId)
    if (success) {
      alert('✅ Item deleted!')
      fetchData()
    } else {
      alert('❌ Failed to delete item')
    }
  }

  // Handle availability toggle
  const handleToggleAvailability = async (item: MenuItem) => {
    const newAvailability = !item.is_available
    const result = await toggleItemAvailability(item.id, newAvailability)
    
    if (result) {
      setMenuItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, is_available: newAvailability } : i
      ))
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      name_bangla: '',
      description: '',
      price: '',
      category_id: categories[0]?.id || '',
      image_url: ''
    })
  }

  // Open edit modal
  const openEditModal = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      name_bangla: item.name_bangla || '',
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id,
      image_url: item.image_url || ''
    })
    setShowAddModal(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-brand font-black text-slate-900">🍽️ MENU MANAGEMENT</h1>
          <button
            onClick={() => {
              resetForm()
              setEditingItem(null)
              setShowAddModal(true)
            }}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
          >
            ➕ Add New Item
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
            <div className="text-sm text-slate-500 mb-1">TOTAL ITEMS</div>
            <div className="text-3xl font-brand font-black text-slate-900">{menuItems.length}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
            <div className="text-sm text-slate-500 mb-1">AVAILABLE</div>
            <div className="text-3xl font-brand font-black text-emerald-600">
              {menuItems.filter(i => i.is_available).length}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
            <div className="text-sm text-slate-500 mb-1">OUT OF STOCK</div>
            <div className="text-3xl font-brand font-black text-rose-600">
              {menuItems.filter(i => !i.is_available).length}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300'
            }`}
          >
            ALL ITEMS ({menuItems.length})
          </button>
          {categories.map(category => {
            const count = menuItems.filter(i => i.category_id === category.id).length
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300'
                }`}
              >
                {category.icon} {category.name.toUpperCase()} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl text-slate-500">Loading menu...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <div className="text-8xl mb-4">🍽️</div>
          <p className="text-2xl font-bold">No items in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Image */}
              <div className="aspect-square bg-slate-100 flex items-center justify-center text-6xl">
                {item.category?.icon || '🍽️'}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 line-clamp-1">{item.name}</h3>
                    {item.name_bangla && (
                      <p className="text-xs text-slate-500 line-clamp-1">{item.name_bangla}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${
                      item.is_available
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {item.is_available ? 'IN STOCK' : 'OUT'}
                  </button>
                </div>

                <div className="text-2xl font-brand font-black text-emerald-600 mb-4">
                  ৳{item.price.toFixed(2)}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-brand font-black text-slate-900 mb-6">
              {editingItem ? '✏️ Edit Item' : '➕ Add New Item'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Item Name (English)*</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., Classic Burger"
                />
              </div>

              {/* Item Name Bangla */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Item Name (Bangla)</label>
                <input
                  type="text"
                  value={formData.name_bangla}
                  onChange={(e) => setFormData({ ...formData, name_bangla: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., ক্লাসিক বার্গার"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category*</label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Price (৳)*</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., 250.00"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                  placeholder="Optional description..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingItem(null)
                    resetForm()
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
                >
                  {editingItem ? '💾 Save Changes' : '➕ Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
