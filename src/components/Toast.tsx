'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000) // Auto close after 3 seconds

    return () => clearTimeout(timer)
  }, [onClose])

  const styles: Record<ToastProps['type'], { bg: string; icon: string }> = {
    success: {
      bg: 'bg-emerald-500',
      icon: '✅'
    },
    error: {
      bg: 'bg-red-500',
      icon: '❌'
    },
    info: {
      bg: 'bg-blue-500',
      icon: 'ℹ️'
    }
  }

  const style = styles[type]

  return (
    <div
      className={`fixed top-4 right-4 ${style.bg} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50 min-w-[300px]`}
      role="alert"
    >
      <span className="text-2xl" aria-hidden>
        {style.icon}
      </span>
      <span className="font-medium flex-1">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-xl hover:text-slate-200 font-bold ml-2"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  )
}
