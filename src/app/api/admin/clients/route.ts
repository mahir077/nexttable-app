import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminData, error: adminError } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminError || !adminData) {
      return NextResponse.json({ error: 'Forbidden - super admin only' }, { status: 403 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: subs, error: subsError } = await supabaseAdmin
      .from('client_subscriptions')
      .select(`
        id,
        organization_id,
        plan_name,
        monthly_fee,
        start_date,
        last_payment_date,
        next_payment_due,
        payment_status,
        is_active,
        notes,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (subsError) {
      return NextResponse.json({ error: subsError.message, clients: [] }, { status: 200 })
    }

    const subscriptions = subs ?? []

    type OrgRow = { id: string; name?: string; owner_id?: string; created_at?: string }
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id, name, owner_id, created_at')
      .in('id', subscriptions.map((s: { organization_id: string }) => s.organization_id))

    const orgMap = new Map<string, OrgRow>((orgs ?? []).map((o: OrgRow) => [o.id, o]))
    const ownerIds = [...new Set((orgs ?? []).map((o: OrgRow) => o.owner_id).filter(Boolean))] as string[]

    const ownerMap = new Map<string, { email: string; name: string }>()
    for (const uid of ownerIds) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid)
        if (u?.user) {
          ownerMap.set(uid, {
            email: u.user.email ?? 'N/A',
            name: (u.user.user_metadata?.name as string) ?? 'Unknown',
          })
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
