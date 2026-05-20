const browserOrigin =
  typeof window === 'undefined' ? 'https://betterfocus.live' : window.location.origin

const appUrl = import.meta.env.VITE_APP_URL ?? browserOrigin
const enableByok = String(import.meta.env.VITE_ENABLE_BYOK ?? 'false') === 'true'
const umamiWebsiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
const umamiScriptUrl =
  import.meta.env.VITE_UMAMI_SCRIPT_URL ?? 'https://cloud.umami.is/script.js'
const byokAccessEmails = String(
  import.meta.env.VITE_BYOK_ACCESS_EMAILS ??
    'mbrock19@gmail.com,brockstaayt@gmail.com',
)
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)
const premiumAccessEmails = String(
  import.meta.env.VITE_PREMIUM_ACCESS_EMAILS ??
    'mbrock19@gmail.com,brockstaayt@gmail.com,mafeco97@icloud.com',
)
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

export const env = {
  appUrl,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  openaiModel: import.meta.env.VITE_OPENAI_GENERATION_MODEL ?? 'gpt-4.1-mini',
  enableByok,
  umamiWebsiteId,
  umamiScriptUrl,
  byokAccessEmails,
  premiumAccessEmails,
}

export const hasSupabaseEnv = Boolean(env.supabaseUrl && env.supabaseAnonKey)
