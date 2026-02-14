'use client'

import { useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

const typeConfig: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: 'bg-emerald-500', icon: '✅' },
  error: { bg: 'bg-rose-500', icon: '❌' },
  info: { bg: 'bg-blue-500', icon: 'ℹ️' }
}

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const { bg, icon } = typeConfig[type]

  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-white ${bg}`}
      role="alert"
    >
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <p className="flex-1 font-medium">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white font-bold text-lg leading-none"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  )
}
