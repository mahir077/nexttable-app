import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

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