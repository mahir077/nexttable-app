'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check active session (handle invalid/expired refresh token)
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          const msg = (error as Error)?.message || ''
          if (msg.includes('Refresh Token') || msg.includes('refresh_token') || msg.includes('Invalid')) {
            supabase.auth.signOut().finally(() => {
              setUser(null)
              setOrganization(null)
              setOrganizations([])
              setLoading(false)
              if (typeof window !== 'undefined') window.location.href = '/login'
            })
            return
          }
        }
        setUser(session?.user ?? null)
        if (session?.user) {
          loadOrganizations(session.user.id)
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        const msg = (err as Error)?.message || ''
        if (msg.includes('Refresh Token') || msg.includes('refresh_token') || msg.includes('Invalid')) {
          supabase.auth.signOut().finally(() => {
            setUser(null)
            setOrganization(null)
            setOrganizations([])
            setLoading(false)
            if (typeof window !== 'undefined') window.location.href = '/login'
          })
        } else {
          setLoading(false)
        }
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadOrganizations(session.user.id)
      } else {
        setOrganization(null)
        setOrganizations([])
        setLoading(false)
      }
    })

    // If refresh token error is thrown elsewhere (e.g. during API call), redirect to login
    const onUnhandled = (e: PromiseRejectionEvent) => {
      const msg = (e?.reason as Error)?.message || String(e?.reason || '')
      if (msg.includes('Refresh Token') || msg.includes('refresh_token') || msg.includes('Invalid Refresh Token')) {
        e.preventDefault()
        supabase.auth.signOut().finally(() => {
          setUser(null)
          setOrganization(null)
          setOrganizations([])
          if (typeof window !== 'undefined') window.location.href = '/login'
        })
      }
    }
    window.addEventListener('unhandledrejection', onUnhandled)
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('unhandledrejection', onUnhandled)
    }
  }, [])

  const loadOrganizations = async (userId: string) => {
    try {
      // Get user's organizations
      const { data: userOrgs } = await supabase
        .from('user_organizations')
        .select('organization:organizations(*)')
        .eq('user_id', userId)

      const orgs = userOrgs?.map((uo: any) => uo.organization).filter(Boolean) || []
      setOrganizations(orgs)

      // Set current organization
      const savedOrgId = typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null
      const currentOrg = orgs.find((o: Organization) => o.id === savedOrgId) || orgs[0]

      if (currentOrg) {
        setOrganization(currentOrg)
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_organization_id', currentOrg.id)
        }
      }
    } catch (error) {
      console.error('Error loading organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Signing in:', email)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    console.log('Sign in result:', { user: data?.user?.email, error: error?.message })

    if (!error && data.user) {
      console.log('✅ Login successful')

      // Load organizations
      await loadOrganizations(data.user.id)

      // Small delay to ensure session is persisted
      await new Promise(resolve => setTimeout(resolve, 500))

      console.log('Redirecting to dashboard...')
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
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_organization_id')
    }
    router.push('/login')
  }

  const switchOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setOrganization(org)
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_organization_id', orgId)
      }
      router.refresh()
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
        switchOrganization
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
