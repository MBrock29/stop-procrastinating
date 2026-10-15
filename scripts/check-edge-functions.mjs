import { build } from 'esbuild'

const entryPoints = [
  'supabase/functions/generate-learning-cards/index.ts',
  'supabase/functions/generate-learning-brief/index.ts',
  'supabase/functions/adaptive-tutor/index.ts',
  'supabase/functions/ingest-learning-source/index.ts',
  'supabase/functions/generate-grounded-learning-cards/index.ts',
  'supabase/functions/queue-learning-generation/index.ts',
  'supabase/functions/process-learning-generation-job/index.ts',
]

await build({ entryPoints, outdir: '.edge-contract-check', bundle: true, write: false,
  platform: 'neutral', format: 'esm', external: ['npm:*'] })
console.log(`Bundled ${entryPoints.length} Edge Function entry points.`)
