'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    })
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-slate-500">Redirecting…</p>
    </div>
  )
}