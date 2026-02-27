import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

    console.log('🔍 Admin API - Current user:', user?.email)

    if (userError || !user) {
      console.error('❌ No user authenticated')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminData, error: adminError } = await supabase
      .from('super_admins')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (adminError || !adminData) {
      console.error('❌ User is not super admin')
      return NextResponse.json({ error: 'Not authorized - super admin only' }, { status: 403 })
    }

    console.log('✅ Super admin verified')

    const body = await request.json()
    console.log('📋 Request data:', { ...body, tempPassword: '***' })

    const { restaurantName, ownerName, ownerEmail, ownerPhone, tempPassword, address } = body

    if (!restaurantName || !ownerEmail || !tempPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
      return NextResponse.json(
        { error: 'Server configuration error - service role key missing. Check .env.local file.' },
        { status: 500 }
      )
    }

    console.log('✅ Service role key found')

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log('🔧 Creating user...')

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: ownerName ?? '',
        phone: ownerPhone ?? '',
      },
    })

    if (createError || !newUser.user) {
      console.error('❌ User creation failed:', createError)
      return NextResponse.json(
        { error: createError?.message ?? 'User creation failed' },
        { status: 400 }
      )
    }

    console.log('✅ User created:', newUser.user.email)

    const slug =
      restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now()

    console.log('🔧 Creating organization...')

    const orgPayload: Record<string, unknown> = {
      name: restaurantName,
      slug,
      display_name: restaurantName,
      owner_id: newUser.user.id,
      subscription_status: 'trial',
      address: address || null,
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert(orgPayload)
      .select()
      .single()

    if (orgError) {
      console.error('❌ Organization creation failed:', orgError)
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: orgError.message }, { status: 400 })
    }

    console.log('✅ Organization created:', org.name)

    console.log('🔧 Linking user to organization...')

    const { error: linkError } = await supabaseAdmin
      .from('user_organizations')
      .insert({
        user_id: newUser.user.id,
        organization_id: org.id,
        role: 'owner',
      })

    if (linkError) {
      console.error('❌ User-org link failed:', linkError)
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }

    console.log('✅ User linked to organization')

    console.log('🔧 Creating default categories...')

    const defaultCategories = ['Main Course', 'Appetizers', 'Drinks', 'Desserts', 'Sides']
    const categoryInserts = defaultCategories.map((name, i) => ({
      name,
      organization_id: org.id,
      display_order: i,
      is_active: true,
    }))

    const { error: catError } = await supabaseAdmin.from('categories').insert(categoryInserts)
    if (catError) {
      console.warn('⚠️ Default categories warning:', catError.message)
    } else {
      console.log('✅ Default categories created')
    }

    const nextDue = new Date()
    nextDue.setMonth(nextDue.getMonth() + 1)
    const { error: subError } = await supabaseAdmin.from('client_subscriptions').insert({
      organization_id: org.id,
      plan_name: 'Starter',
      monthly_fee: 0,
      start_date: new Date().toISOString().split('T')[0],
      next_payment_due: nextDue.toISOString().split('T')[0],
      payment_status: 'unpaid',
      is_active: true,
    })
    if (subError) {
      console.warn('⚠️ client_subscriptions insert skipped (table may not exist yet):', subError.message)
    } else {
      console.log('✅ Client subscription record created')
    }

    // Seed default restaurant_settings so Settings page shows restaurant name (not empty)
    const { error: rsError } = await supabaseAdmin.from('restaurant_settings').insert({
      organization_id: org.id,
      display_name: restaurantName,
      address: address || null,
      primary_color: '#10b981',
      secondary_color: '#0f172a',
      vat_rate: 0,
      vat_type: 'exclusive',
      show_nexttable_branding: true,
      currency_code: 'BDT',
      currency_symbol: '৳',
    })
    if (rsError) {
      console.warn('⚠️ restaurant_settings seed skipped:', rsError.message)
    } else {
      console.log('✅ Default restaurant_settings created')
    }

    // Seed one floor + 5 tables so Dashboard shows tables (not loading forever)
    const { data: floorRow, error: floorError } = await supabaseAdmin
      .from('floors')
      .insert({
        organization_id: org.id,
        name: 'Ground Floor',
        is_active: true,
        display_order: 0,
      })
      .select('id')
      .single()
    if (floorError) {
      console.warn('⚠️ Default floor skipped:', floorError.message)
    } else if (floorRow?.id) {
      console.log('✅ Default floor created')
      const tableInserts = [1, 2, 3, 4, 5].map((n) => ({
        organization_id: org.id,
        floor_id: floorRow.id,
        table_number: n,
        seats: 4,
        status: 'available',
        is_active: true,
      }))
      const { error: tablesError } = await supabaseAdmin.from('tables').insert(tableInserts)
      if (tablesError) {
        console.warn('⚠️ Default tables skipped:', tablesError.message)
      } else {
        console.log('✅ Default tables (5) created')
      }
    }

    console.log('🎉 CLIENT ACCOUNT CREATED SUCCESSFULLY!')

    return NextResponse.json({
      success: true,
      message: 'Client account created successfully',
      credentials: {
        restaurant: restaurantName,
        owner: ownerName ?? '',
        email: ownerEmail,
        password: tempPassword,
        loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/login`,
      },
    })
  } catch (err: unknown) {
    console.error('💥 Create client error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
