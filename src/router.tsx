import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { AppShell } from './ui/AppShell'
import { ProtectedRoute } from './ui/ProtectedRoute'
import { AuthPage } from './views/AuthPage'
import { BlockedDomainsPage } from './views/BlockedDomainsPage'
import { CardsPage } from './views/CardsPage'
import { DashboardPage } from './views/DashboardPage'
import { InterruptPage } from './views/InterruptPage'
import { NotFoundPage } from './views/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <AuthPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                path: 'app',
                element: <DashboardPage />,
              },
              {
                path: 'app/sites',
                element: <BlockedDomainsPage />,
              },
              {
                path: 'app/cards',
                element: <CardsPage />,
              },
            ],
          },
          {
            path: 'interrupt',
            element: <InterruptPage />,
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
