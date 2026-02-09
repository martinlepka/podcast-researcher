/**
 * Script: app/login/page.tsx
 * Description: Login page with Google SSO for Podcast Researcher
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-09
 */
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const next = searchParams.get('next') || '/'
          router.push(next)
        }
      } catch (e) {
        console.error('Session check error:', e)
      } finally {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [supabase, router, searchParams])

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      if (errorParam === 'unauthorized_domain') {
        setError('Only @keboola.com and @keboola.consulting email addresses can access this application.')
      } else {
        setError(decodeURIComponent(errorParam))
      }
    }
  }, [searchParams])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const redirectTo = `${window.location.origin}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            hd: 'keboola.com',
          },
        },
      })

      if (error) {
        console.error('Google sign-in error:', error)
        if (error.message?.includes('provider is not enabled') || error.message?.includes('Unsupported provider')) {
          setError('Google Sign-In is not yet configured. Please contact the administrator.')
        } else {
          setError(error.message || 'Failed to sign in with Google. Please try again.')
        }
        setLoading(false)
      }
    } catch (err) {
      console.error('Unexpected error during sign-in:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-fuchsia-950 to-pink-950">
        <div className="animate-pulse text-fuchsia-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-fuchsia-950 to-pink-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1a1025] rounded-xl border border-fuchsia-500/20 p-8 shadow-[0_0_30px_rgba(217,70,239,0.15)]">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Podcast Researcher
            </h1>
            <p className="text-fuchsia-300/70 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              AI-Powered Podcast Discovery
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(217,70,239,0.3)]"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>

          <div className="mt-6 p-4 bg-fuchsia-500/10 rounded-lg border border-fuchsia-500/20">
            <p className="text-xs text-fuchsia-300/60 text-center leading-relaxed" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Only <span className="text-fuchsia-400 font-semibold">@keboola.com</span> and{' '}
              <span className="text-fuchsia-400 font-semibold">@keboola.consulting</span> email
              addresses can access this application.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-fuchsia-400/40 mt-6" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          Keboola Marketing Operations
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-fuchsia-950 to-pink-950">
        <div className="animate-pulse text-fuchsia-400">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
