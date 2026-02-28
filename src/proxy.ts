import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Always redirect root to /login (auth handled client-side)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Allow all /admin routes through (except the login page, which is just a normal page)
  if (pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // All other routes are allowed – AuthContext on the client enforces auth/redirects
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
