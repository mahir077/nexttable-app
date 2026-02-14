'use client'

type SpinnerSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-6 h-6',
  md: 'w-12 h-12',
  lg: 'w-16 h-16'
}

export default function LoadingSpinner({ size = 'md' }: { size?: SpinnerSize }) {
  return (
    <div
      className={`animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500 ${sizeClasses[size]}`}
      role="status"
      aria-label="Loading"
    />
  )
}
