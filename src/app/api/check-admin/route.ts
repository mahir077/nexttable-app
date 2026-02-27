import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !anonKey || !serviceRoleKey) {
      return NextResponse.json({ isAdmin: false }, { status: 500 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ isAdmin: false }, { status: 401 })
    }

    const res = await fetch(
      `${url}/rest/v1/super_admins?auth_user_id=eq.${encodeURIComponent(user.id)}&select=id,is_active`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const data = await res.json().catch(() => [])
    const isAdmin = Array.isArray(data) && data.length > 0 && (data[0] as { is_active?: boolean }).is_active !== false

    if (!isAdmin) {
      return NextResponse.json({ isAdmin: false }, { status: 403 })
    }

    return NextResponse.json({
      isAdmin: true,
      email: user.email ?? undefined,
    })
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 500 })
  }
}
