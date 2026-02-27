import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/** Get auth user id from access_token in body (POST) or from session cookies (GET) */
async function getAuthUserId(request: NextRequest): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  // 1) POST with body { access_token } – client sends token right after signIn (no cookie delay)
  if (request.method === 'POST') {
    try {
      const body = await request.json().catch(() => null)
      const accessToken = body?.access_token as string | undefined
      if (accessToken?.length) {
        try {
          const res = await fetch(`${url}/auth/v1/user`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              apikey: anonKey,
            },
          })
          if (res.ok) {
            const user = await res.json()
            if (user?.id) return user.id
          }
        } catch {
          // network error
        }
      }
    } catch {
      // ignore
    }
    return null
  }

  // 2) GET: read session from cookies
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
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!error && user?.id) return user.id
  return null
}

export async function GET(request: NextRequest) {
  return runVerify(request)
}

export async function POST(request: NextRequest) {
  return runVerify(request)
}

async function runVerify(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ isAdmin: false }, { status: 500 })
    }

    const userId = await getAuthUserId(request)
    console.log('[verify-admin] getAuthUserId() returned:', userId ?? 'null')

    if (!userId) {
      return NextResponse.json({ isAdmin: false }, { status: 401 })
    }

    const restUrl = `${url}/rest/v1/super_admins?auth_user_id=eq.${encodeURIComponent(userId)}&select=id,is_active`
    console.log('[verify-admin] REST API URL:', restUrl)

    const res = await fetch(restUrl, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    })
    const data = await res.json().catch(() => [])
    console.log('[verify-admin] REST response status:', res.status, 'raw response:', JSON.stringify(data))

    const isAdmin = Array.isArray(data) && data.length > 0 && (data[0] as { is_active?: boolean }).is_active !== false

    return NextResponse.json({ isAdmin: isAdmin ? true : false })
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 500 })
  }
}
