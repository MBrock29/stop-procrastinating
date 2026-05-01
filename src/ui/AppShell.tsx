import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/app', label: 'Dashboard' },
  { to: '/app/sites', label: 'Blocked sites' },
  { to: '/app/cards', label: 'Learning cards' },
]

export function AppShell() {
  return (
    <div className="min-h-screen bg-soft-grid bg-[size:36px_36px]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="panel mb-6 flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-reef/75">
              Stop Procrastinating
            </p>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">
                Build momentum, not browser drift.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Turn habit loops into fast learning reps with one intentional card at a
                time.
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    isActive
                      ? 'bg-reef text-white shadow-lg shadow-reef/20'
                      : 'bg-white text-slate-600 hover:bg-slate-100',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
