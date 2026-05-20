import type { ReactNode } from 'react'

interface DailyReviewSnapshot {
  label: string
  total: number
  know: number
  semi: number
  notConfident: number
}

interface TopicInsight {
  topic: string
  totalCards: number
  knowCount: number
  semiCount: number
  notConfidentCount: number
  score: number
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5">
      <div className="font-bold text-ink dark:text-white">{title}</div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">{subtitle}</div>
      <div className="mt-5">{children}</div>
    </div>
  )
}

export function WeeklyReviewChart({
  snapshots,
}: {
  snapshots: DailyReviewSnapshot[]
}) {
  const maxValue = Math.max(...snapshots.map((item) => item.total), 1)

  return (
    <ChartCard
      title="Weekly review activity"
      subtitle="How many review decisions you made each day"
    >
      <div className="grid grid-cols-7 items-end gap-3">
        {snapshots.map((snapshot) => {
          const height = Math.max(10, Math.round((snapshot.total / maxValue) * 120))

          return (
            <div key={snapshot.label} className="flex flex-col items-center gap-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                {snapshot.total}
              </div>
              <div className="flex h-32 items-end">
                <div
                  className="w-8 rounded-t-2xl bg-reef/85"
                  style={{ height: `${height}px` }}
                />
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                {snapshot.label}
              </div>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

export function ConfidenceBreakdownChart({
  know,
  semi,
  notConfident,
}: {
  know: number
  semi: number
  notConfident: number
}) {
  const total = know + semi + notConfident
  const segments = [
    {
      label: 'Know',
      value: know,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
    },
    {
      label: 'Semi-confident',
      value: semi,
      color: 'bg-amber-400',
      textColor: 'text-amber-700',
    },
    {
      label: 'Not confident',
      value: notConfident,
      color: 'bg-rose-500',
      textColor: 'text-rose-700',
    },
  ]

  return (
    <ChartCard
      title="Confidence mix"
      subtitle="Overall split across all review decisions"
    >
      <div className="overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="flex h-4 w-full">
          {segments.map((segment) => {
            const width = total === 0 ? 0 : (segment.value / total) * 100

            return (
              <div
                key={segment.label}
                className={segment.color}
                style={{ width: `${width}%` }}
              />
            )
          })}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between text-sm">
            <span className={`font-semibold ${segment.textColor}`}>{segment.label}</span>
            <span className="text-slate-600 dark:text-slate-300">{segment.value}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

export function TopicInsightList({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: TopicInsight[]
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      {items.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-300">
          Generate and review a few topic packs to unlock this insight.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.topic}
              className="rounded-2xl bg-[var(--app-surface-muted)] px-4 py-3"
            >
              <div className="font-semibold text-ink dark:text-white">{item.topic}</div>
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                {item.totalCards} cards · Know {item.knowCount} · Semi {item.semiCount} · Not confident {item.notConfidentCount}
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  )
}
