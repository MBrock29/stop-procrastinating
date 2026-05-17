import { NavLink, Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { ExtensionSyncBridge } from '../features/extension/ExtensionSyncBridge';

const navItems = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/sites', label: 'Blocked sites', end: true },
  { to: '/app/cards', label: 'Learning cards', end: true },
];

export function AppShell() {
  const navigate = useNavigate();
  const { mode, signOut, user } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className='min-h-screen'>
      <ExtensionSyncBridge />
      <div className='mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8'>
        <header className='panel mb-6 overflow-hidden px-6 py-6 sm:px-8'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between'>
            <div className='space-y-3'>
              <p className='section-kicker'>Better Focus</p>
              <div>
                <h1 className='text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl'>
                  Build momentum, little by little.
                </h1>
                <p className='muted-copy mt-2 max-w-2xl text-sm sm:text-base'>
                  Turn habit loops into short bursts of progress with one useful
                  question at a time.
                </p>
              </div>
            </div>

            <div className='flex flex-col gap-4 xl:items-end'>
              <div className='flex flex-wrap items-center gap-3 xl:justify-end'>
                <NavLink
                  to='/app/settings'
                  className={({ isActive }) =>
                    [
                      'inline-flex h-11 w-11 items-center justify-center rounded-full text-[1.45rem] font-semibold transition',
                      isActive
                        ? 'action-button shadow-lg shadow-reef/20'
                        : 'ghost-button',
                    ].join(' ')
                  }
                  aria-label='Settings'
                  title='Settings'
                >
                  <span aria-hidden='true'>⚙</span>
                </NavLink>
                <button
                  type='button'
                  onClick={() => void handleSignOut()}
                  className='ghost-button h-11 px-4 text-sm'
                >
                  Sign out
                </button>
              </div>

              <div className='soft-card px-4 py-3 text-sm'>
                <div className='font-semibold text-ink dark:text-white'>
                  {mode === 'supabase' ? 'Logged in as:' : 'Demo mode:'}
                </div>
                <div className='muted-copy mt-1'>
                  {user?.email ?? 'Unknown user'}
                </div>
              </div>

              <nav className='flex flex-wrap items-center gap-3 xl:justify-end'>
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        'inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition',
                        isActive
                          ? 'action-button shadow-lg shadow-reef/20'
                          : 'ghost-button',
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </header>

        <main className='flex-1'>
          <Outlet />
        </main>

        <footer className='px-2 py-6 text-center text-sm text-slate-500 dark:text-slate-300'>
          Made with ❤️ by{' '}
          <a
            href='https://x.com/MBrock29'
            target='_blank'
            rel='noreferrer'
            className='font-semibold text-reef transition hover:underline'
          >
            MBrock29
          </a>
        </footer>
      </div>
    </div>
  );
}
