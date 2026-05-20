import type { ReactNode } from 'react'
import { UmamiAnalytics } from '../features/analytics/UmamiAnalytics'
import { AuthProvider } from '../features/auth/AuthContext'
import { ThemeProvider } from '../features/theme/ThemeContext'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UmamiAnalytics />
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}
