import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let browserClient: SupabaseClient | null = null

/** Called by SupabaseProvider on mount so the same client is used app-wide. */
export function setSupabaseClient(client: SupabaseClient) {
  browserClient = client
}

/** Get the Supabase client. Only available in the browser; creates one on first use if needed. */
function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return browserClient
}

/**
 * Supabase client for use in Client Components.
 * Use this after SupabaseProvider has mounted (e.g. in useEffect or event handlers).
 * For React components, prefer useSupabase() from SupabaseContext when possible.
 */
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
