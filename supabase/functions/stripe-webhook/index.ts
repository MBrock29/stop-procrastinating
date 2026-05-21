import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  resolveBillingIntervalForPriceId,
  resolvePlanTierForPriceId,
  verifyStripeWebhookSignature,
} from '../_shared/stripe.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, stripe-signature',
};

type BillingSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';

interface StripeCheckoutSession {
  customer?: string | null;
  client_reference_id?: string | null;
  subscription?: string | null;
}

interface StripeSubscriptionItemPrice {
  id: string;
}

interface StripeSubscriptionItem {
  price: StripeSubscriptionItemPrice;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: BillingSubscriptionStatus;
  cancel_at_period_end: boolean;
  current_period_end: number | null;
  currency: string | null;
  items: {
    data: StripeSubscriptionItem[];
  };
  metadata?: {
    supabase_user_id?: string;
  };
}

interface StripeEvent<T> {
  type: string;
  data: {
    object: T;
  };
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function syncSubscriptionToDatabase(
  serviceClient: ReturnType<typeof createClient>,
  subscription: StripeSubscription,
) {
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const planTier = priceId ? resolvePlanTierForPriceId(priceId) : null;
  const billingInterval = priceId
    ? resolveBillingIntervalForPriceId(priceId)
    : null;

  let userId: string | null = null;

  const { data: existingByCustomer } = await serviceClient
    .from('user_billing_accounts')
    .select('user_id')
    .eq('stripe_customer_id', subscription.customer)
    .maybeSingle();

  if (existingByCustomer?.user_id) {
    userId = existingByCustomer.user_id;
  } else if (subscription.metadata?.supabase_user_id) {
    userId = subscription.metadata.supabase_user_id;
  }

  if (!userId) {
    return;
  }

  const nextPlanTier =
    planTier &&
    (subscription.status === 'active' ||
      subscription.status === 'trialing' ||
      subscription.status === 'past_due')
      ? planTier
      : 'free';

  await serviceClient.from('user_billing_accounts').upsert(
    {
      user_id: userId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan_tier: nextPlanTier,
      billing_interval: billingInterval,
      billing_currency: subscription.currency,
      subscription_status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    },
  );

  const { data: existingAiSettings } = await serviceClient
    .from('user_ai_settings')
    .select(
      'byok_provider, preferred_model, show_continue_to_site_button, premium_interrupt_mode, redirect_back_mode, redirect_back_card_count',
    )
    .eq('user_id', userId)
    .maybeSingle();

  await serviceClient.from('user_ai_settings').upsert(
    {
      user_id: userId,
      plan_tier: nextPlanTier,
      byok_provider: existingAiSettings?.byok_provider ?? 'openrouter',
      preferred_model:
        nextPlanTier === 'premium'
          ? 'gpt-5.4-mini'
          : nextPlanTier === 'pro'
            ? 'gpt-5-mini'
            : 'gpt-4.1-mini',
      show_continue_to_site_button:
        existingAiSettings?.show_continue_to_site_button ?? true,
      premium_interrupt_mode: existingAiSettings?.premium_interrupt_mode ?? 'cards',
      redirect_back_mode: existingAiSettings?.redirect_back_mode ?? 'manual',
      redirect_back_card_count: existingAiSettings?.redirect_back_card_count ?? 1,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    },
  );
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(
      { error: 'Supabase function environment is not configured.' },
      500,
    );
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return jsonResponse({ error: 'Missing Stripe signature.' }, 400);
  }

  const payload = await request.text();
  const isValid = await verifyStripeWebhookSignature(payload, signature);

  if (!isValid) {
    return jsonResponse({ error: 'Invalid Stripe signature.' }, 400);
  }

  const event = JSON.parse(payload) as
    | StripeEvent<StripeCheckoutSession>
    | StripeEvent<StripeSubscription>;

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as StripeCheckoutSession;

    if (session.client_reference_id && session.customer) {
      await serviceClient.from('user_billing_accounts').upsert(
        {
          user_id: session.client_reference_id,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription ?? null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        },
      );
    }

    return jsonResponse({ received: true });
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as StripeSubscription;
    await syncSubscriptionToDatabase(serviceClient, subscription);
    return jsonResponse({ received: true });
  }

  return jsonResponse({ received: true });
});
