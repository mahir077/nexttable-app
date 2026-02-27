import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/** Get auth user id from access_token in body (POST) or from session cookies (GET) */
async function getAuthUserId(request: NextRequest): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  if (request.method === 'POST') {
    try {
      const body = await request.json().catch(() => null)
      const accessToken = body?.access_token as string | undefined
      if (accessToken?.length) {
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
      }
    } catch {
      // ignore
    }
    return null
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
      return NextResponse.json({ isUser: false, organizationId: null }, { status: 500 })
    }

    const userId = await getAuthUserId(request)
    if (!userId) {
      return NextResponse.json({ isUser: false, organizationId: null }, { status: 401 })
    }

    const usersRes = await fetch(
      `${url}/rest/v1/users?auth_user_id=eq.${encodeURIComponent(userId)}&select=id,organization_id`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const usersData = await usersRes.json().catch(() => [])
    const userRow = Array.isArray(usersData) && usersData.length > 0 ? (usersData[0] as { id: string; organization_id: string | null }) : null

    if (!userRow) {
      return NextResponse.json({
        isUser: false,
        organizationId: null,
      }, { status: 200 })
    }

    const uoRes = await fetch(
      `${url}/rest/v1/user_organizations?user_id=eq.${encodeURIComponent(userRow.id)}&select=organization_id`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const uoData = await uoRes.json().catch(() => []) as { organization_id: string }[]
    const orgIds = Array.isArray(uoData) ? [...new Set(uoData.map((r) => r.organization_id).filter(Boolean))] : []

    let organizations: { id: string; name: string; display_name: string }[] = []
    if (orgIds.length > 0) {
      const inFilter = orgIds.map((id) => encodeURIComponent(id)).join(',')
      const orgsRes = await fetch(
        `${url}/rest/v1/organizations?id=in.(${inFilter})&select=id,name`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        }
      )
      const orgList = await orgsRes.json().catch(() => []) as { id: string; name: string }[]
      organizations = (Array.isArray(orgList) ? orgList : []).map((o) => ({
        id: o.id,
        name: o.name,
        display_name: o.name,
      }))
    }

    return NextResponse.json({
      isUser: true,
      organizationId: userRow.organization_id ?? '',
      organizations,
    })
  } catch {
    return NextResponse.json({ isUser: false, organizationId: null }, { status: 500 })
  }
}
