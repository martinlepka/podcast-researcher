/**
 * Script: lib/supabase/server.ts
 * Description: Server-side Supabase client with cookie handling
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-09
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL = 'https://odvhuaehmuiyiswtbspu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdmh1YWVobXVpeWlzd3Ric3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTk5NzksImV4cCI6MjA4MTYzNTk3OX0.4P3IsggQzFYMjVUZCD4pg6d9grGts4vHnnCM0zVcEDk'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Handle cookie setting in Server Components
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // Handle cookie removal in Server Components
        }
      },
    },
  })
}
