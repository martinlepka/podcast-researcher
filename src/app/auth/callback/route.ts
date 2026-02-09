/**
 * Script: app/auth/callback/route.ts
 * Description: OAuth callback handler for Google SSO
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-09
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://odvhuaehmuiyiswtbspu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdmh1YWVobXVpeWlzd3Ric3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTk5NzksImV4cCI6MjA4MTYzNTk3OX0.4P3IsggQzFYMjVUZCD4pg6d9grGts4vHnnCM0zVcEDk'

const ALLOWED_DOMAINS = ['keboola.com', 'keboola.consulting']

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code) {
    console.error('No code in callback')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.delete({ name, ...options })
      },
    },
  })

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('Code exchange error:', exchangeError)

    if (exchangeError.message?.includes('not allowed')) {
      return NextResponse.redirect(`${origin}/login?error=unauthorized_domain`)
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
    )
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email) {
    const domain = user.email.split('@')[1]
    if (!ALLOWED_DOMAINS.includes(domain)) {
      console.error('Unauthorized domain attempted login:', domain)
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=unauthorized_domain`)
    }
  }

  console.log('Successful login for:', user?.email)
  return NextResponse.redirect(`${origin}${next}`)
}
