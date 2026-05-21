import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  createStripeCheckoutSession,
  createStripeCustomer,
  resolveStripePriceId,
  type BillingCurrency,
  type BillingInterval,
  type CheckoutPlanTier,
} from '../_shared/stripe.ts';

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

function sanitizePlanTier(value: string | null | undefined): CheckoutPlanTier | null {
  return value === 'pro' || value === 'premium' ? value : null;
}

function sanitizeBillingInterval(
  value: string | null | undefined,
): BillingInterval | null {
  return value === 'month' || value === 'year' ? value : null;
}

function sanitizeCurrency(value: string | null | undefined): BillingCurrency | null {
  if (value === 'usd' || value === 'gbp' || value === 'eur') {
    return value;
  }

  return null;
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

  if (userError || !user?.email) {
    return jsonResponse({ error: 'Unable to validate the current user.' }, 401);
  }

  const body = (await request.json()) as {
    planTier?: string;
    billingInterval?: string;
    currency?: string;
  };

  const planTier = sanitizePlanTier(body.planTier);
  const billingInterval = sanitizeBillingInterval(body.billingInterval);
  const currency = sanitizeCurrency(body.currency ?? null) ?? undefined;

  if (!planTier || !billingInterval) {
    return jsonResponse(
      { error: 'A valid plan and billing interval are required.' },
      400,
    );
  }

  const { data: billingAccount } = await serviceClient
    .from('user_billing_accounts')
    .select('stripe_customer_id, stripe_subscription_id, subscription_status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (
    billingAccount?.stripe_subscription_id &&
    billingAccount.subscription_status &&
    billingAccount.subscription_status !== 'inactive' &&
    billingAccount.subscription_status !== 'canceled'
  ) {
    return jsonResponse(
      {
        error:
          'This account already has an active billing subscription. Use the billing portal to manage plan changes.',
      },
      409,
    );
  }

  let stripeCustomerId = billingAccount?.stripe_customer_id ?? null;

  if (!stripeCustomerId) {
    const customer = await createStripeCustomer({
      email: user.email,
      userId: user.id,
    });
    stripeCustomerId = customer.id as string;
  }

  const priceId = resolveStripePriceId(planTier, billingInterval);
  const checkoutSession = await createStripeCheckoutSession({
    customerId: stripeCustomerId,
    priceId,
    successUrl: `${appBaseUrl}/app/settings?billing=success`,
    cancelUrl: `${appBaseUrl}/app/pricing?billing=cancelled`,
    userId: user.id,
    userEmail: user.email,
    planTier,
    billingInterval,
    currency,
  });

  await serviceClient.from('user_billing_accounts').upsert(
    {
      user_id: user.id,
      stripe_customer_id: stripeCustomerId,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    },
  );

  return jsonResponse({
    url: checkoutSession.url,
    sessionId: checkoutSession.id,
  });
});
