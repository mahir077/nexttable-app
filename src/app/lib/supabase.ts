import { supabase as supabaseClient } from '@/lib/supabase-client'

export const supabase = supabaseClient

export interface RestaurantSettings {
  id: string
  tenant_id: string
  display_name: string
  address?: string
  city?: string
  phone?: string
  email?: string
  vat_number?: string
  vat_rate: number
  vat_type: 'inclusive' | 'exclusive'
  primary_color: string
  secondary_color: string
  show_nexttable_branding: boolean
  invoice_footer_text?: string
  currency_code: string
  currency_symbol: string
  created_at: string
  updated_at: string
}