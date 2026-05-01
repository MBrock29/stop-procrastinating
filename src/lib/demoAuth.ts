import type { UserProfile } from '../types/domain'

const DEMO_EMAIL_KEY = 'stop-procrastinating.demo-email'

export function getDemoUser(): UserProfile | null {
  const email = window.localStorage.getItem(DEMO_EMAIL_KEY)

  if (!email) {
    return null
  }

  return {
    id: 'demo-user',
    email,
  }
}

export function setDemoUser(email: string) {
  window.localStorage.setItem(DEMO_EMAIL_KEY, email)
}

export function clearDemoUser() {
  window.localStorage.removeItem(DEMO_EMAIL_KEY)
}
