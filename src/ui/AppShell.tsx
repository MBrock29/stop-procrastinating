import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../features/auth/useAuth'
import { ExtensionSyncBridge } from '../features/extension/ExtensionSyncBridge'
import { useExtensionStatus } from '../features/extension/useExtensionStatus'
import { useTheme } from '../features/theme/ThemeContext'
import { canAccessByok } from '../features/ai-access/byokVisibility'
import { BrandMark, Icon } from './Icon'
import { SiteFooter } from './SiteFooter'

const navigation = [
  { to: '/app', label: 'Today', icon: 'home' },
  { to: '/app/cards', label: 'My learning', icon: 'book' },
  { to: '/app/sites', label: 'Distractions', icon: 'shield' },
] as const

export function AppShell() {
  const { mode, signOut, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const extension = useExtensionStatus()
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const onboarding = location.pathname === '/app/onboarding'
  const connected = extension.status === 'connected'
  const activeLabel = location.pathname.includes('/settings')
    ? 'Settings'
    : (navigation.find((item) =>
        item.to === '/app'
          ? location.pathname === '/app'
          : location.pathname.startsWith(item.to),
      )?.label ?? 'Your focus space')

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/')
    } catch {
      setError('Unable to sign out. Please try again.')
    }
  }

  const nav = (
    <>
      {navigation.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/app'}
          className="app-nav-link"
        >
          <Icon name={item.icon} />
          {item.label}
        </NavLink>
      ))}
    </>
  )

  return (
    <div className="min-h-screen">
      <ExtensionSyncBridge />
      {!onboarding ? (
        <aside className="app-sidebar">
          <Link
            to="/app"
            className="mb-10 flex items-center gap-3 px-3 font-extrabold tracking-tight"
          >
            <BrandMark />
            Better Focus
          </Link>
          <p className="px-4 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] muted-copy">
            Your space
          </p>
          <nav aria-label="Main navigation" className="space-y-1">
            {nav}
          </nav>
          <div className="mt-auto space-y-4">
            <Link to="/app/setup" className="soft-card block p-4">
              <span className="flex items-center gap-2 text-xs font-semibold">
                <span
                  className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
                {connected ? 'Extension connected' : 'Connect your extension'}
              </span>
              <span className="mt-2 block text-xs leading-5 muted-copy">
                {connected
                  ? 'Ready for your next useful pause.'
                  : 'Catch distractions in Chrome.'}
              </span>
            </Link>
            <NavLink to="/app/settings" className="app-nav-link">
              <Icon name="settings" />
              Settings
            </NavLink>
            {canAccessByok(user?.email) ? (
              <details className="px-4 text-xs muted-copy">
                <summary>Developer tools</summary>
                <div className="mt-3 flex flex-col gap-3">
                  <Link to="/app/ai-ops">Operations</Link>
                  <Link to="/app/jobs">Background jobs</Link>
                  <Link to="/app/byok">Provider settings</Link>
                </div>
              </details>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="app-nav-link w-full"
            >
              <Icon name="logout" />
              Sign out
            </button>
          </div>
        </aside>
      ) : null}

      <div className={onboarding ? '' : 'lg:pl-56'}>
        <header className="border-b border-[var(--app-border)] bg-[var(--app-surface)]">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:block focus:p-4"
          >
            Skip to content
          </a>
          <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:px-9">
            {onboarding ? (
              <Link
                to="/app"
                className="flex items-center gap-3 font-extrabold"
              >
                <BrandMark />
                Better Focus
              </Link>
            ) : (
              <>
                <Link
                  to="/app"
                  aria-label="Better Focus home"
                  className="lg:hidden"
                >
                  <BrandMark />
                </Link>
                <p className="hidden text-sm font-semibold lg:block">
                  {activeLabel}
                </p>
              </>
            )}
            <div className="flex items-center gap-3">
              {mode === 'demo' ? (
                <span className="status-pill">Local preview</span>
              ) : (
                <span className="hidden text-xs muted-copy sm:block">
                  {user?.email}
                </span>
              )}
              <button
                type="button"
                className="ghost-button h-9 w-9 p-0"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                <Icon name={theme === 'light' ? 'moon' : 'sun'} />
              </button>
              {!onboarding ? (
                <Link
                  to="/app/settings"
                  aria-label="Settings"
                  className="ghost-button h-9 w-9 p-0 lg:hidden"
                >
                  <Icon name="settings" />
                </Link>
              ) : null}
              {onboarding ? (
                <Link to="/app" className="text-link">
                  Set up later
                </Link>
              ) : (
                <Link
                  to="/app/cards"
                  className="action-button hidden sm:inline-flex"
                >
                  <Icon name="plus" />
                  Add learning
                </Link>
              )}
            </div>
          </div>
          {!onboarding ? (
            <nav
              aria-label="Mobile navigation"
              className="grid grid-cols-3 gap-1 px-3 pb-3 lg:hidden [&>a]:flex-col [&>a]:gap-1 [&>a]:px-2 [&>a]:py-2 [&>a]:text-[11px]"
            >
              {nav}
            </nav>
          ) : null}
        </header>
        <main
          id="main-content"
          className={`mx-auto max-w-6xl px-5 py-8 sm:px-9 sm:py-10 ${onboarding ? 'max-w-4xl' : ''}`}
        >
          {error ? (
            <p role="alert" className="mb-5 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <Outlet />
        </main>
        <SiteFooter className="mx-auto max-w-6xl px-5 sm:px-9" />
      </div>
    </div>
  )
}
