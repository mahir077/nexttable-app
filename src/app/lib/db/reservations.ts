import { supabase } from '@/lib/supabase-client'

export async function fetchPendingReservations(orgId: string) {
  return supabase
    .from('reservations')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .order('reserved_at', { ascending: true })
}

export interface NewReservationPayload {
  date: string
  time: string
  table_id: string
  guest_name: string
  guest_phone: string | null
  guest_count: number | null
  special_requests: string | null
  status: string
  organization_id?: string
}

export async function createReservation(payload: NewReservationPayload) {
  const reserved_at = `${payload.date}T${payload.time}:00`
  
  return supabase.from('reservations').insert({
    organization_id: payload.organization_id,
    table_id: payload.table_id,
    customer_name: payload.guest_name,
    customer_phone: payload.guest_phone,
    party_size: payload.guest_count,
    reserved_at: reserved_at,
    status: payload.status,
    notes: payload.special_requests,
  })
}

export async function markReservationArrived(
  orgId: string,
  reservationId: string,
  tableId: string
) {
  const tableUpdate = supabase
    .from('tables')
    .update({ status: 'occupied' })
    .eq('id', tableId)
    .eq('organization_id', orgId)

  const reservationUpdate = supabase
    .from('reservations')
    .update({ status: 'arrived' })
    .eq('id', reservationId)
    .eq('organization_id', orgId)

  const [tableResult, reservationResult] = await Promise.all([
    tableUpdate,
    reservationUpdate,
  ])

  return { tableResult, reservationResult }
}

export async function cancelReservationById(orgId: string, reservationId: string) {
  return supabase
    .from('reservations')
    .delete()
    .eq('id', reservationId)
    .eq('organization_id', orgId)
}