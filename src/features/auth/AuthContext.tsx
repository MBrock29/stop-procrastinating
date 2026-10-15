import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'
import { clearDemoUser, getDemoUser, setDemoUser } from '../../lib/demoAuth'
import { env, hasSupabaseEnv } from '../../lib/env'
import { getSupabaseBrowserClient } from '../../lib/supabase'
import type { UserProfile } from '../../types/domain'

function mapSupabaseUser(session: Session | null): UserProfile | null {
  if (!session?.user.email) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
  }
}

function cleanupAuthCallbackUrl() {
  const url = new URL(window.location.href)
  const authKeys = ['code', 'error', 'error_code', 'error_description', 'state']
  const authHashKeys = [
    'access_token',
    'expires_at',
    'expires_in',
    'provider_token',
    'refresh_token',
    'sb',
    'token_type',
    'type',
  ]

  let changed = false

  authKeys.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  })

  if (url.hash) {
    const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
    const hashParams = new URLSearchParams(hash)

    authHashKeys.forEach((key) => {
      if (hashParams.has(key)) {
        hashParams.delete(key)
        changed = true
      }
    })

    const nextHash = hashParams.toString()
    url.hash = nextHash ? `#${nextHash}` : ''
  }

  if (changed) {
    const nextUrl = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState({}, document.title, nextUrl)
  }
}

function readAuthHashParams() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (!accessToken || !refreshToken) {
    return null
  }

  return {
    accessToken,
    refreshToken,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasSupabaseEnv) {
      const demoUser = getDemoUser()
      setUser(demoUser)
      setSession(null)
      setAuthError(null)
      setStatus(demoUser ? 'authenticated' : 'unauthenticated')
      return
    }

    const client = getSupabaseBrowserClient()

    if (!client) {
      setStatus('unauthenticated')
      return
    }

    let isMounted = true

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setAuthError(null)
      setSession(nextSession)
      setUser(mapSupabaseUser(nextSession))
      setStatus(nextSession ? 'authenticated' : 'unauthenticated')
    })

    async function hydrateSession() {
      const url = new URL(window.location.href)
      const authCode = url.searchParams.get('code')
      const authTokens = readAuthHashParams()

      try {
        if (authCode) {
          const { data, error } = await client.auth.exchangeCodeForSession(authCode)

          if (error) {
            throw error
          }

          if (!isMounted) {
            return
          }

          cleanupAuthCallbackUrl()
          setAuthError(null)
          setSession(data.session)
          setUser(mapSupabaseUser(data.session))
          setStatus(data.session ? 'authenticated' : 'unauthenticated')
          return
        }

        if (authTokens) {
          const { data, error } = await client.auth.setSession({
            access_token: authTokens.accessToken,
            refresh_token: authTokens.refreshToken,
          })

          if (error) {
            throw error
          }

          if (!isMounted) {
            return
          }

          cleanupAuthCallbackUrl()
          setAuthError(null)
          setSession(data.session)
          setUser(mapSupabaseUser(data.session))
          setStatus(data.session ? 'authenticated' : 'unauthenticated')
          return
        }

        const { data } = await client.auth.getSession()

        if (!isMounted) {
          return
        }

        setAuthError(null)
        setSession(data.session)
        setUser(mapSupabaseUser(data.session))
        setStatus(data.session ? 'authenticated' : 'unauthenticated')
      } catch (error) {
        if (!isMounted) {
          return
        }

        const message =
          error instanceof Error ? error.message : 'Unable to restore your Supabase session.'
        console.error('Supabase auth bootstrap failed:', error)
        setAuthError(message)
        setSession(null)
        setUser(null)
        setStatus('unauthenticated')
      }
    }

    void hydrateSession()

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      mode: hasSupabaseEnv ? 'supabase' : 'demo',
      user,
      session,
      authError,
      async signInWithPassword(email, password) {
        if (!hasSupabaseEnv) {
          setDemoUser(email)
          setAuthError(null)
          setUser({ id: 'demo-user', email })
          setStatus('authenticated')
          return
        }

        const client = getSupabaseBrowserClient()

        if (!client) {
          throw new Error('Supabase is not configured.')
        }

        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }

        setAuthError(null)
      },
      async signUpWithPassword(email, password) {
        if (!hasSupabaseEnv) {
          setDemoUser(email)
          setAuthError(null)
          setUser({ id: 'demo-user', email })
          setStatus('authenticated')
          return
        }

        const client = getSupabaseBrowserClient()

        if (!client) {
          throw new Error('Supabase is not configured.')
        }

        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: new URL('/app/onboarding', env.appUrl).toString(),
          },
        })

        if (error) {
          throw error
        }

        setAuthError(null)

        if (data.session) {
          setSession(data.session)
          setUser(mapSupabaseUser(data.session))
          setStatus('authenticated')
        }
      },
      async signInWithGoogle(redirectPath = '/app') {
        if (!hasSupabaseEnv) {
          const email = 'demo@example.com'
          setDemoUser(email)
          setAuthError(null)
          setUser({ id: 'demo-user', email })
          setStatus('authenticated')
          return
        }

        const client = getSupabaseBrowserClient()

        if (!client) {
          throw new Error('Supabase is not configured.')
        }

        const { error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: new URL(redirectPath.startsWith('/') && !redirectPath.startsWith('//') && !redirectPath.includes('\\') ? redirectPath : '/app', env.appUrl).toString(),
          },
        })

        if (error) {
          throw error
        }
      },
      async signOut() {
        if (!hasSupabaseEnv) {
          clearDemoUser()
          setAuthError(null)
          setUser(null)
          setStatus('unauthenticated')
          return
        }

        const client = getSupabaseBrowserClient()

        if (!client) {
          return
        }

        const { error } = await client.auth.signOut()

        if (error) {
          throw error
        }

        setAuthError(null)
      },
    }),
    [authError, session, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
