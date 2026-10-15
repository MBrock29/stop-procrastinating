import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { listInterruptSessions } from '../interrupts/interruptRepository'
import { calculateOutcomeMetrics } from './productExperience'
import type { InterruptSession } from '../../types/domain'

export function useOutcomeMetrics() {
  const { user } = useAuth(); const [sessions, setSessions] = useState<InterruptSession[]>([])
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  useEffect(() => { let cancelled = false
    if (!user) { setSessions([]); setLoading(false); return }
    setLoading(true); setError(null)
    void listInterruptSessions(user.id).then(data => { if (!cancelled) setSessions(data) })
      .catch(() => { if (!cancelled) setError('Unable to load interruption outcomes.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])
  return { metrics: useMemo(() => calculateOutcomeMetrics(sessions), [sessions]), sessions, loading, error }
}
