import { supabase } from '@/lib/supabase-client'

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

// Fetch floors (organizationId required for multi-tenant security)
export async function getFloors(organizationId: string): Promise<Floor[]> {
  if (typeof window !== 'undefined') {
    console.log('[getFloors] start', { organizationId })
  }
  const { data, error } = await supabase
    .from('floors')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('display_order')
  if (typeof window !== 'undefined') {
    console.log('[getFloors] done', { count: data?.length ?? 0, error: error?.message ?? null })
  }
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
