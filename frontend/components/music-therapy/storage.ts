import type { TherapySession } from './types'

const getStorageKey = (userId: string) => `asa_music_therapy_sessions_${userId}`

export function getSavedSessions(userId: string): TherapySession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTherapySession(session: TherapySession): TherapySession[] {
  if (typeof window === 'undefined') return []
  const existing = getSavedSessions(session.userId)
  const updated = [session, ...existing].slice(0, 50) // keep latest 50
  try {
    localStorage.setItem(getStorageKey(session.userId), JSON.stringify(updated))
  } catch {
    // ignore quota errors
  }
  return updated
}

export function deleteTherapySession(userId: string, sessionId: string): TherapySession[] {
  if (typeof window === 'undefined') return []
  const updated = getSavedSessions(userId).filter((s) => s.id !== sessionId)
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(updated))
  } catch {
    // ignore storage errors
  }
  return updated
}