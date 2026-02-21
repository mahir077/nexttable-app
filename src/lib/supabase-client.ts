import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let browserClient: SupabaseClient | null = null

export function setSupabaseClient(client: SupabaseClient) {
  browserClient = client
}

function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: window.localStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    })
  }
  return browserClient
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabase()
    if (!client) return undefined
    return (client as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const getCurrentUser = async () => {
  const client = getSupabase()
  if (!client) return { user: null, error: new Error('Supabase client not available') }
  const { data: { user }, error } = await client.auth.getUser()
  return { user, error }
}
