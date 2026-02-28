import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let browserClient: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  // Always create singleton client
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return browserClient
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabase()
    return (client as any)[prop]
  },
})

export const getCurrentUser = async () => {
  const client = getSupabase()
  const { data: { user }, error } = await client.auth.getUser()
  return { user, error }
}