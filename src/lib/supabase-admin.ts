import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client with service role key.
 * Bypasses RLS - use only in API routes (app/api/*), never in client components.
 * Never expose this client or SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
function getSupabaseAdmin(): SupabaseClient | null {
  if (typeof window !== 'undefined') {
    console.error('[supabase-admin] Must not be imported in client components. Use only in API routes (app/api/*).')
    return null
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export const supabaseAdmin = getSupabaseAdmin()
