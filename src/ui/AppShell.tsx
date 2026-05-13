import { NavLink, Outlet } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { ExtensionSyncBridge } from '../features/extension/ExtensionSyncBridge'

const navItems = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/sites', label: 'Blocked sites', end: true },
  { to: '/app/cards', label: 'Learning cards', end: true },
  { to: '/app/setup', label: 'Setup guide', end: true },
]

export function AppShell() {
  const navigate = useNavigate()
  const { mode, signOut, user } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-soft-grid bg-[size:36px_36px]">
      <ExtensionSyncBridge />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="panel mb-6 flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-base font-extrabold uppercase tracking-[0.28em] text-reef/75">
              Stop Procrastinating
            </p>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">
                Build momentum, little by little.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Turn habit loops into fast learning reps with one intentional card at a
                time.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4 lg:items-end">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="font-semibold text-ink">
                {mode === 'supabase' ? 'Logged in as:' : 'Demo mode:'}
              </div>
              <div className="mt-1">{user?.email ?? 'Unknown user'}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <nav className="flex flex-wrap items-center gap-3">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        'inline-flex min-h-[42px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition',
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
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="ghost-button min-h-[42px]"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
