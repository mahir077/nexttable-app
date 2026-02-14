'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all text-slate-700 font-bold active:scale-95"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>Back</span>
    </button>
  )
}
