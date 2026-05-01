const browserOrigin =
  typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin

const appUrl = import.meta.env.VITE_APP_URL ?? browserOrigin

export const env = {
  appUrl,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  openaiModel: import.meta.env.VITE_OPENAI_GENERATION_MODEL ?? 'gpt-4o-mini',
}

export const hasSupabaseEnv = Boolean(env.supabaseUrl && env.supabaseAnonKey)
