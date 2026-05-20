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
    <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-6">
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
      <div className="grid grid-cols-7 items-end gap-4">
        {snapshots.map((snapshot) => {
          const height = Math.max(12, Math.round((snapshot.total / maxValue) * 112))

          return (
            <div key={snapshot.label} className="flex flex-col items-center gap-3">
              <div className="text-lg font-extrabold text-ink dark:text-white">
                {snapshot.total}
              </div>
              <div className="flex h-28 items-end">
                <div
                  className="w-9 rounded-t-[1.1rem] bg-reef/85"
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
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="rounded-2xl bg-[var(--app-surface-muted)] px-4 py-4"
          >
            <div className={`text-sm font-semibold ${segment.textColor}`}>{segment.label}</div>
            <div className="mt-2 text-3xl font-extrabold text-ink dark:text-white">
              {segment.value}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
              {total === 0 ? '0%' : `${Math.round((segment.value / total) * 100)}%`}
            </div>
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
              className="rounded-2xl bg-[var(--app-surface-muted)] px-4 py-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-ink dark:text-white">{item.topic}</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    {item.totalCards} card{item.totalCards === 1 ? '' : 's'} tracked
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[18rem]">
                  <div className="rounded-2xl bg-[var(--app-surface-strong)] px-3 py-3">
                    <div className="text-xl font-extrabold text-ink dark:text-white">
                      {item.knowCount}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      Know
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[var(--app-surface-strong)] px-3 py-3">
                    <div className="text-xl font-extrabold text-ink dark:text-white">
                      {item.semiCount}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                      Semi
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[var(--app-surface-strong)] px-3 py-3">
                    <div className="text-xl font-extrabold text-ink dark:text-white">
                      {item.notConfidentCount}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                      Not yet
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  )
}
