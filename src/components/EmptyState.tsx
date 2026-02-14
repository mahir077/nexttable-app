'use client'

export interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="text-8xl opacity-50 mb-4" aria-hidden>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
      {description && <p className="text-slate-600 mb-6 max-w-sm">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
