import { supabase } from '@/lib/supabase-client'

export async function fetchPendingReservations(orgId: string) {
  return supabase
    .from('reservations')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .order('date', { ascending: true })
    .order('time', { ascending: true })
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
  return supabase.from('reservations').insert(payload)
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

