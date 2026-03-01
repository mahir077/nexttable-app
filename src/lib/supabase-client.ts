import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let browserClient: SupabaseClient

export function getSupabase(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'nexttable',
        },
      },
    })
    browserClient.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session?.access_token && session?.refresh_token) {
        browserClient.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })
      }
    })
  }
  return browserClient
}

export async function ensureSession() {
  const client = getSupabase()
  const { data: { session } } = await client.auth.getSession()
  if (session?.access_token) return session

  const access_token = typeof window !== 'undefined' ? localStorage.getItem('sb_access_token') : null
  const refresh_token = typeof window !== 'undefined' ? localStorage.getItem('sb_refresh_token') : null
  if (access_token && refresh_token) {
    const { data } = await client.auth.setSession({ access_token, refresh_token })
    return data.session
  }
  return null
}

export const supabase = getSupabase()