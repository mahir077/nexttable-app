import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: req,
  })

  const searchParams = req.nextUrl.searchParams
  const isRecovery =
    searchParams.get('type') === 'recovery' ||
    searchParams.get('type') === 'magiclink' ||
    searchParams.get('type') === 'signup' ||
    searchParams.has('access_token') ||
    searchParams.has('token_hash')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    // Env missing (e.g. Netlify build without vars) – still enforce route protection
    const isProtected = ['/dashboard', '/pos', '/menu', '/orders', '/kitchen', '/billing', '/reports', '/stock', '/suppliers', '/purchases', '/reservations', '/settings'].some(r => req.nextUrl.pathname.startsWith(r))

    if (req.nextUrl.pathname === '/') {
      const target = isRecovery ? '/admin/login' : '/login'
      return NextResponse.redirect(new URL(target, req.url))
    }

    // Always allow the admin login page to render
    if (req.nextUrl.pathname === '/admin/login') {
      return supabaseResponse
    }

    // Other admin routes should go to the admin login screen when env is missing
    if (req.nextUrl.pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }

    if (isProtected) {
      const target = isRecovery ? '/admin/login' : '/login'
      return NextResponse.redirect(new URL(target, req.url))
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            req.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request: req,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedRoutes = [
    '/dashboard', '/pos', '/menu', '/orders', '/kitchen', '/billing',
    '/reports', '/stock', '/suppliers', '/purchases', '/reservations', '/settings'
  ]
  const isProtectedRoute = protectedRoutes.some(route =>
    req.nextUrl.pathname.startsWith(route)
  )

  if (req.nextUrl.pathname === '/') {
    if (user) {
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', req.url))
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
    const target = isRecovery ? '/admin/login' : '/login'
    return NextResponse.redirect(new URL(target, req.url))
  }

  if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup') {
    // Special case: password recovery links should always land on the super admin login page UI
    if (isRecovery) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    if (user) {
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', req.url))
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
    return supabaseResponse
  }

  // Allow admin login page to render for both authenticated and unauthenticated users
  if (req.nextUrl.pathname === '/admin/login') {
    return supabaseResponse
  }

  // Protect all other /admin routes: unauthenticated users should go to /admin/login
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    // Authenticated users (including non-super-admins) can proceed; client-side /api/check-admin
    // will enforce super admin access and redirect as needed.
    return supabaseResponse
  }

  if (isProtectedRoute && !user) {
    const target = isRecovery ? '/admin/login' : '/login'
    return NextResponse.redirect(new URL(target, req.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
