export const chromeStoreUrl =
  'https://chromewebstore.google.com/detail/better-focus/nfnolfdknehkaligmklfcnganbnmlmll'

export const PUBLIC_PLANS = {
  free: {
    name: 'Free',
    description: 'Experience the complete distraction-to-learning loop.',
    benefits: [
      'Interrupt distracting sites with quick learning challenges',
      'Start with ready-made learning templates',
      'Basic spaced repetition and progress',
      'A monthly allowance for new learning material',
    ],
  },
  paid: {
    name: 'Better Focus Pro',
    description: 'Personalised learning from your progress and your own material.',
    benefits: [
      'More personalised practice based on weak topics',
      'Learn from pasted notes, documents and sources',
      'Adaptive study recommendations',
      'Topic summaries and follow-up learning sets',
      'A larger monthly allowance for new learning material',
    ],
  },
} as const

export function isPublicPaidTier(tier: string) {
  return tier === 'pro' || tier === 'premium' || tier === 'byok'
}
