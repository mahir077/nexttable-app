import { supabase, ensureSession } from '@/lib/supabase-client'

export { supabase }

// Types
export interface Category {
  id: string
  name: string
  display_order: number
  icon?: string | null
  is_active: boolean
}

export interface MenuItem {
  id: string
  category_id: string
  name: string
  name_bangla: string | null
  description: string | null
  price: number
  cost?: number | null        // ← এটা add করো
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

// Fetch categories (optionally scoped to organization). Columns: id, organization_id, name, display_order, is_active, created_at, updated_at, deleted_at
export async function getCategories(organizationId?: string | null): Promise<Category[]> {
  console.log('[getCategories] organizationId:', organizationId)
  let query = supabase
    .from('categories')
    .select('id, organization_id, name, display_order, is_active, created_at, updated_at, deleted_at')
    .eq('is_active', true)
    .order('display_order')
  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }
  const { data, error } = await query
  if (error) {
    console.error('[getCategories] error:', JSON.stringify(error), error?.message, error?.code, error?.details)
    throw error
  }
  return data || []
}

// Fetch menu items by category (organizationId required for multi-tenant)
export async function getMenuItemsByCategory(categoryId: string, organizationId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('category_id', categoryId)
    .eq('organization_id', organizationId)
    .eq('is_available', true)
  
  if (error) throw error
  return data || []
}

// Fetch all menu items (organizationId required for multi-tenant)
export async function getAllMenuItems(organizationId: string): Promise<MenuItem[]> {
  console.log('[getAllMenuItems] organizationId:', organizationId)
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('organization_id', organizationId)
    .eq('is_available', true)
  
  if (error) {
    console.error('[getAllMenuItems] error:', JSON.stringify(error), error?.message, error?.code, error?.details)
    throw error
  }
  return data || []
}

// Create new menu item. Columns: id, organization_id, category_id, name, description, price, cost, is_available, display_order, image_url, created_at, updated_at, deleted_at
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
  await ensureSession()
  const insert: Record<string, unknown> = {
    category_id: itemData.category_id,
    name: itemData.name,
    price: Number(itemData.price),
    is_available: true,
    ...(organizationId && { organization_id: organizationId }),
    ...(itemData.description != null && itemData.description !== '' && { description: itemData.description }),
    ...(itemData.image_url != null && itemData.image_url !== '' && { image_url: itemData.image_url }),
    ...(typeof itemData.making_cost === 'number' && !Number.isNaN(itemData.making_cost) && { cost: itemData.making_cost }),
  }

  const { data, error } = await supabase
    .from('menu_items')
    .insert(insert)
    .select()
    .single()

  if (error) {
    console.error('Error creating menu item:', error)
    return { data: null, error }
  }
  return { data, error: null }
}

// Update menu item (only columns that exist: name, description, price, cost, category_id, image_url, is_available, display_order, updated_at)
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
    display_order: number
  }>
) {
  await ensureSession()
  const allowed: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.name !== undefined) allowed.name = updates.name
  if (updates.description !== undefined) allowed.description = updates.description
  if (updates.price !== undefined) allowed.price = updates.price
  if (updates.making_cost !== undefined) allowed.cost = updates.making_cost
  if (updates.category_id !== undefined) allowed.category_id = updates.category_id
  if (updates.image_url !== undefined) allowed.image_url = updates.image_url
  if (updates.is_available !== undefined) allowed.is_available = updates.is_available
  if (updates.display_order !== undefined) allowed.display_order = updates.display_order
  const { data, error } = await supabase
    .from('menu_items')
    .update(allowed)
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
  await ensureSession()
  const { error } = await supabase
    .from('menu_items')
    .update({ 
      deleted_at: new Date().toISOString(),
      is_available: false 
    })
    .eq('id', itemId)

  if (error) {
    console.error('Error deleting menu item:', JSON.stringify(error), error)
    return false
  }
  return true
}

// Toggle item availability
export async function toggleItemAvailability(itemId: string, isAvailable: boolean) {
  return updateMenuItem(itemId, { is_available: isAvailable })
}

// Create new category (pass organizationId for multi-tenant). Columns: id, organization_id, name, display_order, is_active, created_at, updated_at, deleted_at
export async function createCategory(
  categoryData: {
    name: string
    icon?: string
    display_order: number
  },
  organizationId?: string | null
) {
  await ensureSession()
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: categoryData.name,
      display_order: categoryData.display_order,
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

// Update category (only columns that exist: name, display_order; id/organization_id/is_active/created_at/updated_at/deleted_at)
export async function updateCategory(
  categoryId: string,
  updates: Partial<{
    name: string
    icon: string
    display_order: number
  }>
) {
  await ensureSession()
  const allowed: Record<string, unknown> = {}
  if (updates.name !== undefined) allowed.name = updates.name
  if (updates.display_order !== undefined) allowed.display_order = updates.display_order
  const { data, error } = await supabase
    .from('categories')
    .update(allowed)
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
  await ensureSession()
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