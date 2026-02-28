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

    const applySession = async (session: { user: { id: string }; access_token?: string; refresh_token?: string } | null) => {
      if (!session?.user) {
        setUser(null)
        setOrganization(null)
        setOrganizations([])
        setIsSuperAdmin(false)
        setLoading(false)
        return
      }
      setUser(session.user)
      if (session.access_token && session.refresh_token) {
        await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })
      }
      try {
        const verifyUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/verify-admin` : '/api/verify-admin'
        const verifyRes = await fetch(verifyUrl, { method: 'GET', credentials: 'include' })
        const verifyData = await verifyRes.json().catch(() => ({ isAdmin: false }))
        if (verifyData?.isAdmin === true) {
          setIsSuperAdmin(true)
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
        setIsSuperAdmin(false)
        const verifyUserUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/verify-user` : '/api/verify-user'
        const verifyUserRes = await fetch(verifyUserUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: session.access_token ?? '' }),
          credentials: 'include',
        })
        const verifyUserData = await verifyUserRes.json().catch(() => ({ isUser: false, organizationId: null, organizations: [] }))
        if (verifyUserData?.isUser && verifyUserData?.organizationId) {
          const orgId = verifyUserData.organizationId as string
          const orgsFromApi = (verifyUserData.organizations ?? []) as { id: string; name: string; display_name: string }[]
          const firstOrg = orgsFromApi[0] ?? { id: orgId, name: '', display_name: '' }
          const orgsToSet = orgsFromApi.length > 0 ? orgsFromApi : [{ id: orgId, name: firstOrg.name, display_name: firstOrg.display_name || firstOrg.name }]
          const orgToSet = { id: orgId, name: firstOrg.name, display_name: firstOrg.display_name || firstOrg.name }
          if (mounted) {
            setOrganizations(orgsToSet)
            setOrganization(orgToSet)
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('current_organization_id', orgId)
            localStorage.setItem('restaurantInfo', JSON.stringify({ name: orgToSet.display_name || orgToSet.name }))
          }
        } else {
          if (mounted) {
            setOrganization(null)
            setOrganizations([])
          }
        }
      } catch (e) {
        if (mounted) setLoading(false)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // Initial load: use getSession() so we have access_token for verify-user POST (avoids cookie reading on Netlify)
    const loadInitialSession = async (retry = false) => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (!mounted) return
      if (error?.message?.includes('Refresh') || error?.message?.includes('JWT')) {
        supabase.auth.signOut().then(() => {
          if (typeof window !== 'undefined') window.location.href = '/login'
        })
        return
      }
      if (session?.user) {
        await applySession({
          user: session.user,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        })
        return
      }
      // Session might not be ready on first paint; retry once
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

      let data: unknown
      let error: { message?: string } | null = null
      try {
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
        data = result.data
        error = result.error
      } catch (queryErr) {
        log('user_organizations query threw (e.g. 400 for super admin)', queryErr)
        setOrganizations([])
        setOrganization(null)
        setLoading(false)
        return null
      }

      log('user_organizations query', { error: error?.message ?? null, rowCount: Array.isArray(data) ? data.length : 0 })

      if (error) {
        setOrganizations([])
        setOrganization(null)
        setLoading(false)
        if (typeof window !== 'undefined') {
          const savedId = localStorage.getItem('current_organization_id')
          if (savedId) {
            try {
              const { data: orgRow } = await fetchOrganizationById(savedId)
              if (orgRow) {
                setOrganization({ id: orgRow.id, name: orgRow.name, display_name: orgRow.display_name || orgRow.name })
                setOrganizations([{ id: orgRow.id, name: orgRow.name, display_name: orgRow.display_name || orgRow.name }])
              } else {
                localStorage.removeItem('current_organization_id')
              }
            } catch {
              localStorage.removeItem('current_organization_id')
            }
          }
        }
        log('early return: query error (no UI error shown)')
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

    const accessToken = data.session?.access_token
    let verifyRes: Response
    try {
      verifyRes = await fetch('/api/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      })
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        return {
          data: null,
          error: { message: 'Request was cancelled. Please try again.' } as unknown as Error
        }
      }
      throw e
    }
    const verifyData = await verifyRes.json().catch(() => ({ isUser: false, organizationId: null, organizations: [] }))

    log('verify-user response', {
      isUser: verifyData?.isUser,
      organizationId: verifyData?.organizationId,
      organizations: verifyData?.organizations,
      raw: verifyData,
    })

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

    log('setting state', { orgId, orgsFromApi, firstOrg, orgsToSet, orgToSet })

    if (typeof window !== 'undefined') {
      localStorage.setItem('current_organization_id', orgId)
      localStorage.setItem('restaurantInfo', JSON.stringify({ name: orgToSet.display_name || orgToSet.name }))
    }
    setOrganizations(orgsToSet)
    setOrganization(orgToSet)

    router.push('/dashboard')
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
