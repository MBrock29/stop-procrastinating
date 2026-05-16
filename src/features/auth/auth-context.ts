import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { UserProfile } from '../../types/domain'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
export type AuthMode = 'supabase' | 'demo'

export interface AuthContextValue {
  status: AuthStatus
  mode: AuthMode
  user: UserProfile | null
  session: Session | null
  authError: string | null
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
