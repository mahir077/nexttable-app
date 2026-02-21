'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSupabase } from '@/contexts/SupabaseContext'
import { useRouter } from 'next/navigation'

interface Organization {
  id: string
  name: string
  slug: string
  display_name: string
}

interface AuthContextType {
  user: any
  organization: Organization | null
  organizations: Organization[]
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, orgName: string) => Promise<any>
  signOut: () => Promise<void>
  switchOrganization: (orgId: string) => void
  refreshOrganization: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase()
  const [user, setUser] = useState<any>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const applySession = async (session: { user: { id: string } } | null) => {
      if (!session?.user) {
        setUser(null)
        setOrganization(null)
        setOrganizations([])
        setLoading(false)
        return
      }
      setUser(session.user)
      try {
        const { data: adminData } = await supabase
          .from('super_admins')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle()
        if (!mounted) return
        if (adminData) {
          setOrganization(null)
          setOrganizations([])
          setLoading(false)
          return
        }
        await loadOrganizations(session.user.id)
      } catch (e) {
        if (mounted) setLoading(false)
      }
    }

    // Initial load: get session first so user + Logout show immediately (no AbortError flash)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return
      if (error?.message?.includes('Refresh')) {
        supabase.auth.signOut().then(() => {
          if (typeof window !== 'undefined') window.location.href = '/login'
        })
        return
      }
      applySession(session ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            if (typeof window !== 'undefined') localStorage.removeItem('current_organization_id')
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

  const loadOrganizations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_organizations')
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            slug,
            display_name
          )
        `)
        .eq('user_id', userId)

      if (error) {
        setLoading(false)
        return
      }

      if (!data || data.length === 0) {
        setOrganizations([])
        setOrganization(null)
        setLoading(false)
        return
      }

      type OrgShape = { name: string; display_name?: string; slug: string }
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
            display_name: org.display_name || org.name,
            slug: org.slug
          }
        })
        .filter((o): o is Organization => o != null)

      setOrganizations(orgs)
      const currentOrg = orgs[0]
      setOrganization(currentOrg)
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_organization_id', currentOrg.id)
      }
    } catch {
      // ignore (e.g. AbortError)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (!error && data.user) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('current_organization_id')
      }
      await loadOrganizations(data.user.id)
      await new Promise(resolve => setTimeout(resolve, 500))
      window.location.href = '/dashboard'
    }

    return { data, error }
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
      // 2. Create organization
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-')

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: slug + '-' + Date.now(),
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

      await loadOrganizations(authData.user.id)
      router.push('/dashboard')

      return { data: authData, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore – still redirect
    }
    setUser(null)
    setOrganization(null)
    setOrganizations([])
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_organization_id')
      localStorage.removeItem('restaurantInfo')
      window.location.href = '/login'
    } else {
      router.push('/login')
    }
  }

  const refreshOrganization = async () => {
    if (!user?.id) return
    if (typeof window === 'undefined') return

    const savedOrgId = localStorage.getItem('current_organization_id')
    if (!savedOrgId) return

    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, display_name')
      .eq('id', savedOrgId)
      .single()

    if (data && !error) {
      setOrganization({
        id: data.id,
        name: data.name,
        display_name: data.display_name || data.name,
        slug: data.slug
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
