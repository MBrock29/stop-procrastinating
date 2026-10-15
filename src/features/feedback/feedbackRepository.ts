import { getSupabaseBrowserClient } from '../../lib/supabase'

export type AiCardFeedbackType = 'useful' | 'incorrect' | 'too_easy' | 'too_hard' | 'weak_citation'

export async function submitAiCardFeedback(input: { userId: string; cardId: string;
  sourceId?: string | null; feedbackType: AiCardFeedbackType; notes?: string | null }) {
  const client = getSupabaseBrowserClient()
  if (!client) throw new Error('Feedback requires a configured Supabase project.')
  const { error } = await client.from('ai_card_feedback').upsert({ user_id: input.userId,
    card_id: input.cardId, source_id: input.sourceId ?? null, feedback_type: input.feedbackType,
    notes: input.notes?.trim() || null, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,card_id' })
  if (error) throw error
}
