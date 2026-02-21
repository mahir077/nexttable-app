import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Copy session cookies and no-cache headers to redirect (so Vercel doesn't cache and session is kept)
function copySessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value, ...opts }) => {
    to.cookies.set(name, value, opts)
  })
  to.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  to.headers.set('Pragma', 'no-cache')
  return to
}

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: { headers: req.headers },
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

  // IMPORTANT: Use getUser() to refresh the session and revalidate the token.
  // getSession() does NOT revalidate and can cause session loss in production.
  const { data: { user } } = await supabase.auth.getUser()

  // Prevent Vercel/CDN from caching pages that depend on auth (so session cookies are always respected)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')

  // Auth callback route - always allow; return response so cookies are sent
  if (req.nextUrl.pathname.startsWith('/auth/callback')) {
    return response
  }

  // Root: redirect to dashboard if logged in, otherwise to login
  if (req.nextUrl.pathname === '/') {
    if (user) return copySessionCookies(response, NextResponse.redirect(new URL('/dashboard', req.url)))
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Auth routes (login, signup) - redirect to dashboard if logged in
  if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup') {
    if (user) {
      return copySessionCookies(response, NextResponse.redirect(new URL('/dashboard', req.url)))
    }
    return response
  }

  // Admin routes - require login
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return response
  }

  // Protected routes - redirect to login if not logged in
  const protectedRoutes = [
    '/dashboard', '/pos', '/menu', '/orders', '/kitchen', '/billing',
    '/reports', '/stock', '/suppliers', '/purchases', '/reservations', '/settings'
  ]
  const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}
