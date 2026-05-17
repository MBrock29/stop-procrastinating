import { createClient } from 'npm:@supabase/supabase-js@2';
import { decryptApiKey } from '../_shared/byokCrypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-byok-api-key, x-byok-provider',
};

type PlanTier = 'free' | 'pro' | 'byok';
type AiProvider = 'openai' | 'openrouter';
type SupportedAiModel = 'gpt-4.1-mini' | 'gpt-5.4-mini';
type EventStatus =
  | 'success'
  | 'limit_exceeded'
  | 'rate_limited'
  | 'blocked'
  | 'failed';

interface UserAiSettingsRow {
  plan_tier: PlanTier;
  byok_provider: AiProvider;
  preferred_model: SupportedAiModel;
}

interface UserByokCredentialRow {
  provider: AiProvider;
  encrypted_api_key: string;
}

interface AiUsageRecord {
  inputTokens: number | null;
  outputTokens: number | null;
}

interface GenerationResult {
  cards: Array<{ question: string; answer: string }>;
  usage: AiUsageRecord;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const platformProvider = (Deno.env.get('AI_GENERATION_PROVIDER') ??
  'openai') as AiProvider;
const platformOpenAiApiKey = Deno.env.get('OPENAI_API_KEY');
const platformOpenRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
const appBaseUrl = Deno.env.get('APP_URL') ?? 'https://betterfocus.live';
const byokEncryptionKey = Deno.env.get('BYOK_ENCRYPTION_KEY');

const FREE_MONTHLY_PACK_LIMIT = 3;
const PRO_MONTHLY_PACK_LIMIT = 25;
const FREE_MAX_CARDS = 10;
const PRO_MAX_CARDS = 100;
const BYOK_MAX_CARDS = 100;
const REQUEST_COOLDOWN_MS = 10_000;
const OWNER_OVERRIDE_EMAILS = new Set(['mbrock19@gmail.com']);
const OWNER_OVERRIDE_MAX_CARDS = 100;
const OWNER_OVERRIDE_DEFAULT_MODEL: SupportedAiModel = 'gpt-4.1-mini';

const MODEL_COSTS: Record<SupportedAiModel, { input: number; output: number }> =
  {
    'gpt-4.1-mini': {
      input: 0.4,
      output: 1.6,
    },
    'gpt-5.4-mini': {
      input: 0.75,
      output: 4.5,
    },
  };

const MODEL_ALIASES: Record<SupportedAiModel, Record<AiProvider, string>> = {
  'gpt-4.1-mini': {
    openai: 'gpt-4.1-mini',
    openrouter: 'openai/gpt-4.1-mini',
  },
  'gpt-5.4-mini': {
    openai: 'gpt-5.4-mini',
    openrouter: 'openai/gpt-5.4-mini',
  },
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function getStartOfMonth() {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

function getDefaultSettings(): UserAiSettingsRow {
  return {
    plan_tier: 'free',
    byok_provider: 'openrouter',
    preferred_model: 'gpt-4.1-mini',
  };
}

function getTierPolicy(planTier: PlanTier) {
  switch (planTier) {
    case 'pro':
      return {
        monthlyPackLimit: PRO_MONTHLY_PACK_LIMIT,
        maxCardsPerPack: PRO_MAX_CARDS,
        defaultModel: 'gpt-5.4-mini' as SupportedAiModel,
      };
    case 'byok':
      return {
        monthlyPackLimit: null,
        maxCardsPerPack: BYOK_MAX_CARDS,
        defaultModel: 'gpt-4.1-mini' as SupportedAiModel,
      };
    case 'free':
    default:
      return {
        monthlyPackLimit: FREE_MONTHLY_PACK_LIMIT,
        maxCardsPerPack: FREE_MAX_CARDS,
        defaultModel: 'gpt-4.1-mini' as SupportedAiModel,
      };
  }
}

function sanitizeProvider(value: string | null): AiProvider | null {
  if (value === 'openai' || value === 'openrouter') {
    return value;
  }

  return null;
}

function sanitizeModel(
  value: string | null | undefined,
): SupportedAiModel | null {
  if (value === 'gpt-4.1-mini' || value === 'gpt-5.4-mini') {
    return value;
  }

  return null;
}

function hasOwnerOverride(email: string | null | undefined) {
  return Boolean(email && OWNER_OVERRIDE_EMAILS.has(email.toLowerCase()));
}

function resolveCanonicalModel(
  settings: UserAiSettingsRow,
  requestedModel: SupportedAiModel | null,
  isOwnerOverride: boolean,
) {
  if (settings.plan_tier === 'byok') {
    return requestedModel ?? settings.preferred_model ?? 'gpt-4.1-mini';
  }

  if (isOwnerOverride) {
    return OWNER_OVERRIDE_DEFAULT_MODEL;
  }

  if (settings.plan_tier === 'free') {
    return 'gpt-4.1-mini';
  }

  if (settings.plan_tier === 'pro') {
    return 'gpt-5.4-mini';
  }

  return requestedModel ?? settings.preferred_model ?? 'gpt-4.1-mini';
}

function estimateCostUsd(model: SupportedAiModel, usage: AiUsageRecord) {
  if (usage.inputTokens == null || usage.outputTokens == null) {
    return null;
  }

  const pricing = MODEL_COSTS[model];
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

  return Number((inputCost + outputCost).toFixed(6));
}

function resolveProviderModel(model: SupportedAiModel, provider: AiProvider) {
  return MODEL_ALIASES[model][provider];
}

function buildPrompt(topic: string, cardCount: number) {
  return `Create ${cardCount} learning cards for the topic "${topic}". Focus on practical, interview-style or production-useful knowledge. Avoid duplicates. Return only the requested JSON schema.`;
}

function buildCardsSchema(cardCount: number) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      cards: {
        type: 'array',
        minItems: cardCount,
        maxItems: cardCount,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
          },
          required: ['question', 'answer'],
        },
      },
    },
    required: ['cards'],
  };
}

