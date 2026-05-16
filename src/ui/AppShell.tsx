import { NavLink, Outlet } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { ExtensionSyncBridge } from '../features/extension/ExtensionSyncBridge'
import { useTheme } from '../features/theme/ThemeContext'

const navItems = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/sites', label: 'Blocked sites', end: true },
  { to: '/app/cards', label: 'Learning cards', end: true },
]

export function AppShell() {
  const navigate = useNavigate()
  const { mode, signOut, user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-soft-grid bg-[size:36px_36px]">
      <ExtensionSyncBridge />
      <div className="mx-auto flex min-h-screen w-full max-w-[88rem] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 space-y-4">
          <div className="surface-strip px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="accent-label">Stop Procrastinating</span>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  {mode === 'supabase' ? 'Logged in as' : 'Demo mode'}{' '}
                  <span className="font-semibold text-ink dark:text-white">{user?.email ?? 'Unknown user'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <nav className="flex flex-wrap items-center gap-2">
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
                            : 'text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]',
                        ].join(' ')
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
                <NavLink
                  to="/app/settings"
                  className={({ isActive }) =>
                    [
                      'inline-flex min-h-[42px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition',
                      isActive
                        ? 'bg-reef text-white shadow-lg shadow-reef/20'
                        : 'text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]',
                    ].join(' ')
                  }
                >
                  Settings
                </NavLink>
                <button type="button" onClick={toggleTheme} className="theme-toggle">
                  <span>{theme === 'light' ? 'Dark theme' : 'Light theme'}</span>
                  <span aria-hidden="true">{theme === 'light' ? '◐' : '◑'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="ghost-button min-h-[42px]"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>

          <div className="editorial-stage px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="section-kicker">Build momentum</p>
                <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-ink dark:text-white sm:text-4xl">
                  Little by little turns out to be enough.
                </h1>
                <p className="muted-copy mt-4 max-w-2xl text-sm leading-7 sm:text-base">
                  Keep the loop visible: what you want to learn, what you want to block, and whether the browser is ready to redirect you back into progress.
                </p>
              </div>

              <div className="spotlight-band max-w-sm">
                <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                  Focus principle
                </div>
                <div className="mt-3 text-base font-bold leading-7 text-ink dark:text-white">
                  Don&apos;t fight the urge with willpower alone. Catch it, redirect it, and spend the moment on something useful.
                </div>
              </div>
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
