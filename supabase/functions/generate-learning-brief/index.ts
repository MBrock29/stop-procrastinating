import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type PlanTier = 'free' | 'pro' | 'premium' | 'byok';
type AiProvider = 'openai' | 'openrouter';
type SupportedAiModel = 'gpt-4.1-mini' | 'gpt-5-mini' | 'gpt-5.4-mini';

interface UserAiSettingsRow {
  plan_tier: PlanTier;
  preferred_model: SupportedAiModel;
}

interface LearningBriefCardInput {
  question: string;
  answer: string;
}

interface BriefResult {
  title: string;
  content: string;
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const platformProvider = (Deno.env.get('AI_GENERATION_PROVIDER') ??
  'openai') as AiProvider;
const platformOpenAiApiKey = Deno.env.get('OPENAI_API_KEY');
const platformOpenRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function getDefaultSettings(): UserAiSettingsRow {
  return {
    plan_tier: 'free',
    preferred_model: 'gpt-4.1-mini',
  };
}

function resolveCanonicalModel(settings: UserAiSettingsRow): SupportedAiModel {
  if (settings.plan_tier === 'premium') {
    return 'gpt-5.4-mini';
  }

  if (settings.plan_tier === 'pro') {
    return 'gpt-5-mini';
  }

  return settings.preferred_model ?? 'gpt-4.1-mini';
}

function resolveProviderModel(model: SupportedAiModel, provider: AiProvider) {
  if (provider === 'openrouter') {
    return `openai/${model}`;
  }

  return model;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildCardsDigest(cards: LearningBriefCardInput[]) {
  return cards
    .slice(0, 24)
    .map((card, index) =>
      `${index + 1}. Q: ${truncate(card.question.trim(), 180)}\nA: ${truncate(card.answer.trim(), 260)}`,
    )
    .join('\n\n');
}

function buildPrompt(topic: string, cards: LearningBriefCardInput[]) {
  const cardsDigest = buildCardsDigest(cards);

  return `You are creating a recap for a learner who has just studied a pack of flashcards about "${topic}".

Use the actual pack content below to summarise what they have learned overall. Keep the final summary under 350 words.

Your summary should:
- recap the overall theme of the pack
- group the main ideas into a few clear themes
- mention one practical example or application if useful
- mention one important pitfall, misconception, or trade-off to remember
- feel like a helpful recap of this specific pack, not a generic topic overview

Flashcard pack:
${cardsDigest}`;
}

function buildBriefSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      content: { type: 'string' },
    },
    required: ['title', 'content'],
  };
}

function parseBrief(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object') {
    throw new HttpError(502, 'The model returned an invalid brief.');
  }

  const brief = parsed as { title?: string; content?: string };

  if (!brief.title?.trim() || !brief.content?.trim()) {
    throw new HttpError(502, 'The model returned an incomplete brief.');
  }

  return {
    title: brief.title.trim(),
    content: brief.content.trim(),
  } satisfies BriefResult;
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

    throw new HttpError(502, 'Unable to parse the generated brief.');
  }
}

async function generateWithOpenAi(
  topic: string,
  cards: LearningBriefCardInput[],
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
              text: 'Generate concise, technically accurate learning summaries with no markdown lists or headings beyond the title field.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildPrompt(topic, cards),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'generated_learning_brief',
          strict: true,
          schema: buildBriefSchema(),
        },
      },
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    output_text?: string;
  };

  if (!response.ok) {
    throw new HttpError(
      response.status,
      payload.error?.message ?? 'OpenAI brief generation failed.',
    );
  }

  return parseBrief(extractJsonPayload(payload.output_text ?? ''));
}

async function generateWithOpenRouter(
  topic: string,
  cards: LearningBriefCardInput[],
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
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Generate concise, technically accurate learning summaries and return only JSON.',
          },
          {
            role: 'user',
            content: `${buildPrompt(topic, cards)} Return JSON with exactly {"title": string, "content": string}.`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'generated_learning_brief',
            strict: true,
            schema: buildBriefSchema(),
          },
        },
      }),
    },
  );

  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    throw new HttpError(
      response.status,
      payload.error?.message ?? 'OpenRouter brief generation failed.',
    );
  }

  const rawText = payload.choices?.[0]?.message?.content ?? '';
  return parseBrief(extractJsonPayload(rawText));
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new HttpError(500, 'Supabase environment variables are missing.');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: request.headers.get('Authorization') ?? '',
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new HttpError(401, 'Unable to validate the current user.');
    }

    const body = (await request.json()) as {
      topic?: string;
      cards?: LearningBriefCardInput[];
    };

    const topic = body.topic?.trim();
    const cards = (body.cards ?? [])
      .filter((card) =>
        typeof card?.question === 'string' &&
        typeof card?.answer === 'string' &&
        card.question.trim() &&
        card.answer.trim()
      )
      .map((card) => ({
        question: card.question.trim(),
        answer: card.answer.trim(),
      }));

    if (!topic) {
      throw new HttpError(400, 'A topic is required.');
    }

    if (cards.length === 0) {
      throw new HttpError(400, 'At least one pack card is required.');
    }

    const { data: settingsRow } = await supabase
      .from('user_ai_settings')
      .select('plan_tier, preferred_model')
      .eq('user_id', user.id)
      .maybeSingle<UserAiSettingsRow>();

    const settings = settingsRow ?? getDefaultSettings();

    if (settings.plan_tier !== 'premium') {
      throw new HttpError(403, 'Premium is required to generate summaries.');
    }

    const model = resolveCanonicalModel(settings);
    const providerModel = resolveProviderModel(model, platformProvider);
    const apiKey =
      platformProvider === 'openrouter'
        ? platformOpenRouterApiKey
        : platformOpenAiApiKey;

    if (!apiKey) {
      throw new HttpError(500, 'The platform AI provider is not configured.');
    }

    const result =
      platformProvider === 'openrouter'
        ? await generateWithOpenRouter(topic, cards, providerModel, apiKey)
        : await generateWithOpenAi(topic, cards, providerModel, apiKey);

    return jsonResponse({
      ...result,
      meta: {
        model,
        kind: 'summary',
      },
    });
  } catch (error) {
    console.error('generate-learning-brief failed', error);

    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unexpected error.' },
      500,
    );
  }
});
