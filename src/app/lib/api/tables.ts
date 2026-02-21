import { supabase } from '@/lib/supabase-client'

export { supabase }

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
  location?: string
}

// Fetch floors (optionally scoped to organization)
export async function getFloors(organizationId?: string | null): Promise<Floor[]> {
  let query = supabase
    .from('floors')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Fetch tables by floor (organizationId required for multi-tenant)
export async function getTablesByFloor(floorId: string, organizationId: string): Promise<Table[]> {
  const { data, error } = await supabase
    .from('tables')
    .select(`
      *,
      floor:floors(*)
    `)
    .eq('floor_id', floorId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('table_number')
  
  if (error) throw error
  return data || []
}

// Fetch all tables (organizationId required for multi-tenant)
export async function getAllTables(organizationId: string): Promise<Table[]> {
  const { data, error } = await supabase
    .from('tables')
    .select(`
      *,
      floor:floors(*)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('table_number')
  
  if (error) throw error
  return data || []
}
