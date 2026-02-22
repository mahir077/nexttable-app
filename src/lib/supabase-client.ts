import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let browserClient: SupabaseClient | null = null

export function setSupabaseClient(client: SupabaseClient) {
  browserClient = client
}

function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'In Next.js these are inlined at BUILD time. On Netlify, set them in Site settings → Environment variables and ensure they apply to Build (not only Deploy/Runtime).'
    )
    return null
  }
  if (!browserClient) {
    // Don't pass storage: @supabase/ssr uses cookies. Middleware reads cookies for session.
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
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
