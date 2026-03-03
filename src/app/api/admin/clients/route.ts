import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function fetchWithServiceRole<T>(url: string): Promise<T> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  })
  return res.json() as Promise<T>
}

export async function GET(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !anonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    })

    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    const { data: { user }, error: userError } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminRes = await fetch(
      `${url}/rest/v1/super_admins?auth_user_id=eq.${encodeURIComponent(user.id)}&select=id`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const adminData = await adminRes.json().catch(() => [])
    if (!Array.isArray(adminData) || adminData.length === 0) {
      return NextResponse.json({ error: 'Forbidden - super admin only' }, { status: 403 })
    }

    const subs = await fetchWithServiceRole<Record<string, unknown>[]>(
      `${url}/rest/v1/client_subscriptions?select=id,organization_id,plan_name,monthly_fee,start_date,last_payment_date,next_payment_due,payment_status,is_active,notes,created_at&order=created_at.desc`
    )
    const subscriptions = Array.isArray(subs) ? subs : []

    const orgIds = [...new Set(subscriptions.map((s) => s.organization_id as string).filter(Boolean))]
    let orgs: { id: string; name?: string; owner_id?: string; created_at?: string }[] = []
    if (orgIds.length > 0) {
      const inFilter = orgIds.map((id) => encodeURIComponent(id)).join(',')
      const orgList = await fetchWithServiceRole<{ id: string; name?: string; owner_id?: string; created_at?: string }[]>(
        `${url}/rest/v1/organizations?id=in.(${inFilter})&select=id,name,owner_id,created_at`
      )
      orgs = Array.isArray(orgList) ? orgList : []
    }

    const orgMap = new Map<string, { id: string; name?: string; owner_id?: string }>(orgs.map((o) => [o.id, o]))
    const ownerIds = [...new Set(orgs.map((o) => o.owner_id).filter(Boolean))] as string[]

    const ownerMap = new Map<string, { email: string; name: string }>()
    for (const uid of ownerIds) {
      try {
        const uRes = await fetch(`${url}/auth/v1/admin/users/${uid}`, {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        })
        if (uRes.ok) {
          const u = await uRes.json()
          const usr = u?.user ?? u
          ownerMap.set(uid, {
            email: usr.email ?? 'N/A',
            name: (usr.user_metadata?.name as string) ?? 'Unknown',
          })
        } else {
          ownerMap.set(uid, { email: 'N/A', name: 'Unknown' })
        }
      } catch {
        ownerMap.set(uid, { email: 'N/A', name: 'Unknown' })
      }
    }

    const clients = subscriptions.map((sub: Record<string, unknown>) => {
      const org = orgMap.get(sub.organization_id as string)
      const ownerId = org?.owner_id
      const owner = ownerId ? ownerMap.get(ownerId) : null
      const startDate = sub.start_date as string
      const nextDue = sub.next_payment_due as string
      const daysRunning = Math.floor(
        (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      const daysUntilDue = Math.floor(
        (new Date(nextDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      return {
        id: sub.id,
        organization_id: sub.organization_id,
        restaurant_name: org?.name ?? 'Unknown',
        owner_email: owner?.email ?? 'N/A',
        owner_name: owner?.name ?? 'Unknown',
        plan_name: sub.plan_name,
        monthly_fee: sub.monthly_fee,
        start_date: sub.start_date,
        last_payment_date: sub.last_payment_date,
        next_payment_due: sub.next_payment_due,
        payment_status: sub.payment_status,
        is_active: sub.is_active,
        days_running: daysRunning,
        days_until_due: daysUntilDue,
        notes: sub.notes,
      }
    })

    return NextResponse.json({ clients })
  } catch (e) {
    console.error('Admin clients GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}