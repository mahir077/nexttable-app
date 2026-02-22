import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: req,
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
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup') {
    if (user) {
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', req.url))
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
    return supabaseResponse
  }

  // Super admin panel temporarily disabled – redirect all /admin to dashboard
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', req.url))
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
