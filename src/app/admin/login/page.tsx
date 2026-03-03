'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSupabase } from '@/contexts/SupabaseContext'
import { useSearchParams } from 'next/navigation'

type Mode = 'login' | 'reset' | 'update'

function AdminLoginInner() {
  const supabase = useSupabase()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<Mode>('login')

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRegisterAdmin, setShowRegisterAdmin] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState('')
  const [registerLoading, setRegisterLoading] = useState(false)
  const mountedRef = useRef(true)

  // Reset-password request state
  const [resetEmail, setResetEmail] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // New password (after clicking reset link)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [updateMessage, setUpdateMessage] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)

  // Track mount so we don't setState after unmount (e.g. Turbopack hot reload during fetch)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // When coming from Supabase recovery link, show password update form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update')
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  // Brutal: suppress AbortError so Next.js Turbopack overlay never shows it
  useEffect(() => {
    const onRejection = (ev: PromiseRejectionEvent) => {
      const reason = ev?.reason
      if (reason?.name === 'AbortError' || (typeof reason?.message === 'string' && reason.message.toLowerCase().includes('abort'))) {
        ev.preventDefault()
        ev.stopPropagation()
      }
    }
    const onError = (event: ErrorEvent) => {
      if (event?.message?.toLowerCase().includes('abort') || (event?.error as Error)?.name === 'AbortError') {
        event.preventDefault()
        return true
      }
      return false
    }
    window.addEventListener('unhandledrejection', onRejection, true)
    window.addEventListener('error', onError, true)
    return () => {
      window.removeEventListener('unhandledrejection', onRejection, true)
      window.removeEventListener('error', onError, true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setShowRegisterAdmin(false)
    setRegisterSuccess('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      let data: { user: unknown; session?: { access_token?: string } | null } | null = null
      let authError: { message?: string } | null = null
      try {
        const result = await supabase.auth.signInWithPassword({ email, password })
        data = result.data
        authError = result.error
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          if (mountedRef.current) setLoading(false)
          return
        }
        throw err
      }

      if (authError || !data?.user) {
        if (mountedRef.current) setError(authError?.message || 'Invalid email or password')
        return
      }

      const accessToken = data?.session?.access_token
      const verifyUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/verify-admin` : '/api/verify-admin'
      console.log('[admin/login] Calling verify-admin:', verifyUrl)
      let verifyRes: Response
      try {
        verifyRes = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken }),
        })
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          if (mountedRef.current) setLoading(false)
          return
        }
        throw err
      }
      let verifyData: { isAdmin?: boolean }
      try {
        verifyData = await verifyRes.json().catch(() => ({ isAdmin: false }))
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          if (mountedRef.current) setLoading(false)
          return
        }
        verifyData = { isAdmin: false }
      }

      if (!mountedRef.current) return
      if (!verifyData.isAdmin) {
        setError('This account is not a NextTable super admin. Please use the restaurant login.')
        setShowRegisterAdmin(true)
        return
      }

      if (typeof window !== 'undefined') {
        window.location.href = '/admin/dashboard'
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError' || (err as Error)?.message?.toLowerCase().includes('abort')) {
        if (mountedRef.current) setLoading(false)
        return
      }
      if (mountedRef.current) setError('Failed to sign in. Please try again.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError('')
    setResetMessage('')

    if (!resetEmail) {
      setResetError('Please enter your admin email')
      return
    }

    setResetLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/admin/login`,
      })
      if (!mountedRef.current) return
      if (error) {
        setResetError(error.message)
        return
      }
      setResetMessage('Password reset link sent to your email')
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      if (mountedRef.current) setResetError('Failed to send reset link. Please try again.')
    } finally {
      if (mountedRef.current) setResetLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdateError('')
    setUpdateMessage('')

    if (!newPassword || !confirmPassword) {
      setUpdateError('Please fill in both password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      setUpdateError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setUpdateError('Password must be at least 8 characters')
      return
    }

    setUpdateLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (!mountedRef.current) return
      if (error) {
        setUpdateError(error.message)
        return
      }
      setUpdateMessage('Password updated successfully. You can now sign in.')
      setMode('login')
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      if (mountedRef.current) setUpdateError('Failed to update password. Please try again.')
    } finally {
      if (mountedRef.current) setUpdateLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-black text-white mb-2">
            🎛️ NextTable
          </h1>
          <p className="text-emerald-400 font-semibold text-sm uppercase tracking-widest">
            Super Admin Login
          </p>
          <p className="text-slate-300 text-xs mt-2">
            Platform control panel – not for restaurant staff
          </p>
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <div className="bg-slate-950/60 backdrop-blur rounded-2xl shadow-2xl border border-slate-700 p-8">
            <h2 className="text-xl font-bold text-white mb-6">Sign in as Super Admin</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-900/40 border border-red-500 rounded-lg text-red-100 text-sm">
                ⚠️ {error}
              </div>
            )}
            {registerSuccess && (
              <div className="mb-4 p-3 bg-emerald-900/40 border border-emerald-500 rounded-lg text-emerald-100 text-sm">
                {registerSuccess}
              </div>
            )}
            {showRegisterAdmin && !registerSuccess && (
              <div className="mb-4 p-3 bg-slate-800/60 border border-slate-600 rounded-lg text-slate-200 text-sm">
                <p className="mb-2">If this is your platform admin account, you can add it once (set <code className="text-amber-300">ALLOW_SUPER_ADMIN_REGISTER=true</code> in <code className="text-amber-300">.env.local</code> and restart).</p>
                <button
                  type="button"
                  disabled={registerLoading}
                  onClick={async () => {
                    setRegisterLoading(true)
                    try {
                      const { data } = await supabase.auth.getSession()
                      if (!mountedRef.current) return
                      const token = data.session?.access_token
                      if (!token) {
                        setError('Session expired. Sign in again and try the button.')
                        return
                      }
                      const res = await fetch('/api/admin/register-super-admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ access_token: token }),
                      })
                      const j = await res.json().catch(() => ({}))
                      if (!mountedRef.current) return
                      if (res.ok && j.ok) {
                        setRegisterSuccess('Registered. Sign in again to continue.')
                        setShowRegisterAdmin(false)
                        setError('')
                      } else {
                        setError(j.error || (res.status === 403 ? 'Set ALLOW_SUPER_ADMIN_REGISTER=true in .env.local and restart the app.' : 'Registration failed.'))
                      }
                    } catch (err) {
                      if ((err as Error)?.name === 'AbortError') return
                      if (mountedRef.current) setError('Request failed.')
                    } finally {
                      if (mountedRef.current) setRegisterLoading(false)
                    }
                  }}
                  className="mt-2 px-3 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg disabled:opacity-50"
                >
                  {registerLoading ? 'Registering…' : 'Register this account as Super Admin'}
                </button>
              </div>
            )}

            <form onSubmit={(e) => { handleLogin(e).catch((err: unknown) => { if ((err as Error)?.name === 'AbortError') return; if (mountedRef.current) { setError('Failed to sign in. Please try again.'); setLoading(false); } }); }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-slate-700 bg-slate-900 rounded-lg text-slate-50 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none disabled:bg-slate-800"
                  placeholder="admin@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-200 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-slate-700 bg-slate-900 rounded-lg text-slate-50 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none disabled:bg-slate-800"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-bold text-white text-lg transition-colors ${
                  loading
                    ? 'bg-slate-600 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
              >
                {loading ? 'Signing in...' : 'Sign In as Super Admin'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setMode('reset')}
              className="mt-4 text-sm text-emerald-300 hover:text-emerald-200 underline"
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* RESET PASSWORD REQUEST FORM */}
        {mode === 'reset' && (
          <div className="bg-slate-950/60 backdrop-blur rounded-2xl shadow-2xl border border-slate-700 p-8">
            <h2 className="text-xl font-bold text-white mb-6">Reset Super Admin Password</h2>

            {resetError && (
              <div className="mb-4 p-3 bg-red-900/40 border border-red-500 rounded-lg text-red-100 text-sm">
                ⚠️ {resetError}
              </div>
            )}

            {resetMessage && (
              <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-500 rounded-lg text-emerald-100 text-sm">
                {resetMessage}
              </div>
            )}

            <form onSubmit={handleSendReset} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={resetLoading}
                  className="w-full px-4 py-3 border border-slate-700 bg-slate-900 rounded-lg text-slate-50 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none disabled:bg-slate-800"
                  placeholder="admin@example.com"
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className={`w-full py-3 rounded-lg font-bold text-white text-lg transition-colors ${
                  resetLoading
                    ? 'bg-slate-600 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="mt-4 text-sm text-slate-300 hover:text-white underline"
            >
              Back to login
            </button>
          </div>
        )}

        {/* UPDATE PASSWORD FORM AFTER RECOVERY LINK */}
        {mode === 'update' && (
          <div className="bg-slate-950/60 backdrop-blur rounded-2xl shadow-2xl border border-slate-700 p-8">
            <h2 className="text-xl font-bold text-white mb-6">Set a New Password</h2>

            {updateError && (
              <div className="mb-4 p-3 bg-red-900/40 border border-red-500 rounded-lg text-red-100 text-sm">
                ⚠️ {updateError}
              </div>
            )}

            {updateMessage && (
              <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-500 rounded-lg text-emerald-100 text-sm">
                {updateMessage}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={updateLoading}
                  className="w-full px-4 py-3 border border-slate-700 bg-slate-900 rounded-lg text-slate-50 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none disabled:bg-slate-800"
                  placeholder="New password"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-200 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={updateLoading}
                  className="w-full px-4 py-3 border border-slate-700 bg-slate-900 rounded-lg text-slate-50 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none disabled:bg-slate-800"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={updateLoading}
                className={`w-full py-3 rounded-lg font-bold text-white text-lg transition-colors ${
                  updateLoading
                    ? 'bg-slate-600 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
              >
                {updateLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="mt-4 text-sm text-slate-300 hover:text-white underline"
            >
              Back to login
            </button>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-slate-400">
          This page is only for NextTable platform administrators. Restaurant owners and staff
          should use the regular login page.
        </p>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  // Wrap the client-side searchParams usage in a Suspense boundary to satisfy Next.js CSR bailout rules.
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-200">Loading...</div>}>
      <AdminLoginInner />
    </Suspense>
  )
}


