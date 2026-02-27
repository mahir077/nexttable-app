'use client'

import { useEffect } from 'react'

export default function AdminLoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isAbort = error?.name === 'AbortError'

  useEffect(() => {
    if (error?.name !== 'AbortError') {
      console.error(error)
    }
  }, [error])

  // Turbopack hot-reload AbortError: auto-dismiss so user sees underlying page (login/dashboard)
  useEffect(() => {
    if (!isAbort) return
    const t = setTimeout(reset, 50)
    return () => clearTimeout(t)
  }, [isAbort, reset])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md w-full text-center">
        <p className="text-slate-200 mb-4">
          {isAbort
            ? 'Request was cancelled. Please try again.'
            : 'Something went wrong. Please try again.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
