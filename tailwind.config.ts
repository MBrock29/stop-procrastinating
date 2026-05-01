import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        mist: '#e2e8f0',
        tide: '#cbd5e1',
        reef: '#0f766e',
        surf: '#14b8a6',
        ember: '#ea580c',
        sand: '#f8fafc',
      },
      boxShadow: {
        panel: '0 24px 80px rgba(15, 23, 42, 0.12)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'soft-grid':
          'linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
} satisfies Config
