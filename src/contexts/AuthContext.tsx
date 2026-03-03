'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSupabase } from '@/contexts/SupabaseContext'
import { useRouter } from 'next/navigation'

interface Organization {
  id: string
  name: string
  display_name: string
}

interface AuthContextType {
  user: any
  organization: Organization | null
  organizations: Organization[]
  loading: boolean
  isSuperAdmin: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, orgName: string) => Promise<any>
  signOut: () => Promise<void>
  switchOrganization: (orgId: string) => void
  refreshOrganization: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_KEYS = {
  userId: 'auth_user_id',
  userEmail: 'auth_user_email',
  organizationId: 'current_organization_id',
  organizations: 'organizations_cache',
  restaurantInfo: 'restaurantInfo',
} as const

function clearAuthStorage() {
  if (typeof window === 'undefined') return
  Object.values(AUTH_KEYS).forEach((key) => localStorage.removeItem(key))
}

function getStoredAuth(): {
  userId: string | null
  userEmail: string | null
  organizationId: string | null
  organizations: Organization[]
  hasValidCache: boolean
} {
  if (typeof window === 'undefined') {
    return { userId: null, userEmail: null, organizationId: null, organizations: [], hasValidCache: false }
  }
  const userId = localStorage.getItem(AUTH_KEYS.userId)
  const userEmail = localStorage.getItem(AUTH_KEYS.userEmail)
  const organizationId = localStorage.getItem(AUTH_KEYS.organizationId)
  let organizations: Organization[] = []
  try {
    const raw = localStorage.getItem(AUTH_KEYS.organizations)
    if (raw) organizations = JSON.parse(raw) as Organization[]
  } catch {
    // ignore
  }
  const hasValidCache = !!(userId && organizationId && organizations.length > 0)
  return { userId, userEmail, organizationId, organizations, hasValidCache }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase()
  const [user, setUser] = useState<any>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const loadInitialSession = async () => {
      if (typeof window === 'undefined') {
        setLoading(false)
        return
      }

      const stored = getStoredAuth()
      if (stored.hasValidCache && mounted) {
        setUser({ id: stored.userId, email: stored.userEmail ?? undefined })
        const currentOrg = stored.organizations.find((o) => o.id === stored.organizationId) ?? stored.organizations[0]
        setOrganization(currentOrg ?? null)
        setOrganizations(stored.organizations)
        setLoading(false)
        // Admin check even with cache
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
          if (!mounted || error?.message?.includes('Refresh') || error?.message?.includes('JWT')) return
          if (session?.access_token) {
            const adminRes = await fetch('/api/verify-admin', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            })
            const adminData = await adminRes.json().catch(() => ({ isAdmin: false }))
            if (adminData?.isAdmin && mounted) setIsSuperAdmin(true)
            supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token! })
          }
        })
        return
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      if (!mounted) return
      if (error?.message?.includes('Refresh') || error?.message?.includes('JWT')) {
        clearAuthStorage()
        setUser(null)
        setOrganization(null)
        setOrganizations([])
        setLoading(false)
        supabase.auth.signOut().then(() => { if (typeof window !== 'undefined') window.location.href = '/login' })
        return
      }

      if (session?.user) {
        const verifyAdminUrl = `${window.location.origin}/api/verify-admin`
        const verifyAdminRes = await fetch(verifyAdminUrl, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        const adminData = await verifyAdminRes.json().catch(() => ({ isAdmin: false }))
        if (adminData?.isAdmin === true && mounted) {
          setIsSuperAdmin(true)
          setUser(session.user)
          setOrganization(null)
          setOrganizations([])
          clearAuthStorage()
          setLoading(false)
          if (!window.location.pathname.startsWith('/admin')) window.location.href = '/admin/dashboard'
          return
        }
        const verifyUserRes = await fetch(`${window.location.origin}/api/verify-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: session.access_token ?? '' }),
          credentials: 'include',
        })
        const verifyUserData = await verifyUserRes.json().catch(() => ({ isUser: false, organizationId: null, organizations: [] }))
        if (verifyUserData?.isUser && verifyUserData?.organizationId && mounted) {
          const orgId = verifyUserData.organizationId as string
          const orgsFromApi = (verifyUserData.organizations ?? []) as { id: string; name: string; display_name: string }[]
          const firstOrg = orgsFromApi[0] ?? { id: orgId, name: '', display_name: '' }
          const orgsToSet = orgsFromApi.length > 0 ? orgsFromApi : [{ id: orgId, name: firstOrg.name, display_name: firstOrg.display_name || firstOrg.name }]
          const orgToSet = { id: orgId, name: firstOrg.name, display_name: firstOrg.display_name || firstOrg.name }
          setUser(session.user)
          setOrganizations(orgsToSet)
          setOrganization(orgToSet)
          if (session.access_token && session.refresh_token) {
            await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })
          }
          localStorage.setItem(AUTH_KEYS.userId, session.user.id)
          localStorage.setItem(AUTH_KEYS.userEmail, session.user.email ?? '')
          localStorage.setItem(AUTH_KEYS.organizationId, orgId)
          localStorage.setItem(AUTH_KEYS.organizations, JSON.stringify(orgsToSet))
          localStorage.setItem(AUTH_KEYS.restaurantInfo, JSON.stringify({ name: orgToSet.display_name || orgToSet.name }))
        } else if (mounted) {
          setUser(session.user)
          setOrganization(null)
          setOrganizations([])
        }
        setLoading(false)
        return
      }

      setLoading(false)
    }

    loadInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted || event !== 'SIGNED_OUT') return
      setUser(null)
      setOrganization(null)
      setOrganizations([])
      clearAuthStorage()
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return { data, error }

    const accessToken = data.session?.access_token

    // Check if super admin first
    const adminRes = await fetch('/api/verify-admin', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    const adminData = await adminRes.json().catch(() => ({ isAdmin: false }))
    if (adminData?.isAdmin) {
      setIsSuperAdmin(true)
      setUser(data.user)
      setOrganization(null)
      setOrganizations([])
      clearAuthStorage()
      window.location.href = '/admin/dashboard'
      return { data, error: null }
    }

    let verifyRes: Response
    try {
      verifyRes = await fetch('/api/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      })
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        return { data: null, error: { message: 'Request was cancelled. Please try again.' } as unknown as Error }
      }
      throw e
    }
    const verifyData = await verifyRes.json().catch(() => ({ isUser: false, organizationId: null, organizations: [] }))

    if (!verifyData.isUser || !verifyData.organizationId) {
      await supabase.auth.signOut()
      return {
        data: null,
        error: { message: 'This account is not a restaurant user. Please use the admin login.' } as unknown as Error
      }
    }

    const orgId = verifyData.organizationId as string
    const orgsFromApi = (verifyData.organizations ?? []) as { id: string; name: string; display_name: string }[]
    const firstOrg = orgsFromApi[0] ?? { id: orgId, name: '', display_name: '' }
    const orgsToSet = orgsFromApi.length > 0 ? orgsFromApi : [{ id: orgId, name: firstOrg.name, display_name: firstOrg.display_name || firstOrg.name }]
    const orgToSet = { id: orgId, name: firstOrg.name, display_name: firstOrg.display_name || firstOrg.name }

    setUser(data.user)
    setOrganizations(orgsToSet)
    setOrganization(orgToSet)
    if (data.session?.access_token && data.session?.refresh_token) {
      await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_KEYS.userId, data.user.id)
      localStorage.setItem(AUTH_KEYS.userEmail, data.user.email ?? '')
      localStorage.setItem(AUTH_KEYS.organizationId, orgId)
      localStorage.setItem(AUTH_KEYS.organizations, JSON.stringify(orgsToSet))
      localStorage.setItem(AUTH_KEYS.restaurantInfo, JSON.stringify({ name: orgToSet.display_name || orgToSet.name }))
      if (data.session?.access_token) localStorage.setItem('sb_access_token', data.session.access_token)
      if (data.session?.refresh_token) localStorage.setItem('sb_refresh_token', data.session.refresh_token)
    }

    router.push('/dashboard')
    return { data, error: null }
  }

  const signUp = async (email: string, password: string, orgName: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError || !authData.user) {
      return { data: null, error: authError }
    }

    try {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          display_name: orgName,
          owner_id: authData.user.id,
          subscription_status: 'trial'
        })
        .select()
        .single()

      if (orgError) throw orgError

      await supabase
        .from('user_organizations')
        .insert({
          user_id: authData.user.id,
          organization_id: org.id,
          role: 'owner'
        })

      const orgToSet: Organization = {
        id: org.id,
        name: org.name,
        display_name: org.display_name ?? org.name
      }
      setUser(authData.user)
      setOrganizations([orgToSet])
      setOrganization(orgToSet)
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_KEYS.userId, authData.user.id)
        localStorage.setItem(AUTH_KEYS.userEmail, authData.user.email ?? '')
        localStorage.setItem(AUTH_KEYS.organizationId, org.id)
        localStorage.setItem(AUTH_KEYS.organizations, JSON.stringify([orgToSet]))
        localStorage.setItem(AUTH_KEYS.restaurantInfo, JSON.stringify({ name: orgToSet.display_name || orgToSet.name }))
      }
      router.push('/dashboard')
      return { data: authData, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    setUser(null)
    setOrganization(null)
    setOrganizations([])
    setIsSuperAdmin(false)
    clearAuthStorage()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb_access_token')
      localStorage.removeItem('sb_refresh_token')
      document.cookie.split(';').forEach(c => {
        const name = c.trim().split('=')[0]
        if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth')) {
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname
        }
      })
    }
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ])
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') window.location.href = '/login'
  }

  const refreshOrganization = async () => {
    if (!user?.id) return
    if (typeof window === 'undefined') return

    const savedOrgId = localStorage.getItem(AUTH_KEYS.organizationId)
    if (!savedOrgId) return

    const { data, error } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', savedOrgId)
      .single()

    if (data && !error) {
      setOrganization({
        id: data.id,
        name: data.name,
        display_name: data.name
      })
    }
  }

  const switchOrganization = (orgId: string) => {
    const newOrg = organizations.find(o => o.id === orgId)
    if (newOrg) {
      setOrganization(newOrg)
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_KEYS.organizationId, orgId)
      }
      window.location.reload()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        organizations,
        loading,
        isSuperAdmin,
        signIn,
        signUp,
        signOut,
        switchOrganization,
        refreshOrganization
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}