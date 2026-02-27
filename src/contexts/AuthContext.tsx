'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSupabase } from '@/contexts/SupabaseContext'
import { fetchOrganizationById } from '@/app/lib/db/org'
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

function getInitialOrganizationFromStorage(): Organization | null {
  if (typeof window === 'undefined') return null
  const id = localStorage.getItem('current_organization_id')
  if (!id) return null
  return {
    id,
    name: '',
    display_name: ''
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase()
  const [user, setUser] = useState<any>(null)
  const [organization, setOrganization] = useState<Organization | null>(getInitialOrganizationFromStorage)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const applySession = async (session: { user: { id: string } } | null) => {
      if (!session?.user) {
        setUser(null)
        setOrganization(null)
        setOrganizations([])
        setIsSuperAdmin(false)
        setLoading(false)
        return
      }
      setUser(session.user)
      try {
        // First check if this user is a super admin.
        const { data: adminData, error: adminError } = await supabase
          .from('super_admins')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle()

        const isAdmin = !!adminData && !adminError
        setIsSuperAdmin(isAdmin)

        if (isAdmin) {
          // Super admins never have an organization context on the client.
          setOrganization(null)
          setOrganizations([])
          if (typeof window !== 'undefined') {
            localStorage.removeItem('current_organization_id')
            localStorage.removeItem('restaurantInfo')
            const path = window.location.pathname
            if (!path.startsWith('/admin')) {
              window.location.href = '/admin/dashboard'
            }
          }
          setLoading(false)
          return
        }

        // Non-admin: load tenant organizations as before.
        await loadOrganizations(session.user.id)
      } catch (e) {
        if (mounted) setLoading(false)
      }
    }

    // Initial load: use getUser() so session is validated with server
    const loadInitialSession = async (retry = false) => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!mounted) return
      if (error?.message?.includes('Refresh') || error?.message?.includes('JWT')) {
        supabase.auth.signOut().then(() => {
          if (typeof window !== 'undefined') window.location.href = '/login'
        })
        return
      }
      if (user) {
        await applySession({ user } as { user: { id: string } })
        return
      }
      // Cookie might not be ready on first paint; retry once
      if (!retry && typeof window !== 'undefined') {
        setTimeout(() => loadInitialSession(true), 400)
      } else {
        setOrganization(null)
        setLoading(false)
      }
    }
    loadInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            await applySession(session)
          } else if (event === 'INITIAL_SESSION' && session?.user) {
            await applySession(session)
          } else if (event === 'SIGNED_OUT' || !session) {
            setUser(null)
            setOrganization(null)
            setOrganizations([])
            if (typeof window !== 'undefined') {
              localStorage.removeItem('current_organization_id')
              localStorage.removeItem('restaurantInfo')
            }
            setLoading(false)
          }
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') return
          if (mounted) setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // When user exists but organization is null (e.g. loadOrganizations failed after redirect), restore from localStorage
  useEffect(() => {
    if (!user || organization || typeof window === 'undefined') return
    const savedId = localStorage.getItem('current_organization_id')
    if (!savedId) return
    let cancelled = false
    fetchOrganizationById(savedId).then(({ data: orgRow, error }) => {
        if (cancelled || error || !orgRow) return
        setOrganization({
          id: orgRow.id,
          name: orgRow.name,
          display_name: orgRow.display_name || orgRow.name
        })
        setOrganizations([{
          id: orgRow.id,
          name: orgRow.name,
          display_name: orgRow.display_name || orgRow.name
        }])
      })
    return () => { cancelled = true }
  }, [user, organization])

  const loadOrganizations = async (userId: string): Promise<string | null> => {
    const log = (msg: string, extra?: unknown) => {
      if (typeof window !== 'undefined') {
        console.log('[loadOrganizations]', msg, extra ?? '')
      }
    }
    const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    try {
      log('start', { userId })
      // Verify session before querying
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      log('getUser result', { hasUser: !!currentUser, userId: currentUser?.id ?? null })
      if (!currentUser) {
        setLoading(false)
        log('early return: no currentUser')
        return null
      }

      const result = await Promise.race([
        supabase
          .from('user_organizations')
          .select(`
            organization_id,
            role,
            organizations (
              id,
              name,
              display_name
            )
          `)
          .eq('user_id', currentUser.id),
        timeout(12000)
      ]) as { data: unknown; error: { message?: string } | null }

      const { data, error } = result
      log('user_organizations query', { error: error?.message ?? null, rowCount: Array.isArray(data) ? data.length : 0 })

      if (error) {
        setLoading(false)
        if (typeof window !== 'undefined') {
          const savedId = localStorage.getItem('current_organization_id')
          if (savedId) {
            const { data: orgRow } = await fetchOrganizationById(savedId)
            if (orgRow) {
              setOrganization({ id: orgRow.id, name: orgRow.name, display_name: orgRow.display_name || orgRow.name })
              setOrganizations([{ id: orgRow.id, name: orgRow.name, display_name: orgRow.display_name || orgRow.name }])
            } else {
              // Stale org id – clear it so dashboards/settings don't keep querying with an invalid organization
              localStorage.removeItem('current_organization_id')
            }
          }
        }
        log('early return: query error')
        return null
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        setOrganizations([])
        setOrganization(null)
        setLoading(false)
        // Fallback: restore org from localStorage if we had it before (e.g. after refresh when query failed)
        if (typeof window !== 'undefined') {
          const savedId = localStorage.getItem('current_organization_id')
          if (savedId) {
            const { data: orgRow } = await fetchOrganizationById(savedId)
            if (orgRow) {
              setOrganization({
                id: orgRow.id,
                name: orgRow.name,
                display_name: orgRow.display_name || orgRow.name
              })
              setOrganizations([{ id: orgRow.id, name: orgRow.name, display_name: orgRow.display_name || orgRow.name }])
            } else {
              // Stale org id – clear it so that empty tenants don't keep causing RLS/permission noise
              localStorage.removeItem('current_organization_id')
            }
          }
        }
        log('early return: no data or empty')
        return null
      }

      type OrgShape = { name: string; display_name?: string }
      const rows = data as unknown as Array<{ organization_id: string; organizations: OrgShape | OrgShape[] | null }>
      const orgs: Organization[] = rows
        .filter((uo) => uo.organizations)
        .map((uo) => {
          const raw = uo.organizations
          const org = Array.isArray(raw) ? raw[0] : raw
          if (!org) return null
          return {
            id: uo.organization_id,
            name: org.name,
            display_name: org.display_name || org.name
          }
        })
        .filter((o): o is Organization => o != null)

      setOrganizations(orgs)
      const currentOrg = orgs[0]
      setOrganization(currentOrg)
      if (typeof window !== 'undefined' && currentOrg?.id) {
        localStorage.setItem('current_organization_id', currentOrg.id)
        log('localStorage.setItem', { orgId: currentOrg.id })
      }
      return currentOrg?.id ?? null
    } catch (e) {
      log('catch', { error: e })
        if (typeof window !== 'undefined') {
          const savedId = localStorage.getItem('current_organization_id')
          if (savedId) {
            try {
              const { data: orgRow } = await fetchOrganizationById(savedId)
              if (orgRow) {
                setOrganization({ id: orgRow.id, name: orgRow.name, display_name: orgRow.display_name || orgRow.name })
                setOrganizations([{ id: orgRow.id, name: orgRow.name, display_name: orgRow.display_name || orgRow.name }])
              }
            } catch { /* ignore */ }
          }
        }
      return null
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const log = (msg: string, extra?: unknown) => {
      if (typeof window !== 'undefined') {
        console.log('[signIn]', msg, extra ?? '')
      }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error || !data.user) {
      return { data, error }
    }

    log('signInWithPassword success', { userId: data.user.id })

    // Restaurant login must only allow users that exist in the app-level users table.
    log('checking app users table', { authUserId: data.user.id })
    const { data: appUser, error: appUserError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', data.user.id)
      .maybeSingle()

    log('users query result', {
      hasUserRow: !!appUser,
      appUser,
      appUserErrorMessage: appUserError?.message ?? null,
      appUserError: appUserError ?? null,
    })

    if (appUserError || !appUser) {
      // Logged-in auth user is not a restaurant user (likely a super admin) – block regular login.
      await supabase.auth.signOut()
      return {
        data: null,
        error: { message: 'This account is not a restaurant user. Please use the admin login.' } as unknown as Error
      }
    }

    // Brief wait for session/cookies to be ready
    await new Promise(resolve => setTimeout(resolve, 400))

    log('after delay, calling loadOrganizations')
    const orgId = await loadOrganizations(data.user.id)
    log('loadOrganizations returned', { orgId })
    if (typeof window !== 'undefined' && orgId) {
      localStorage.setItem('current_organization_id', orgId)
      log('signIn: set localStorage before redirect', { orgId })
    }
    await new Promise(resolve => setTimeout(resolve, 200))
    const stored = typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null
    log('before redirect', { stored })
    window.location.href = '/dashboard'

    return { data, error: null }
  }

  const signUp = async (email: string, password: string, orgName: string) => {
    // 1. Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    })

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

      // 3. Assign user to organization
      await supabase
        .from('user_organizations')
        .insert({
          user_id: authData.user.id,
          organization_id: org.id,
          role: 'owner'
        })

      const orgId = await loadOrganizations(authData.user.id)
      if (typeof window !== 'undefined' && orgId) {
        localStorage.setItem('current_organization_id', orgId)
      }
      router.push('/dashboard')

      return { data: authData, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // ===== FIXED SIGNOUT - clears state, cookies, then redirects =====
  const signOut = async () => {
    // 1. Clear React state immediately
    setUser(null)
    setOrganization(null)
    setOrganizations([])

    // 2. Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_organization_id')
      localStorage.removeItem('restaurantInfo')

      // 3. Clear all Supabase auth cookies manually
      document.cookie.split(';').forEach(c => {
        const name = c.trim().split('=')[0]
        if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth')) {
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname
        }
      })
    }

    // 4. Try Supabase signOut with timeout (don't let it block)
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ])
    } catch {
      // ignore - redirect anyway
    }

    // 5. Always redirect
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  const refreshOrganization = async () => {
    if (!user?.id) return
    if (typeof window === 'undefined') return

    const savedOrgId = localStorage.getItem('current_organization_id')
    if (!savedOrgId) return

    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, display_name')
      .eq('id', savedOrgId)
      .single()

    if (data && !error) {
      setOrganization({
        id: data.id,
        name: data.name,
        display_name: data.display_name || data.name
      })
    }
  }

  const switchOrganization = (orgId: string) => {
    const newOrg = organizations.find(o => o.id === orgId)
    if (newOrg) {
      setOrganization(newOrg)
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_organization_id', orgId)
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
