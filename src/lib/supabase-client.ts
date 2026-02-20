import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Helper to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Helper to get current organization
export const getCurrentOrganization = async () => {
  const { user } = await getCurrentUser()
  if (!user) return null

  if (typeof window === 'undefined') return null

  // Get saved org from localStorage
  const savedOrgId = localStorage.getItem('current_organization_id')

  if (savedOrgId) {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', savedOrgId)
      .single()

    return data
  }

  // Get first organization user belongs to
  const { data } = await supabase
    .from('user_organizations')
    .select('organization:organizations(*)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  return data?.organization || null
}

// Helper to set current organization
export const setCurrentOrganization = (orgId: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('current_organization_id', orgId)
  }
}
