'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      const { error: signInError } = await signIn(email, password)

      if (signInError) {
        setError(signInError.message || 'Invalid email or password')
      }
      // Success case is handled by signIn (redirects to dashboard)
    } catch (err) {
      setError('Failed to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-2">
            🍽️ NextTable
          </h1>
          <p className="text-slate-600">Restaurant Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none disabled:bg-slate-100"
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none disabled:bg-slate-100"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-bold text-white text-lg transition-colors ${
                loading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Signup Link */}
          <div className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-emerald-600 font-bold hover:text-emerald-700">
              Create one
            </Link>
          </div>
        </div>

        {/* Demo / First-time use */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-center space-y-2">
          <div className="font-bold text-blue-900">First time?</div>
          <div className="text-blue-700">
            No account yet? <Link href="/signup" className="underline font-bold">Sign up</Link> to create your restaurant.
          </div>
          <div className="text-blue-600 pt-1 border-t border-blue-200">
            Demo: Create user <code className="bg-blue-100 px-1 rounded">demo@restaurant.com</code> in Supabase Dashboard → Authentication → Users → Add user, then use password <code className="bg-blue-100 px-1 rounded">demo123</code>.
          </div>
        </div>
      </div>
    </div>
  )
}
