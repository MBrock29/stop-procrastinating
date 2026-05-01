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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!hasSupabaseEnv) {
      const demoUser = getDemoUser()
      setUser(demoUser)
      setSession(null)
      setStatus(demoUser ? 'authenticated' : 'unauthenticated')
      return
    }

    const client = getSupabaseBrowserClient()

    if (!client) {
      setStatus('unauthenticated')
      return
    }

    let isMounted = true

    client.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return
      }

      setSession(data.session)
      setUser(mapSupabaseUser(data.session))
      setStatus(data.session ? 'authenticated' : 'unauthenticated')
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(mapSupabaseUser(nextSession))
      setStatus(nextSession ? 'authenticated' : 'unauthenticated')
    })

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
      async signInWithPassword(email, password) {
        if (!hasSupabaseEnv) {
          setDemoUser(email)
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
      },
      async signInWithGoogle() {
        if (!hasSupabaseEnv) {
          const email = 'demo@example.com'
          setDemoUser(email)
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
            redirectTo: `${env.appUrl}/app`,
          },
        })

        if (error) {
          throw error
        }
      },
      async signOut() {
        if (!hasSupabaseEnv) {
          clearDemoUser()
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
      },
    }),
    [session, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
