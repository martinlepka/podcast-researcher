/**
 * Script: lib/supabase/client.ts
 * Description: Browser-side Supabase client with SSR support
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-09
 */

import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://odvhuaehmuiyiswtbspu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdmh1YWVobXVpeWlzd3Ric3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTk5NzksImV4cCI6MjA4MTYzNTk3OX0.4P3IsggQzFYMjVUZCD4pg6d9grGts4vHnnCM0zVcEDk'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
