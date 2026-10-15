import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

export function ProtectedRoute() {
  const location = useLocation()
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="panel w-full max-w-md px-6 py-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-reef">
            Loading
          </p>
          <h1 className="mt-4 text-2xl font-bold text-ink">Restoring your session…</h1>
        </div>
      </div>
    )
  }

  if (status !== 'authenticated') {
    const redirect = `${location.pathname}${location.search}`

    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />
  }

  return <Outlet />
}
