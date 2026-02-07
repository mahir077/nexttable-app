import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types
export interface Floor {
  id: string
  name: string
  display_order: number
  is_active: boolean
}

export interface Table {
  id: string
  floor_id: string
  table_number: number
  seats: number
  status: 'available' | 'occupied' | 'reserved' | 'billing'
  is_active: boolean
  floor?: Floor
}

// Fetch all floors
export async function getFloors(): Promise<Floor[]> {
  const { data, error } = await supabase
    .from('floors')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
  
  if (error) throw error
  return data || []
}

// Fetch tables by floor
export async function getTablesByFloor(floorId: string): Promise<Table[]> {
  const { data, error } = await supabase
    .from('tables')
    .select(`
      *,
      floor:floors(*)
    `)
    .eq('floor_id', floorId)
    .eq('is_active', true)
    .order('table_number')
  
  if (error) throw error
  return data || []
}

// Fetch all tables
export async function getAllTables(): Promise<Table[]> {
  const { data, error } = await supabase
    .from('tables')
    .select(`
      *,
      floor:floors(*)
    `)
    .eq('is_active', true)
    .order('table_number')
  
  if (error) throw error
  return data || []
}
