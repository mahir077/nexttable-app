import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: req.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Auth callback route - always allow
  if (req.nextUrl.pathname.startsWith('/auth/callback')) {
    return response
  }

  // Root: redirect to dashboard if logged in, otherwise to login
  if (req.nextUrl.pathname === '/') {
    if (session) return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Auth routes (login, signup) - redirect to dashboard if logged in
  if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return response
  }

  // Admin routes - require login (e.g. /admin/create-client)
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return response
  }

  // Protected routes - redirect to login if not logged in
  const protectedRoutes = [
    '/dashboard',
    '/pos',
    '/menu',
    '/orders',
    '/kitchen',
    '/billing',
    '/reports',
    '/stock',
    '/suppliers',
    '/purchases',
    '/reservations',
    '/settings'
  ]

  const isProtectedRoute = protectedRoutes.some(route =>
    req.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}
