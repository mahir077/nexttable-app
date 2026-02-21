'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    restaurantName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    tempPassword: '',
    address: ''
  })

  const checkSuperAdmin = async () => {
    try {
      setVerifying(true)
      const response = await fetch('/api/check-admin')
      const data = await response.json()

      if (!data.isAdmin) {
        alert('🚫 Access Denied\n\nThis page is only accessible to NextTable administrators.')
        router.push('/dashboard')
        return
      }

      setIsVerified(true)
    } catch (err) {
      console.error('Admin check failed:', err)
      alert('Access verification failed. Redirecting...')
      router.push('/login')
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => {
    checkSuperAdmin()
  }, [])

  const generatePassword = () => {
    const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase()
    setFormData({ ...formData, tempPassword: password })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      console.log('📤 Sending request to API...')

      const response = await fetch('/api/admin/create-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantName: formData.restaurantName,
          ownerName: formData.ownerName,
          ownerEmail: formData.ownerEmail,
          ownerPhone: formData.ownerPhone,
          tempPassword: formData.tempPassword,
          address: formData.address
        })
      })

      console.log('📥 API Response status:', response.status)

      const data = await response.json()
      console.log('📥 API Response:', data)

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Account creation failed')
      }

      // Success!
      const credentials = `
✅ CLIENT ACCOUNT CREATED!

Restaurant: ${data.credentials.restaurant}
Owner: ${data.credentials.owner}
Email: ${data.credentials.email}
Password: ${data.credentials.password}

Login URL: ${data.credentials.loginUrl}

⚠️ IMPORTANT:
- Client can login IMMEDIATELY (no email confirmation!)
- Send credentials via WhatsApp/Email securely
- Tell client to change password after first login
    `

      setMessage(credentials)

      // Reset form
      setFormData({
        restaurantName: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        tempPassword: '',
        address: ''
      })
    } catch (err: unknown) {
      console.error('❌ Client creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create client account')
    } finally {
      setLoading(false)
    }
  }

  if (verifying || !isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-slate-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">🔐 Create Client Account</h1>
            <p className="text-slate-600">Add a new restaurant to NextTable</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-sm text-slate-500 hover:text-slate-700 font-medium"
          >
            🎛️ Mother Panel →
          </Link>
        </div>

        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-4 py-2 bg-slate-200 rounded-lg font-bold hover:bg-slate-300"
          >
            ← Back to Dashboard
          </button>
        </div>

        {message && (
          <div className="mb-6 bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4">
            <h3 className="font-bold text-emerald-900 mb-2">✅ Account Created Successfully!</h3>
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono bg-white p-4 rounded">
              {message}
            </pre>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(message)
                alert('Credentials copied to clipboard!')
              }}
              className="mt-3 px-4 py-2 bg-emerald-500 text-white rounded font-bold"
            >
              📋 Copy Credentials
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-red-900 font-bold">❌ Error: {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Restaurant Name *</label>
            <input
              type="text"
              required
              value={formData.restaurantName}
              onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
              className="w-full px-4 py-3 border-2 rounded-lg border-slate-200 text-slate-900"
              placeholder="Golden Spoon Restaurant"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Owner Name *</label>
              <input
                type="text"
                required
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-4 py-3 border-2 rounded-lg border-slate-200 text-slate-900"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Phone</label>
              <input
                type="tel"
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                className="w-full px-4 py-3 border-2 rounded-lg border-slate-200 text-slate-900"
                placeholder="+880 1XXX-XXXXXX"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Owner Email *</label>
            <input
              type="email"
              required
              value={formData.ownerEmail}
              onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
              className="w-full px-4 py-3 border-2 rounded-lg border-slate-200 text-slate-900"
              placeholder="owner@restaurant.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Temporary Password *</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={formData.tempPassword}
                onChange={(e) => setFormData({ ...formData, tempPassword: e.target.value })}
                className="flex-1 px-4 py-3 border-2 rounded-lg font-mono border-slate-200 text-slate-900"
                placeholder="temp123456"
              />
              <button
                type="button"
                onClick={generatePassword}
                className="px-4 py-3 bg-slate-200 rounded-lg font-bold hover:bg-slate-300 text-slate-900"
              >
                🎲 Generate
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Client will change this after first login</p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Address (Optional)</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 border-2 rounded-lg border-slate-200 text-slate-900"
              rows={2}
              placeholder="123 Main Street, Dhaka"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-4 bg-emerald-500 text-white rounded-lg font-bold text-lg hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : '✅ Create Client Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-slate-600 hover:text-slate-900"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
