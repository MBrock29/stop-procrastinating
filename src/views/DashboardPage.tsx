import { Link } from 'react-router-dom'
import { useBlockedDomains } from '../features/blocked-domains/useBlockedDomains'
import { useLearningCards } from '../features/cards/useLearningCards'
import { useExtensionStatus } from '../features/extension/useExtensionStatus'
import { useOutcomeMetrics } from '../features/product/useOutcomeMetrics'
import {
  buildLearningTopics,
  topicPracticeUrl,
} from '../features/product/learningTopics'
import { Icon } from '../ui/Icon'

export function DashboardPage() {
  const { domains } = useBlockedDomains()
  const { cards, isLoading: loadingCards } = useLearningCards()
  const extension = useExtensionStatus()
  const outcomes = useOutcomeMetrics()
  const topics = buildLearningTopics(cards)
  const due = topics.reduce((sum, topic) => sum + topic.due, 0)
  const weak = [...topics]
    .filter((topic) => topic.confidence != null)
    .sort((a, b) => a.confidence! - b.confidence!)[0]
  const next = topics.find((topic) => topic.due > 0) ?? topics[0]
  const activeSites = domains.filter((item) => item.isActive).length
  const connected = extension.status === 'connected'
  const setup = [
    {
      done: activeSites > 0,
      title: 'Choose your distractions',
      to: '/app/sites',
    },
    {
      done: topics.length > 0,
      title: 'Add something to learn',
      to: '/app/cards',
    },
    {
      done: connected,
      title: 'Connect the Chrome extension',
      to: '/app/setup',
    },
  ]
  const completedSteps = setup.filter((item) => item.done).length
  const days = Array.from({ length: 7 }, (_, index) => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - 6 + index)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return {
      label: start.toLocaleDateString(undefined, { weekday: 'short' }),
      count: outcomes.sessions.filter(
        (session) =>
          session.source === 'extension' &&
          session.outcome === 'completed' &&
          new Date(session.triggeredAt) >= start &&
          new Date(session.triggeredAt) < end,
      ).length,
    }
  })
  const max = Math.max(1, ...days.map((day) => day.count))

  return (
    <div className="space-y-7">
      <div className="page-heading">
        <div>
          <p className="section-kicker">Little by little adds up</p>
          <h1 className="page-title mt-2">
            A little more focus.
            <br />A little more you.
          </h1>
          <p className="muted-copy mt-3 text-sm">
            Make your next spare moment a useful one.
          </p>
        </div>
        <span className="text-xs muted-copy">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>
      <section className="grid items-stretch gap-5 xl:grid-cols-[1.45fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-[#214c3e] p-7 text-[#f5f7ef] sm:p-9">
          <div
            className="absolute -right-12 -top-16 h-64 w-64 rounded-full border-[35px] border-white/5"
            aria-hidden="true"
          />
          <p className="relative text-[10px] font-bold uppercase tracking-[0.18em] text-[#bfd5c4]">
            Your next useful pause
          </p>
          <h2 className="relative mt-5 max-w-md text-3xl font-bold tracking-tight">
            {loadingCards
              ? 'Finding your next question…'
              : next
                ? next.title
                : 'What would you love to learn?'}
          </h2>
          <p className="relative mt-4 max-w-md text-sm leading-7 text-[#d3e2d5]">
            {next
              ? due
                ? `${due} questions are ready for a little practice. Start with one. You can get back to your day in about 30 seconds.`
                : 'You are up to date. Let things settle, or revisit a question if you feel like it.'
              : 'A language, an upcoming exam, or something you are curious about. Start with ten questions that mean something to you.'}
          </p>
          <Link
            to={next ? topicPracticeUrl(next.title) : '/app/cards'}
            className="relative mt-6 inline-flex items-center gap-3 rounded-xl bg-[#e5efca] px-5 py-3 text-sm font-bold text-[#214532]"
          >
            {next ? 'Practise one question' : 'Find my first learning set'}
            <Icon name="arrow" />
          </Link>
          <p className="relative mt-5 flex items-center gap-2 text-xs text-[#bfd5c4]">
            <Icon name="clock" />
            Small enough to fit into your day.
          </p>
        </div>
        <div className="panel flex flex-col p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">This week, in small wins</h2>
            <Icon name="spark" className="text-reef" />
          </div>
          {outcomes.loading ? (
            <p role="status" className="mt-6 text-sm muted-copy">
              Loading your week…
            </p>
          ) : outcomes.error ? (
            <p role="alert" className="mt-6 text-sm text-rose-700">
              {outcomes.error}
            </p>
          ) : (
            <>
              <div className="mt-5">
                <strong className="text-5xl font-extrabold tracking-tight">
                  {outcomes.metrics.weekCompleted}
                </strong>
                <span className="ml-3 text-sm muted-copy">
                  distractions turned into learning
                </span>
              </div>
              <div
                className="mt-auto flex h-32 items-end gap-3 pt-6"
                role="img"
                aria-label={days
                  .map((day) => `${day.label}: ${day.count} learning moments`)
                  .join(', ')}
              >
                {days.map((day, index) => (
                  <div
                    key={index}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className={`w-full max-w-8 rounded-t-md ${index === 6 ? 'bg-reef' : 'bg-reef/20'}`}
                      style={{
                        height: `${day.count ? Math.max(8, (day.count / max) * 65) : 3}px`,
                      }}
                    />
                    <span className="text-[10px] muted-copy">
                      {day.label.slice(0, 1)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-[var(--app-border)] pt-3 text-xs muted-copy">
                {outcomes.metrics.weekIntercepted
                  ? `${outcomes.metrics.weekIntercepted} visits paused · ${outcomes.metrics.weekBypassed} continued without practice`
                  : 'Your first extension interruption starts the story.'}
              </p>
            </>
          )}
        </div>
      </section>
      {completedSteps < 3 ? (
        <section className="panel p-6">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="font-bold">Make Better Focus yours</h2>
              <p className="mt-1 text-xs muted-copy">
                Three small steps to your first real learning interruption.
              </p>
            </div>
            <span className="status-pill">{completedSteps} of 3 ready</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {setup.map((item, index) => (
              <Link
                key={item.to}
                to={item.to}
                className="soft-card flex items-center gap-3 p-4"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${item.done ? 'bg-reef text-white' : 'bg-[var(--app-surface)]'}`}
                >
                  {item.done ? (
                    <Icon name="check" className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="text-xs font-semibold">{item.title}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <section className="grid items-start gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="panel p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">What you are learning</h2>
            <Link to="/app/cards" className="text-link text-xs">
              View library
              <Icon name="arrow" />
            </Link>
          </div>
          {loadingCards ? (
            <p role="status" className="mt-5 text-sm muted-copy">
              Loading your topics…
            </p>
          ) : topics.length ? (
            <div className="mt-2">
              {topics.slice(0, 4).map((topic) => (
                <Link
                  key={topic.title}
                  to={topicPracticeUrl(topic.title)}
                  className="learning-row"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="feature-icon shrink-0">
                      <Icon name="book" />
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm">
                        {topic.title}
                      </strong>
                      <span className="mt-1 block text-xs muted-copy">
                        {topic.due
                          ? `${topic.due} ready to review`
                          : 'Up to date'}{' '}
                        · {topic.cards.length} questions
                      </span>
                    </span>
                  </span>
                  <span className="text-xs muted-copy">
                    {topic.confidence == null
                      ? 'New'
                      : `${topic.confidence}% confidence`}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 empty-state">
              <Icon name="book" className="mx-auto text-reef" />
              <p className="mt-3 text-sm muted-copy">
                Your interests belong here.
              </p>
              <Link to="/app/cards" className="text-link mt-4">
                Choose something to learn
                <Icon name="arrow" />
              </Link>
            </div>
          )}
        </div>
        <aside className="space-y-5">
          <div className="soft-card p-6">
            <span className="feature-icon bg-[var(--app-surface)]">
              <Icon name="spark" />
            </span>
            <h2 className="mt-4 text-lg font-bold">
              {weak ? 'Worth another look' : 'A guide when you need one'}
            </h2>
            <p className="muted-copy mt-3 text-sm leading-6">
              {weak
                ? `Your reviews suggest “${weak.title}” could use a little more practice.`
                : 'Get a focused recommendation based on what you have reviewed and what felt difficult.'}
            </p>
            <Link
              to={weak ? topicPracticeUrl(weak.title, 'focus') : '/app/tutor'}
              className="text-link mt-5"
            >
              {weak ? 'Give it another go' : 'Find my next step'}
              <Icon name="arrow" />
            </Link>
          </div>
          <div className="px-2">
            <h2 className="text-sm font-bold">Your day, your boundaries</h2>
            <p className="mt-2 text-xs leading-6 muted-copy">
              {activeSites} site{activeSites === 1 ? '' : 's'} configured. You
              can change your schedule, snooze a site, or take a break whenever
              you need.
            </p>
            <Link to="/app/sites" className="text-link mt-3 text-xs">
              Manage distractions
              <Icon name="arrow" />
            </Link>
          </div>
        </aside>
      </section>
    </div>
  )
}
