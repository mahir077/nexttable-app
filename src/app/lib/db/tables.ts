import { supabase } from '@/lib/supabase-client'

// Tables + floors helpers shared across POS, dashboard, reservations and settings.

export async function getTableStatus(
  orgId: string,
  tableId: string
) {
  return supabase
    .from('tables')
    .select('status')
    .eq('id', tableId)
    .eq('organization_id', orgId)
    .single<{ status: string }>()
}

export async function updateTableStatus(
  orgId: string,
  tableId: string,
  status: string
) {
  return supabase
    .from('tables')
    .update({ status })
    .eq('id', tableId)
    .eq('organization_id', orgId)
}

export async function setTablesAvailable(
  orgId: string,
  tableIds: string[]
) {
  if (!tableIds.length) {
    return { data: null, error: null }
  }

  return supabase
    .from('tables')
    .update({ status: 'available' })
    .eq('organization_id', orgId)
    .in('id', tableIds)
}

// Floors (mostly used from Settings)

export async function fetchFloorsForOrg(orgId: string) {
  return supabase
    .from('floors')
    .select('*')
    .order('name')
    .eq('organization_id', orgId)
}

export async function createFloor(orgId: string, name: string, displayOrder: number) {
  return supabase
    .from('floors')
    .insert({
      name,
      is_active: true,
      organization_id: orgId,
      display_order: displayOrder,
    })
    .select('*')
    .single()
}

export async function updateFloorName(
  orgId: string,
  floorId: string,
  name: string
) {
  return supabase
    .from('floors')
    .update({ name })
    .eq('id', floorId)
    .eq('organization_id', orgId)
}

export async function deleteFloorById(
  orgId: string,
  floorId: string
) {
  return supabase
    .from('floors')
    .delete()
    .eq('id', floorId)
    .eq('organization_id', orgId)
}

// Tables CRUD for Settings

export async function createTable(
  orgId: string,
  floorId: string,
  tableNumber: string,
  seats: number
) {
  return supabase
    .from('tables')
    .insert({
      floor_id: floorId,
      table_number: tableNumber,
      seats,
      status: 'available',
      is_active: true,
      organization_id: orgId,
    })
    .select(
      `
        *,
        floor:floors(*)
      `
    )
    .single()
}

export async function updateTable(
  tableId: string,
  fields: { table_number: string; seats: number }
) {
  return supabase
    .from('tables')
    .update({
      table_number: fields.table_number,
      seats: fields.seats,
    })
    .eq('id', tableId)
}

export async function deleteTable(tableId: string) {
  return supabase
    .from('tables')
    .delete()
    .eq('id', tableId)
}

