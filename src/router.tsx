import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { AppShell } from './ui/AppShell'
import { ProtectedRoute } from './ui/ProtectedRoute'
import { AuthPage } from './views/AuthPage'
import { BlockedDomainsPage } from './views/BlockedDomainsPage'
import { ByokPage } from './views/ByokPage'
import { CardsPage } from './views/CardsPage'
import { DashboardPage } from './views/DashboardPage'
import { InterruptPage } from './views/InterruptPage'
import { LoginPage } from './views/LoginPage'
import { NotFoundPage } from './views/NotFoundPage'
import { PricingPage } from './views/PricingPage'
import { PrivacyPolicyPage } from './views/PrivacyPolicyPage'
import { SettingsPage } from './views/SettingsPage'
import { SetupGuidePage } from './views/SetupGuidePage'

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
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'privacy',
        element: <PrivacyPolicyPage />,
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
              {
                path: 'app/pricing',
                element: <PricingPage />,
              },
              {
                path: 'app/byok',
                element: <ByokPage />,
              },
              {
                path: 'app/settings',
                element: <SettingsPage />,
              },
              {
                path: 'app/setup',
                element: <SetupGuidePage />,
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
