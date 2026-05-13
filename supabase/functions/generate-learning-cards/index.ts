const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
const openAiModel = Deno.env.get('OPENAI_GENERATION_MODEL') ?? 'gpt-4o-mini'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  if (!openAiApiKey) {
    return jsonResponse({ error: 'OPENAI_API_KEY is not configured.' }, 500)
  }

  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header.' }, 401)
  }

  const body = (await request.json()) as {
    topic?: string
    cardCount?: number
  }

  const topic = body.topic?.trim()
  const cardCount = Math.max(1, Math.min(50, Number(body.cardCount ?? 10)))

  if (!topic) {
    return jsonResponse({ error: 'A topic is required.' }, 400)
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({
      model: openAiModel,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'Generate concise, technically accurate learning flashcards. Each card must have a clear question and a compact answer with no markdown.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Create ${cardCount} learning cards for the topic "${topic}". Focus on practical, interview-style or production-useful knowledge. Avoid duplicates. Return only the requested JSON schema.`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'generated_learning_cards',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              cards: {
                type: 'array',
                minItems: 1,
                maxItems: 50,
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
          },
        },
      },
    }),
  })

  const payload = (await response.json()) as {
    error?: { message?: string }
    output_text?: string
  }

  if (!response.ok) {
    return jsonResponse(
      { error: payload.error?.message ?? 'OpenAI generation failed.' },
      response.status,
    )
  }

  try {
    const parsed = JSON.parse(payload.output_text ?? '{}') as {
      cards?: Array<{ question?: string; answer?: string }>
    }

    const cards = (parsed.cards ?? [])
      .filter((card) => card.question?.trim() && card.answer?.trim())
      .map((card) => ({
        question: card.question!.trim(),
        answer: card.answer!.trim(),
      }))

    if (!cards.length) {
      return jsonResponse({ error: 'No valid cards were returned.' }, 502)
    }

    return jsonResponse({ cards })
  } catch {
    return jsonResponse({ error: 'Unable to parse generated cards.' }, 502)
  }
})
