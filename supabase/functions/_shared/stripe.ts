export type CheckoutPlanTier = 'pro' | 'premium';
export type BillingInterval = 'month' | 'year';
export type BillingCurrency = 'usd' | 'gbp' | 'eur';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const priceIds = {
  pro: {
    month: Deno.env.get('STRIPE_PRICE_PRO_MONTHLY'),
    year: Deno.env.get('STRIPE_PRICE_PRO_ANNUAL'),
  },
  premium: {
    month: Deno.env.get('STRIPE_PRICE_PREMIUM_MONTHLY'),
    year: Deno.env.get('STRIPE_PRICE_PREMIUM_ANNUAL'),
  },
} as const;

function ensureStripeSecretKey() {
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  return stripeSecretKey;
}

export function ensureStripeWebhookSecret() {
  if (!stripeWebhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
  }

  return stripeWebhookSecret;
}

export function resolveStripePriceId(
  planTier: CheckoutPlanTier,
  billingInterval: BillingInterval,
) {
  const priceId = priceIds[planTier][billingInterval];

  if (!priceId) {
    throw new Error(
      `Missing Stripe price ID for ${planTier} ${billingInterval}.`,
    );
  }

  return priceId;
}

export function resolvePlanTierForPriceId(priceId: string) {
  if (
    priceId === priceIds.pro.month ||
    priceId === priceIds.pro.year
  ) {
    return 'pro' as const;
  }

  if (
    priceId === priceIds.premium.month ||
    priceId === priceIds.premium.year
  ) {
    return 'premium' as const;
  }

  return null;
}

export function resolveBillingIntervalForPriceId(priceId: string) {
  if (priceId === priceIds.pro.month || priceId === priceIds.premium.month) {
    return 'month' as const;
  }

  if (priceId === priceIds.pro.year || priceId === priceIds.premium.year) {
    return 'year' as const;
  }

  return null;
}

function encodeFormData(input: Record<string, string | number | boolean | null | undefined>) {
  const params = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    params.append(key, String(value));
  });

  return params;
}

async function stripeRequest(
  path: string,
  body: Record<string, string | number | boolean | null | undefined>,
) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ensureStripeSecretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encodeFormData(body),
  });

  const payload = await response.json();

  if (!response.ok) {
    const message =
      payload?.error?.message ?? 'Stripe request failed.';
    throw new Error(message);
  }

  return payload;
}

export async function createStripeCustomer(input: {
  email: string;
  userId: string;
}) {
  return stripeRequest('/v1/customers', {
    email: input.email,
    'metadata[supabase_user_id]': input.userId,
  });
}

export async function createStripeCheckoutSession(input: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  userEmail: string;
  planTier: CheckoutPlanTier;
  billingInterval: BillingInterval;
  currency?: BillingCurrency;
}) {
  return stripeRequest('/v1/checkout/sessions', {
    mode: 'subscription',
    customer: input.customerId,
    client_reference_id: input.userId,
    'line_items[0][price]': input.priceId,
    'line_items[0][quantity]': 1,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    allow_promotion_codes: true,
    currency: input.currency,
    'subscription_data[metadata][supabase_user_id]': input.userId,
    'subscription_data[metadata][user_email]': input.userEmail,
    'subscription_data[metadata][plan_tier]': input.planTier,
    'subscription_data[metadata][billing_interval]': input.billingInterval,
  });
}

export async function createStripePortalSession(input: {
  customerId: string;
  returnUrl: string;
}) {
  return stripeRequest('/v1/billing_portal/sessions', {
    customer: input.customerId,
    return_url: input.returnUrl,
  });
}

export async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string,
) {
  const secret = ensureStripeWebhookSecret();
  const entries = signatureHeader.split(',').map((part) => part.trim());
  const timestamp = entries.find((entry) => entry.startsWith('t='))?.slice(2);
  const signature = entries.find((entry) => entry.startsWith('v1='))?.slice(3);

  if (!timestamp || !signature) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signedPayload = `${timestamp}.${payload}`;
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload),
  );

  const expected = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return expected === signature;
}
