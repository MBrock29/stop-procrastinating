const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin

export const env = {
  appUrl,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
}

export const hasSupabaseEnv = Boolean(env.supabaseUrl && env.supabaseAnonKey)
