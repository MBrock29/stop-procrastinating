import { createClient } from 'npm:@supabase/supabase-js@2';
import { createStripePortalSession } from '../_shared/stripe.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const appBaseUrl = Deno.env.get('APP_URL') ?? 'https://betterfocus.live';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(
      { error: 'Supabase function environment is not configured.' },
      500,
    );
  }

  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header.' }, 401);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Unable to validate the current user.' }, 401);
  }

  const { data: billingAccount } = await serviceClient
    .from('user_billing_accounts')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!billingAccount?.stripe_customer_id) {
    return jsonResponse(
      { error: 'No Stripe customer record was found for this account yet.' },
      404,
    );
  }

  const portalSession = await createStripePortalSession({
    customerId: billingAccount.stripe_customer_id,
    returnUrl: `${appBaseUrl}/app/settings`,
  });

  return jsonResponse({
    url: portalSession.url,
  });
});
