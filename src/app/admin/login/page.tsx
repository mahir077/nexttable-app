'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/contexts/SupabaseContext'
import { useSearchParams } from 'next/navigation'

type Mode = 'login' | 'reset' | 'update'

export default function AdminLoginPage() {
  const supabase = useSupabase()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<Mode>('login')

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  // When coming from Supabase recovery link, show password update form.
  useEffect(() => {
    if (searchParams?.get('type') === 'recovery') {
      setMode('update')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error || !data.user) {
        setError(error?.message || 'Invalid email or password')
        return
      }

      // Check that this auth user is a super admin
      const { data: adminData, error: adminError } = await supabase
        .from('super_admins')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle()

      if (adminError || !adminData) {
        // Not a super admin – immediately sign out and show an error
        await supabase.auth.signOut()
        setError('This account is not a NextTable super admin. Please use the restaurant login.')
        return
      }

      // Valid super admin – go to super admin dashboard
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/dashboard'
      }
    } catch {
      setError('Failed to sign in. Please try again.')
    } finally {
      setLoading(false)
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
        redirectTo: 'https://nexttable.netlify.app/admin/login',
      })

      if (error) {
        setResetError(error.message)
        return
      }

      setResetMessage('Password reset link sent to your email')
    } catch {
      setResetError('Failed to send reset link. Please try again.')
    } finally {
      setResetLoading(false)
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
      if (error) {
        setUpdateError(error.message)
        return
      }

      setUpdateMessage('Password updated successfully. You can now sign in.')
      setMode('login')
    } catch {
      setUpdateError('Failed to update password. Please try again.')
    } finally {
      setUpdateLoading(false)
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

            <form onSubmit={handleLogin} className="space-y-4">
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


