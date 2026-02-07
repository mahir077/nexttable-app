import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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