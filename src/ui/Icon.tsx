import type { CSSProperties } from 'react'

const paths = {
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  book: 'M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z',
  home: 'm3 10 9-7 9 7v10H3Zm6 10v-7h6v7',
  shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Zm-4 9 3 3 5-6',
  settings: 'M4 7h16M4 17h16M9 4v6m6 4v6',
  plus: 'M12 5v14M5 12h14',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
  logout: 'M9 4H4v16h5m5-12 4 4-4 4m-6-4h12',
} as const

export function Icon({
  name,
  className = '',
  style,
}: {
  name: keyof typeof paths
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  )
}

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 16V8h5a4 4 0 0 1 0 8H5Zm6-8h3a4 4 0 0 1 0 8h-3"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="m16 4 3 3-3 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