function parseCards(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object') {
    return [];
  }

  const cards =
    (parsed as { cards?: Array<{ question?: string; answer?: string }> })
      .cards ?? [];

  return cards
    .filter((card) => card.question?.trim() && card.answer?.trim())
    .map((card) => ({
      question: card.question!.trim(),
      answer: card.answer!.trim(),
    }));
}

function extractJsonPayload(rawText: string) {
  const trimmed = rawText.trim();

  if (!trimmed) {
    throw new HttpError(502, 'The model returned an empty response.');
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const objectStart = candidate.indexOf('{');
    const objectEnd = candidate.lastIndexOf('}');

    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(candidate.slice(objectStart, objectEnd + 1));
    }

    throw new HttpError(502, 'Unable to parse generated cards.');
  }
}

async function generateWithOpenAi(
  topic: string,
  cardCount: number,
  model: string,
  apiKey: string,
) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'Generate concise, technically accurate learning flashcards. Each card must have a clear question and a compact answer with no markdown.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildPrompt(topic, cardCount),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'generated_learning_cards',
          strict: true,
          schema: buildCardsSchema(cardCount),
        },
      },
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    output_text?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  if (!response.ok) {
    throw new HttpError(
      response.status,
      payload.error?.message ?? 'OpenAI generation failed.',
    );
  }

  try {
    const cards = parseCards(extractJsonPayload(payload.output_text ?? ''));

    if (!cards.length) {
      throw new HttpError(502, 'No valid cards were returned.');
    }

    if (cards.length !== cardCount) {
      throw new HttpError(
        502,
        `The model returned ${cards.length} cards instead of the requested ${cardCount}. Please try again.`,
      );
    }

    return {
      cards,
      usage: {
        inputTokens: payload.usage?.input_tokens ?? null,
        outputTokens: payload.usage?.output_tokens ?? null,
      },
    } satisfies GenerationResult;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(502, 'Unable to parse generated cards.');
  }
}

async function generateWithOpenRouter(
  topic: string,
  cardCount: number,
  model: string,
  apiKey: string,
) {
  const response = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': appBaseUrl,
        'X-Title': 'Better Focus',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Generate concise, technically accurate learning flashcards. Each card must have a clear question and a compact answer with no markdown.',
          },
          {
            role: 'user',
            content: buildPrompt(topic, cardCount),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'generated_learning_cards',
            strict: true,
            schema: buildCardsSchema(cardCount),
          },
        },
      }),
    },
  );

  const payload = (await response.json()) as {
    error?: { message?: string };
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  if (!response.ok) {
    throw new HttpError(
      response.status,
      payload.error?.message ?? 'OpenRouter generation failed.',
    );
  }

  const content = payload.choices?.[0]?.message?.content;
  const rawText = Array.isArray(content)
    ? content.map((item) => item.text ?? '').join('')
    : (content ?? '');

  try {
    const cards = parseCards(extractJsonPayload(rawText));

    if (!cards.length) {
      throw new HttpError(502, 'No valid cards were returned.');
    }

    if (cards.length !== cardCount) {
      throw new HttpError(
        502,
        `The model returned ${cards.length} cards instead of the requested ${cardCount}. Please try again.`,
      );
    }

    return {
      cards,
      usage: {
        inputTokens: payload.usage?.prompt_tokens ?? null,
        outputTokens: payload.usage?.completion_tokens ?? null,
      },
    } satisfies GenerationResult;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(502, 'Unable to parse generated cards.');
  }
}

