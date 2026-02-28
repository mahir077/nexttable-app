'use client'

import { useState, useEffect } from 'react'
import { ensureSession } from '@/lib/supabase-client'
import {
  supabase,
  getCategories,
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  createCategory,
  updateCategory,
  deleteCategory,
  Category,
  MenuItem,
} from '@/app/lib/api/menu'
import BackButton from '@/components/BackButton'
import Toast from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'

export default function MenuManagementPage() {
  const { organization } = useAuth()
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
    making_cost: '0',
    category_id: '',
    image_url: ''
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('🍽️')
  const [newCategory, setNewCategory] = useState('')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [editCategoryIcon, setEditCategoryIcon] = useState('🍽️')

  const { toast, showToast, hideToast } = useToast()

  const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)

  // Fetch data (categories + items scoped to current org)
  const fetchData = async () => {
    await ensureSession()
    const organizationId =
      organization?.id ??
      (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)
    if (!organizationId || organizationId === '') return
    try {
      const [categoriesData, itemsData] = await Promise.all([
        getCategories(organizationId),
        getAllMenuItems(organizationId)
      ])
      setCategories(categoriesData)
      setMenuItems(itemsData)
      if (categoriesData.length > 0 && !formData.category_id) {
        setFormData(prev => ({ ...prev, category_id: categoriesData[0].id }))
      }
    } catch (error: any) {
      console.error('Menu fetch error:', JSON.stringify(error), error?.message, error?.code, error?.details)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    const currentOrgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)
    if (!currentOrgId) return
    try {
      const data = await getCategories(currentOrgId)
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  useEffect(() => {
    if (orgId) {
      fetchData()
      fetchCategories()
    } else {
      setLoading(false)
    }
  }, [orgId])

  // Filter items
  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category_id === selectedCategory)

  // Handle add/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let imageUrl: string | null = formData.image_url || null
    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile)
      } catch (err) {
        console.error('Image upload failed:', err)
        showToast('Image upload failed. Try again.', 'error')
        return
      }
    }

    const itemData = {
      ...formData,
      price: parseFloat(formData.price),
      making_cost: formData.making_cost ? parseFloat(formData.making_cost) : 0,
      image_url: imageUrl || undefined
    }

    const orgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)

    let success = false
    if (editingItem) {
      const result = await updateMenuItem(editingItem.id, { ...itemData, image_url: imageUrl ?? undefined })
      success = !!result
    } else {
      if (!orgId) {
        showToast('No organization selected. Please refresh and try again.', 'error')
        return
      }
      const result = await createMenuItem({ ...itemData, image_url: imageUrl ?? undefined }, orgId)
      if (result?.error) {
        const msg = result.error.message || result.error.code || 'Failed to create item'
        showToast(msg, 'error')
        return
      }
      success = !!result?.data
    }

    if (success) {
      setShowAddModal(false)
      setEditingItem(null)
      resetForm()
      fetchData()
      setSuccessMessage(editingItem ? 'Item updated!' : 'Item added!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      showToast('Failed to save item', 'error')
    }
  }

  // Handle delete
  const handleDelete = async (itemId: string, itemName: string) => {
    if (!confirm(`Delete "${itemName}"?`)) return
    
    const success = await deleteMenuItem(itemId)
    if (success) {
      showToast('Item deleted!', 'success')
      fetchData()
    } else {
      showToast('Failed to delete item', 'error')
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`
    const filePath = `menu-images/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      name_bangla: '',
      description: '',
      price: '',
      making_cost: '0',
      category_id: categories[0]?.id || '',
      image_url: ''
    })
    setImageFile(null)
    setImagePreview(null)
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) {
      showToast('Category name required', 'error')
      return
    }
    if (!orgId) {
      showToast('No organization selected. Please refresh and try again.', 'error')
      return
    }
    const created = await createCategory({
      name: newCategoryName.trim(),
      icon: newCategoryIcon || undefined,
      display_order: categories.length
    }, orgId)
    if (created) {
      setShowCategoryModal(false)
      setNewCategoryName('')
      setNewCategoryIcon('🍽️')
      setSuccessMessage('Category added!')
      setTimeout(() => setSuccessMessage(null), 3000)
      fetchData()
      fetchCategories()
    } else {
      showToast('Failed to add category', 'error')
    }
  }

  const handleAddCategoryInline = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newCategory.trim()
    if (!name) return
    const currentOrgId = organization?.id ?? (typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null)
    if (!currentOrgId) {
      showToast('No organization selected. Please refresh and try again.', 'error')
      return
    }
    const created = await createCategory(
      {
        name,
        display_order: categories.length,
      },
      currentOrgId
    )
    if (created) {
      setNewCategory('')
      setShowCategoryForm(false)
      fetchCategories()
      fetchData()
      setSuccessMessage('Category added!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      showToast('Failed to add category', 'error')
    }
  }

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat)
    setEditCategoryName(cat.name)
    setEditCategoryIcon(cat.icon ?? '🍽️')
  }

  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory || !editCategoryName.trim()) return
    const updated = await updateCategory(editingCategory.id, {
      name: editCategoryName.trim(),
      icon: editCategoryIcon || undefined
    })
    if (updated) {
      setEditingCategory(null)
      fetchCategories()
      fetchData()
      setSuccessMessage('Category updated!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      showToast('Failed to update category', 'error')
    }
  }

  const handleDeleteCategory = async (cat: Category) => {
    const count = menuItems.filter(i => i.category_id === cat.id).length
    if (count > 0) {
      showToast(`Cannot delete: ${count} item(s) in this category. Move or delete them first.`, 'error')
      return
    }
    if (!window.confirm(`Delete category "${cat.name}"?`)) return
    const ok = await deleteCategory(cat.id)
    if (ok) {
      if (selectedCategory === cat.id) setSelectedCategory('all')
      fetchCategories()
      fetchData()
      setSuccessMessage('Category deleted!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      showToast('Failed to delete category', 'error')
    }
  }

  // Open edit modal
  const openEditModal = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      name_bangla: item.name_bangla || '',
      description: item.description || '',
      price: item.price.toString(),
      making_cost: item.making_cost != null ? String(item.making_cost) : '0',
      category_id: item.category_id,
      image_url: item.image_url || ''
    })
    setImageFile(null)
    setImagePreview(item.image_url || null)
    setShowAddModal(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6 relative">
      {/* Success toast */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold shadow-lg animate-in fade-in duration-200">
          ✅ {successMessage}
        </div>
      )}
      {/* Header */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-3xl lg:text-4xl font-brand font-black text-slate-900">🍽️ MENU</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm()
            setEditingItem(null)
            setShowAddModal(true)
          }}
          className="w-full lg:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition-colors"
        >
          + Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

      {/* Category Filter + Add Category */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2 overflow-x-auto pb-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300'
              }`}
            >
              ALL ({menuItems.length})
            </button>
            {categories.map(category => {
            const count = menuItems.filter(i => i.category_id === category.id).length
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300'
                }`}
              >
                {category.icon} {category.name} ({count})
              </button>
            )
          })}
          </div>
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm whitespace-nowrap"
          >
            + Add Category
          </button>
        </div>
      </div>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCategoryModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Drinks"
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Icon (emoji)</label>
                <input
                  type="text"
                  value={newCategoryIcon}
                  onChange={e => setNewCategoryIcon(e.target.value)}
                  placeholder="🍽️"
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingCategory(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Category</h3>
            <form onSubmit={handleSaveEditCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={e => setEditCategoryName(e.target.value)}
                  placeholder="e.g. Drinks"
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Icon (emoji)</label>
                <input
                  type="text"
                  value={editCategoryIcon}
                  onChange={e => setEditCategoryIcon(e.target.value)}
                  placeholder="🍽️"
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingCategory(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category management - before items */}
      <div className="bg-white rounded-xl p-4 border-2 border-slate-200 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg text-slate-900">Categories</h2>
          <button
            type="button"
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors"
          >
            + Add Category
          </button>
        </div>

        {showCategoryForm && (
          <form onSubmit={handleAddCategoryInline} className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="Category name"
              required
              className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition-colors">
              Add
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-800">
              {cat.icon && <span className="mr-0.5">{cat.icon}</span>}
              <span>{cat.name}</span>
              <button
                type="button"
                onClick={() => openEditCategoryModal(cat)}
                className="ml-1 p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-800"
                title="Edit category"
                aria-label="Edit category"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCategory(cat)}
                className="p-1 rounded hover:bg-red-100 text-slate-500 hover:text-red-600"
                title="Delete category"
                aria-label="Delete category"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md transition-shadow"
            >
              {/* Image - smaller */}
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-24 object-cover rounded-md mb-2" />
              ) : (
                <div className="w-full h-24 bg-slate-100 rounded-md mb-2 flex items-center justify-center text-2xl">
                  {item.category?.icon || '🍽️'}
                </div>
              )}

              {/* Compact info */}
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 line-clamp-1">{item.name}</div>
                  {item.name_bangla && (
                    <div className="text-xs text-slate-500 line-clamp-1">{item.name_bangla}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleAvailability(item)}
                  className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    item.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                  title={item.is_available ? 'In stock' : 'Out of stock'}
                >
                  {item.is_available ? '✓' : 'OUT'}
                </button>
              </div>
              <div className="text-emerald-600 font-bold text-sm mt-1">৳{item.price.toFixed(0)}</div>

              {/* Action buttons - horizontal */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-blue-500 bg-white text-blue-600 hover:bg-blue-50 text-[11px] font-semibold transition-colors shadow-sm"
                >
                  ✏️ <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.name)}
                  className="w-8 inline-flex items-center justify-center rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-bold transition-colors shadow-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl lg:text-3xl font-brand font-black text-slate-900 mb-6">
              {editingItem ? '✏️ Edit Item' : '➕ Add New Item'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Item Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Item Name (English)*</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
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
                    className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
                    placeholder="e.g., ক্লাসিক বার্গার"
                  />
                </div>

                {/* Item Image - full width */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Item Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-lg text-slate-900"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-32 w-32 object-cover rounded-lg border-2 border-slate-200"
                      />
                    </div>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Category*</label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
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
                    className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
                    placeholder="e.g., 250.00"
                  />
                </div>

                {/* Making Cost */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Making Cost (৳)
                  </label>
                  <input
                    type="number"
                    value={formData.making_cost}
                    onChange={(e) => setFormData({ ...formData, making_cost: e.target.value })}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                    placeholder="0.00"
                  />
                  {formData.price && formData.making_cost && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Profit: ৳{(parseFloat(formData.price) - parseFloat(formData.making_cost)).toFixed(2)}
                      {' '}
                      ({(((parseFloat(formData.price) - parseFloat(formData.making_cost)) / parseFloat(formData.price)) * 100).toFixed(1)}% margin)
                    </p>
                  )}
                </div>

                {/* Description - full width */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900 placeholder:text-slate-400 resize-none"
                    placeholder="Optional description..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
