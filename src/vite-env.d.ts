/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_APP_URL?: string
  readonly VITE_OPENAI_GENERATION_MODEL?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  readonly VITE_UMAMI_WEBSITE_ID?: string
  readonly VITE_UMAMI_SCRIPT_URL?: string
  readonly VITE_ENABLE_BYOK?: string
  readonly VITE_BYOK_ACCESS_EMAILS?: string
  readonly VITE_PREMIUM_ACCESS_EMAILS?: string
  readonly VITE_PRO_ACCESS_EMAILS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
