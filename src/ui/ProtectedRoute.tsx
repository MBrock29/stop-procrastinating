import { Navigate, Outlet, useLocation } from 'react-router-dom'

const DEMO_AUTH_KEY = 'stop-procrastinating.demo-auth'

export function ProtectedRoute() {
  const location = useLocation()
  const isAuthenticated = window.localStorage.getItem(DEMO_AUTH_KEY) === 'true'

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`

    return <Navigate to={`/?redirect=${encodeURIComponent(redirect)}`} replace />
  }

  return <Outlet />
}
