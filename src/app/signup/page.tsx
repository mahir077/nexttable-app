'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!email || !password || !confirmPassword || !restaurantName) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error: signUpError } = await signUp(email, password, restaurantName)

      if (signUpError) {
        setError((signUpError as Error)?.message || 'Failed to create account')
      }
      // Success case is handled by signUp (redirects to dashboard)
    } catch (err) {
      setError('Failed to create account. Please try again.')
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

        {/* Signup Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Account</h2>
          <p className="text-sm text-slate-600 mb-6">Start your 30-day free trial</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Restaurant Name *
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none disabled:bg-slate-100"
                placeholder="e.g., Golden Spoon Restaurant"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Email Address *
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
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none disabled:bg-slate-100"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none disabled:bg-slate-100"
                placeholder="••••••••"
                autoComplete="new-password"
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
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 font-bold hover:text-emerald-700">
              Sign in
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-2xl mb-1">✨</div>
            <div className="font-bold text-slate-900">30 Days Free</div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-2xl mb-1">🔒</div>
            <div className="font-bold text-slate-900">Secure</div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-2xl mb-1">⚡</div>
            <div className="font-bold text-slate-900">Easy Setup</div>
          </div>
        </div>
      </div>
    </div>
  )
}