async function insertGenerationEvent(
  client: ReturnType<typeof createClient>,
  event: {
    userId: string;
    topic: string;
    planTier: PlanTier;
    provider: AiProvider;
    model: string;
    cardCount: number;
    status: EventStatus;
    inputTokens?: number | null;
    outputTokens?: number | null;
    estimatedCostUsd?: number | null;
    usedByok: boolean;
    failureReason?: string | null;
  },
) {
  const { error } = await client.from('ai_generation_events').insert({
    user_id: event.userId,
    topic: event.topic,
    plan_tier: event.planTier,
    provider: event.provider,
    model: event.model,
    card_count: event.cardCount,
    status: event.status,
    input_tokens: event.inputTokens ?? null,
    output_tokens: event.outputTokens ?? null,
    estimated_cost_usd: event.estimatedCostUsd ?? null,
    used_byok: event.usedByok,
    failure_reason: event.failureReason ?? null,
  });

  if (error) {
    console.error('Unable to insert ai_generation_event:', error.message);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(
      { error: 'Supabase function environment is not configured.' },
      500,
    );
  }

  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header.' }, 401);
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Unable to validate the current user.' }, 401);
  }

  const body = (await request.json()) as {
    topic?: string;
    cardCount?: number;
    requestedModel?: string;
  };

  const topic = body.topic?.trim();
  const requestedModel = sanitizeModel(body.requestedModel);
  const requestedCardCount = Math.max(1, Number(body.cardCount ?? 10) || 1);

  const { data: settingsData } = await client
    .from('user_ai_settings')
    .select('plan_tier, byok_provider, preferred_model')
    .eq('user_id', user.id)
    .maybeSingle();

  const settings =
    (settingsData as UserAiSettingsRow | null) ?? getDefaultSettings();
  const isOwnerOverride = hasOwnerOverride(user.email);
  const canonicalModel = resolveCanonicalModel(
    settings,
    requestedModel,
    isOwnerOverride,
  );
  const policy = isOwnerOverride
    ? {
        monthlyPackLimit: null,
        maxCardsPerPack: OWNER_OVERRIDE_MAX_CARDS,
        defaultModel: canonicalModel,
      }
    : getTierPolicy(settings.plan_tier);

  if (!topic) {
    return jsonResponse({ error: 'A topic is required.' }, 400);
  }

  const { data: lastEventData } = await client
    .from('ai_generation_events')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!isOwnerOverride && lastEventData?.created_at) {
    const lastCreatedAt = new Date(lastEventData.created_at).getTime();

    if (Date.now() - lastCreatedAt < REQUEST_COOLDOWN_MS) {
      await insertGenerationEvent(client, {
        userId: user.id,
        topic,
        planTier: settings.plan_tier,
        provider:
          settings.plan_tier === 'byok'
            ? settings.byok_provider
            : platformProvider,
        model: canonicalModel,
        cardCount: requestedCardCount,
        status: 'rate_limited',
        usedByok: settings.plan_tier === 'byok',
        failureReason:
          'Generation requests are cooling down. Please wait a few seconds.',
      });

      return jsonResponse(
        { error: 'Please wait a few seconds before generating another pack.' },
        429,
      );
    }
  }

  const { count: monthlySuccessCount } = await client
    .from('ai_generation_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'success')
    .gte('created_at', getStartOfMonth());

  if (
    !isOwnerOverride &&
    policy.monthlyPackLimit != null &&
    (monthlySuccessCount ?? 0) >= policy.monthlyPackLimit
  ) {
    await insertGenerationEvent(client, {
      userId: user.id,
      topic,
      planTier: settings.plan_tier,
      provider:
        settings.plan_tier === 'byok'
          ? settings.byok_provider
          : platformProvider,
      model: canonicalModel,
      cardCount: requestedCardCount,
      status: 'limit_exceeded',
      usedByok: settings.plan_tier === 'byok',
      failureReason: 'Monthly pack limit reached for the current plan.',
    });

    return jsonResponse(
      {
        error:
          settings.plan_tier === 'free'
            ? 'Free plan users can generate up to 3 packs per month.'
            : 'Monthly pack limit reached for this plan.',
      },
      429,
    );
  }

  if (requestedCardCount > policy.maxCardsPerPack) {
    await insertGenerationEvent(client, {
      userId: user.id,
      topic,
      planTier: settings.plan_tier,
      provider:
        settings.plan_tier === 'byok'
          ? settings.byok_provider
          : platformProvider,
      model: canonicalModel,
      cardCount: requestedCardCount,
      status: 'blocked',
      usedByok: settings.plan_tier === 'byok',
      failureReason: `Requested ${requestedCardCount} cards, which is above the current limit.`,
    });

    return jsonResponse(
      {
        error: `This plan allows up to ${policy.maxCardsPerPack} cards per pack.`,
      },
      400,
    );
  }

  const byokApiKey = request.headers.get('x-byok-api-key');
  const byokProviderHeader = sanitizeProvider(
    request.headers.get('x-byok-provider'),
  );
  const { data: storedByokData } =
    settings.plan_tier === 'byok'
      ? await client
          .from('user_byok_credentials')
          .select('provider, encrypted_api_key')
          .eq('user_id', user.id)
          .maybeSingle()
      : { data: null };
  const storedByokCredential =
    (storedByokData as UserByokCredentialRow | null) ?? null;
  const effectiveProvider =
    settings.plan_tier === 'byok'
      ? (storedByokCredential?.provider ??
        byokProviderHeader ??
        settings.byok_provider)
      : platformProvider;

  if (
    settings.plan_tier === 'byok' &&
    !byokApiKey &&
    (!storedByokCredential?.encrypted_api_key || !byokEncryptionKey)
  ) {
    return jsonResponse(
      { error: 'Add your own API key before using BYOK mode.' },
      400,
    );
  }

  const providerModel = resolveProviderModel(canonicalModel, effectiveProvider);
  const apiKey =
    settings.plan_tier === 'byok'
      ? (byokApiKey ??
        (storedByokCredential?.encrypted_api_key && byokEncryptionKey
          ? await decryptApiKey(
              byokEncryptionKey,
              storedByokCredential.encrypted_api_key,
            )
          : null))
      : effectiveProvider === 'openrouter'
        ? platformOpenRouterApiKey
        : platformOpenAiApiKey;

  if (!apiKey) {
    return jsonResponse(
      { error: `No API key is configured for ${effectiveProvider}.` },
      500,
    );
  }

  try {
    const generation =
      effectiveProvider === 'openrouter'
        ? await generateWithOpenRouter(
            topic,
            requestedCardCount,
            providerModel,
            apiKey,
          )
        : await generateWithOpenAi(
            topic,
            requestedCardCount,
            providerModel,
            apiKey,
          );

    const estimatedCostUsd = estimateCostUsd(canonicalModel, generation.usage);

    await insertGenerationEvent(client, {
      userId: user.id,
      topic,
      planTier: settings.plan_tier,
      provider: effectiveProvider,
      model: canonicalModel,
      cardCount: generation.cards.length,
      status: 'success',
      inputTokens: generation.usage.inputTokens,
      outputTokens: generation.usage.outputTokens,
      estimatedCostUsd,
      usedByok: settings.plan_tier === 'byok',
    });

    return jsonResponse({
      cards: generation.cards,
      meta: {
        planTier: settings.plan_tier,
        provider: effectiveProvider,
        model: canonicalModel,
        monthlyPacksUsed: (monthlySuccessCount ?? 0) + 1,
        monthlyPackLimit: policy.monthlyPackLimit,
        maxCardsPerPack: policy.maxCardsPerPack,
        usedByok: settings.plan_tier === 'byok',
        estimatedCostUsd,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to generate cards right now.';
    const status = error instanceof HttpError ? error.status : 500;

    await insertGenerationEvent(client, {
      userId: user.id,
      topic,
      planTier: settings.plan_tier,
      provider: effectiveProvider,
      model: canonicalModel,
      cardCount: requestedCardCount,
      status: 'failed',
      usedByok: settings.plan_tier === 'byok',
      failureReason: message,
    });

    return jsonResponse({ error: message }, status);
  }
});
