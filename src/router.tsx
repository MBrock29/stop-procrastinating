import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import App from './App'
import { AppShell } from './ui/AppShell'
import { ProtectedRoute } from './ui/ProtectedRoute'
import { AuthPage } from './views/AuthPage'
import { BlockedDomainsPage } from './views/BlockedDomainsPage'
import { ByokPage } from './views/ByokPage'
import { LearningPage } from './views/LearningPage'
import { ContactPage } from './views/ContactPage'
import { DashboardPage } from './views/DashboardPage'
import { InterruptPage } from './views/InterruptPage'
import { LoginPage } from './views/LoginPage'
import { NotFoundPage } from './views/NotFoundPage'
import { PricingPage } from './views/PricingPage'
import { PrivacyPolicyPage } from './views/PrivacyPolicyPage'
import { SettingsPage } from './views/SettingsPage'
import { SetupGuidePage } from './views/SetupGuidePage'
import { TutorPage } from './views/TutorPage'
import { SourcesPage } from './views/SourcesPage'
import { OnboardingPage } from './views/OnboardingPage'
import { PasswordRecoveryPage } from './views/PasswordRecoveryPage'

const CardsPage = lazy(() =>
  import('./views/CardsPage').then((module) => ({ default: module.CardsPage })),
)
const AiOpsPage = lazy(() =>
  import('./views/AiOpsPage').then((module) => ({ default: module.AiOpsPage })),
)
const JobsPage = lazy(() =>
  import('./views/JobsPage').then((module) => ({ default: module.JobsPage })),
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense
        fallback={
          <div role="status" className="p-10 text-sm muted-copy">
            Opening your focus space…
          </div>
        }
      >
        <App />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: <AuthPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      { path: 'forgot-password', element: <PasswordRecoveryPage /> },
      {
        path: 'privacy',
        element: <PrivacyPolicyPage />,
      },
      {
        path: 'contact',
        element: <ContactPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'update-password', element: <PasswordRecoveryPage update /> },
          {
            element: <AppShell />,
            children: [
              {
                path: 'app',
                element: <DashboardPage />,
              },
              {
                path: 'app/onboarding',
                element: <OnboardingPage />,
              },
              {
                path: 'app/sites',
                element: <BlockedDomainsPage />,
              },
              {
                path: 'app/cards',
                element: <LearningPage />,
              },
              {
                path: 'app/cards/manage',
                element: <CardsPage />,
              },
              {
                path: 'app/tutor',
                element: <TutorPage />,
              },
              {
                path: 'app/ai-ops',
                element: <AiOpsPage />,
              },
              {
                path: 'app/sources',
                element: <SourcesPage />,
              },
              {
                path: 'app/jobs',
                element: <JobsPage />,
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
