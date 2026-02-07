import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../app/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const tenantId = process.env.NEXT_PUBLIC_DEMO_TENANT_ID

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = process.env.NEXT_PUBLIC_DEMO_TENANT_ID

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    if (!body.display_name) {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from('restaurant_settings')
      .select('id')
      .eq('tenant_id', tenantId)
      .single()

    let result

    if (existing) {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .update({
          display_name: body.display_name,
          address: body.address,
          city: body.city,
          phone: body.phone,
          email: body.email,
          vat_number: body.vat_number,
          vat_rate: body.vat_rate || 0,
          vat_type: body.vat_type || 'exclusive',
          primary_color: body.primary_color || '#10b981',
          secondary_color: body.secondary_color || '#0f172a',
          show_nexttable_branding: body.show_nexttable_branding ?? true,
          invoice_footer_text: body.invoice_footer_text,
        })
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) {
        console.error('Error updating settings:', error)
        return NextResponse.json(
          { error: 'Failed to update settings' },
          { status: 500 }
        )
      }

      result = data
    } else {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .insert({
          tenant_id: tenantId,
          ...body
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating settings:', error)
        return NextResponse.json(
          { error: 'Failed to create settings' },
          { status: 500 }
        )
      }

      result = data
    }

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully!',
      data: result
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}