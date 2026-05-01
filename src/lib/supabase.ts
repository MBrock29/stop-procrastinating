import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, hasSupabaseEnv } from './env'

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient() {
  if (!hasSupabaseEnv) {
    return null
  }

  if (!browserClient) {
    browserClient = createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }

  return browserClient
}
