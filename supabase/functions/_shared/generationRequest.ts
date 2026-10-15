import { createClient } from 'npm:@supabase/supabase-js@2'

export async function resolveGenerationRequest(request: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey) throw new Error('Supabase function environment is not configured.')

  const suppliedWorkerSecret = request.headers.get('x-generation-worker-secret')
  const workerSecret = Deno.env.get('GENERATION_WORKER_SECRET')
  if (suppliedWorkerSecret) {
    if (!workerSecret || !serviceRoleKey || suppliedWorkerSecret !== workerSecret) {
      return { error: 'Invalid worker credentials.', status: 401 } as const
    }
    const userId = request.headers.get('x-generation-user-id')?.trim() ?? ''
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return { error: 'Invalid worker user identity.', status: 400 } as const
    }
    const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data, error } = await client.auth.admin.getUserById(userId)
    if (error || !data.user) return { error: 'Worker user was not found.', status: 404 } as const
    return { client, user: data.user, internal: true } as const
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return { error: 'Missing authorization header.', status: 401 } as const
  const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return { error: 'Unable to validate the current user.', status: 401 } as const
  return { client, user: data.user, internal: false } as const
}
