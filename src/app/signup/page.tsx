'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SignupDisabled() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect to login after 3 seconds
    const t = setTimeout(() => {
      router.push('/login')
    }, 3000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            Account Creation Disabled
          </h1>
          <p className="text-slate-600 mb-6">
            NextTable accounts are created by our team to ensure quality service.
          </p>
        </div>

        <div className="bg-emerald-50 rounded-lg p-6 mb-6">
          <h2 className="font-bold text-slate-900 mb-3">
            Interested in NextTable?
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Contact us to get started with your restaurant POS system.
          </p>

          <div className="space-y-2 text-left">
            <div className="flex items-center text-sm">
              <span className="font-semibold text-slate-700 w-20">Email:</span>
              <a href="mailto:contact@nexttable.com" className="text-emerald-600 hover:underline">
                contact@nexttable.com
              </a>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-semibold text-slate-700 w-20">Phone:</span>
              <a href="tel:+8801XXXXXXXXX" className="text-emerald-600 hover:underline">
                +880 1XXX-XXXXXX
              </a>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-semibold text-slate-700 w-20">WhatsApp:</span>
              <a href="https://wa.me/8801XXXXXXXXX" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Message on WhatsApp
              </a>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Redirecting to login page in 3 seconds...
        </p>

        <button
          type="button"
          onClick={() => router.push('/login')}
          className="mt-4 w-full px-6 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600"
        >
          Go to Login
        </button>
      </div>
    </div>
  )
}
