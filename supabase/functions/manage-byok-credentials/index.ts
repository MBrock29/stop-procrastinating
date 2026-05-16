import { createClient } from 'npm:@supabase/supabase-js@2'
import { encryptApiKey } from '../_shared/byokCrypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AiProvider = 'openai' | 'openrouter'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const byokEncryptionKey = Deno.env.get('BYOK_ENCRYPTION_KEY')

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function sanitizeProvider(value: string | null | undefined): AiProvider | null {
  if (value === 'openai' || value === 'openrouter') {
    return value
  }

  return null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Supabase function environment is not configured.' }, 500)
  }

  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header.' }, 401)
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()

  if (userError || !user) {
    return jsonResponse({ error: 'Unable to validate the current user.' }, 401)
  }

  if (request.method === 'GET') {
    const { data, error } = await client
      .from('user_byok_credentials')
      .select('provider, key_last_four, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return jsonResponse({ error: error.message }, 400)
    }

    return jsonResponse({
      credential: data
        ? {
            provider: data.provider,
            lastFour: data.key_last_four,
            updatedAt: data.updated_at,
          }
        : null,
    })
  }

  if (request.method === 'DELETE') {
    const { error } = await client.from('user_byok_credentials').delete().eq('user_id', user.id)

    if (error) {
      return jsonResponse({ error: error.message }, 400)
    }

    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  if (!byokEncryptionKey) {
    return jsonResponse({ error: 'BYOK encryption is not configured.' }, 500)
  }

  const body = (await request.json()) as {
    provider?: string
    apiKey?: string
  }

  const provider = sanitizeProvider(body.provider)
  const apiKey = body.apiKey?.trim()

  if (!provider) {
    return jsonResponse({ error: 'A valid provider is required.' }, 400)
  }

  if (!apiKey) {
    return jsonResponse({ error: 'An API key is required.' }, 400)
  }

  const encryptedApiKey = await encryptApiKey(byokEncryptionKey, apiKey)
  const { data, error } = await client
    .from('user_byok_credentials')
    .upsert({
      user_id: user.id,
      provider,
      encrypted_api_key: encryptedApiKey,
      key_last_four: apiKey.slice(-4),
      updated_at: new Date().toISOString(),
    })
    .select('provider, key_last_four, updated_at')
    .single()

  if (error) {
    return jsonResponse({ error: error.message }, 400)
  }

  return jsonResponse({
    credential: {
      provider: data.provider,
      lastFour: data.key_last_four,
      updatedAt: data.updated_at,
    },
  })
})
