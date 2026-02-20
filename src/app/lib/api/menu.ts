import { supabase } from '@/lib/supabase-client'

export { supabase }

// Types
export interface Category {
  id: string
  name: string
  display_order: number
  icon: string | null
  is_active: boolean
}

export interface MenuItem {
  id: string
  category_id: string
  name: string
  name_bangla: string | null
  description: string | null
  price: number
  making_cost?: number | null
  image_url: string | null
  is_available: boolean
  is_active: boolean
  category?: Category
}

export interface CartItem extends MenuItem {
  quantity: number
  notes?: string
}

// Fetch all categories
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
  
  if (error) throw error
  return data || []
}

// Fetch menu items by category
export async function getMenuItemsByCategory(categoryId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .eq('is_available', true)
  
  if (error) throw error
  return data || []
}

// Fetch all menu items
export async function getAllMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_active', true)
    .eq('is_available', true)
  
  if (error) throw error
  return data || []
}

// Create new menu item (pass organizationId for multi-tenant)
export async function createMenuItem(
  itemData: {
    category_id: string
    name: string
    name_bangla?: string
    description?: string
    price: number
    making_cost?: number
    image_url?: string
  },
  organizationId?: string | null
) {
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      ...itemData,
      ...(organizationId && { organization_id: organizationId }),
      is_available: true,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating menu item:', error)
    return null
  }
  return data
}

// Update menu item
export async function updateMenuItem(
  itemId: string,
  updates: Partial<{
    name: string
    name_bangla: string
    description: string
    price: number
    making_cost: number
    category_id: string
    image_url: string
    is_available: boolean
  }>
) {
  const { data, error } = await supabase
    .from('menu_items')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    console.error('Error updating menu item:', error)
    return null
  }
  return data
}

// Delete menu item
export async function deleteMenuItem(itemId: string) {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Error deleting menu item:', error)
    return false
  }
  return true
}

// Toggle item availability
export async function toggleItemAvailability(itemId: string, isAvailable: boolean) {
  return updateMenuItem(itemId, { is_available: isAvailable })
}

// Create new category (pass organizationId for multi-tenant)
export async function createCategory(
  categoryData: {
    name: string
    icon?: string
    display_order: number
  },
  organizationId?: string | null
) {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      ...categoryData,
      ...(organizationId && { organization_id: organizationId }),
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating category:', error)
    return null
  }
  return data
}

// Update category
export async function updateCategory(
  categoryId: string,
  updates: Partial<{
    name: string
    icon: string
    display_order: number
  }>
) {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single()

  if (error) {
    console.error('Error updating category:', error)
    return null
  }
  return data
}

// Delete category
export async function deleteCategory(categoryId: string) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)

  if (error) {
    console.error('Error deleting category:', error)
    return false
  }
  return true
}