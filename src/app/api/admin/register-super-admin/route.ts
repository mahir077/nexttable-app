import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * One-time: add the currently logged-in Auth user as a super admin.
 * Only works when ALLOW_SUPER_ADMIN_REGISTER=true in env (e.g. .env.local).
 * Call once while logged in as the account you want to make super admin (e.g. from /admin/login).
 */
export async function POST(request: NextRequest) {
  if (process.env.ALLOW_SUPER_ADMIN_REGISTER !== 'true') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return NextResponse.json({ error: 'Config missing' }, { status: 500 })

  let userId: string
  let email: string

  try {
    const body = await request.json().catch(() => null)
    const accessToken = body?.access_token as string | undefined
    if (!accessToken?.length) {
      return NextResponse.json({ error: 'Send { "access_token": "..." } in body' }, { status: 400 })
    }
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    const user = await res.json()
    if (!user?.id) {
      return NextResponse.json({ error: 'No user in token' }, { status: 401 })
    }
    userId = user.id
    email = user.email || ''
  } catch {
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 })
  }

  const name = email ? email.split('@')[0] : 'Super Admin'
  const { error } = await supabaseAdmin
    .from('super_admins')
    .upsert(
      { auth_user_id: userId, name, email: email || `admin-${userId}@local`, is_active: true },
      { onConflict: 'auth_user_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true, message: 'Super admin registered. Set ALLOW_SUPER_ADMIN_REGISTER=false and try logging in again.' })
}
