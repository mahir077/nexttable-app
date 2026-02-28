'use client'

import { createContext, useContext, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase-client'

const SupabaseContext = createContext<SupabaseClient | null>(null)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => {
    const client = getSupabase()
    if (!client) {
      throw new Error('Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY at build time.')
    }
    return client
  }, [])

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const client = useContext(SupabaseContext)
  if (client === null) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return client
}