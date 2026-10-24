'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'
const PRESS_WINDOW_MS = 2200

type SOSStatus = 'idle' | 'arming' | 'sending' | 'sent' | 'error'

export default function SOSButton() {
  const { session } = useAuth()
  const [pressCount, setPressCount] = useState(0)
  const [status, setStatus] = useState<SOSStatus>('idle')
  const [error, setError] = useState('')
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearResetTimer(), [clearResetTimer])

  const sendSOS = useCallback(async () => {
    if (!session?.access_token) {
      setStatus('error')
      setPressCount(0)
      setError('Please sign in again before sending an SOS.')
      return
    }

    setStatus('sending')
    setError('')
    try {
      const response = await fetch(`${API_BASE}/sos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || `Unable to send the SOS message (HTTP ${response.status}).`)
      setStatus('sent')
      setPressCount(0)
    } catch (requestError) {
      setStatus('error')
      setPressCount(0)
      setError(
        requestError instanceof TypeError
          ? 'The SOS service is unavailable. Please check that the backend is running and try again.'
          : requestError instanceof Error
            ? requestError.message
            : 'Unable to send the SOS message.',
      )
    }
  }, [session?.access_token])

  const handlePress = () => {
    if (status === 'sending') return
    if (status === 'sent' || status === 'error') {
      setStatus('idle')
      setError('')
    }

    clearResetTimer()
    const nextCount = pressCount + 1
    setPressCount(nextCount)

    if (nextCount >= 3) {
      void sendSOS()
      return
    }

    setStatus('arming')
    resetTimerRef.current = setTimeout(() => {
      setPressCount(0)
      setStatus('idle')
    }, PRESS_WINDOW_MS)
  }

  const isUrgent = status === 'arming' || status === 'sending'
  const statusLabel = status === 'sent'
    ? 'Alert sent'
    : status === 'sending'
      ? 'Contacting therapist'
      : status === 'arming'
        ? `${pressCount} of 3 presses`
        : 'Ready when you need it'

  return (
    <section className="sos-panel animate-fade-in-up stagger-3">
      <div className="sos-panel-glow" aria-hidden="true" />
      <div className="sos-copy relative flex min-w-0 flex-1 items-start gap-4">
        <div className="sos-alert-icon" aria-hidden="true">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">Emergency support</p>
            <span className="sos-status-dot" aria-hidden="true" />
          </div>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-[var(--foreground)]">SOS alert</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            Need urgent help? Alert your therapist with your emergency contact details.
          </p>
          {status === 'sent' && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600" role="status">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Your therapist has been alerted.
            </p>
          )}
          {status === 'error' && (
            <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400" role="alert">
              {error}
              {error.includes('emergency contact') && (
                <> <Link href="/profile" className="underline underline-offset-2 hover:text-red-800 dark:hover:text-red-300">Open Profile</Link></>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="relative flex shrink-0 flex-col items-center gap-2 sm:items-end">
        <button
          type="button"
          onClick={handlePress}
          disabled={status === 'sending'}
          aria-label="SOS: press three times quickly to alert your therapist"
          className={`sos-button group relative flex h-[104px] w-[104px] flex-col items-center justify-center rounded-[22px] border-2 border-red-400/80 bg-[#3b0b12] text-red-100 transition-all duration-200 hover:scale-105 hover:border-red-300 focus-visible:outline-red-500 active:scale-95 disabled:cursor-wait disabled:opacity-80 ${isUrgent ? 'sos-button-active' : ''}`}
        >
          <span className="sos-button-shine" aria-hidden="true" />
          <span className="sos-button-inner" aria-hidden="true" />
          {status === 'sending' ? <Loader2 className="relative z-10 h-6 w-6 animate-spin" aria-hidden="true" /> : <AlertTriangle className="relative z-10 h-6 w-6" aria-hidden="true" />}
          <span className="relative z-10 mt-1 text-base font-black tracking-[0.2em] text-red-100">SOS</span>
        </button>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400" role="status">
          {status === 'arming' && [0, 1, 2].map((item) => (
            <span key={item} className={`sos-press-step ${item < pressCount ? 'sos-press-step-active' : ''}`} />
          ))}
          <span>{statusLabel}</span>
        </div>
        {status === 'idle' && <p className="text-[10px] text-[var(--muted-foreground)]">Press 3 times quickly</p>}
      </div>
    </section>
  )
}
