/**
 * Script: middleware.ts
 * Description: Auth middleware - protects routes, requires @keboola.com/@keboola.consulting
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-09
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = 'https://odvhuaehmuiyiswtbspu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdmh1YWVobXVpeWlzd3Ric3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTk5NzksImV4cCI6MjA4MTYzNTk3OX0.4P3IsggQzFYMjVUZCD4pg6d9grGts4vHnnCM0zVcEDk'

const ALLOWED_DOMAINS = ['keboola.com', 'keboola.consulting']

const PUBLIC_ROUTES = ['/login', '/auth/callback', '/api/']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  const email = user.email
  if (email) {
    const domain = email.split('@')[1]
    if (!ALLOWED_DOMAINS.includes(domain)) {
      await supabase.auth.signOut()
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('error', 'unauthorized_domain')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
