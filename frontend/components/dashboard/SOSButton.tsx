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
      <div className="sos-panel-accent" aria-hidden="true" />
      <div className="sos-copy relative flex min-w-0 flex-1 items-start gap-3.5">
        <div className="sos-alert-icon" aria-hidden="true">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sos-text)]">Emergency support</p>
            <span className="sos-status-dot" aria-hidden="true" />
          </div>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-[var(--foreground)]">Need urgent support?</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            Quickly alert your therapist with your saved emergency contact details.
          </p>
          {status === 'sent' && (
            <p className="sos-feedback sos-feedback-success mt-2" role="status">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Your therapist has been alerted.
            </p>
          )}
          {status === 'error' && (
            <p className="sos-feedback sos-feedback-error mt-2" role="alert">
              {error}
              {error.includes('emergency contact') && (
                <> <Link href="/profile" className="font-bold underline underline-offset-2">Open Profile</Link></>
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
          className={`sos-button group relative flex h-[104px] w-[104px] flex-col items-center justify-center transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none active:scale-95 disabled:cursor-wait disabled:opacity-80 ${isUrgent ? 'sos-button-active' : ''}`}
        >
          <span className="sos-button-shine" aria-hidden="true" />
          <span className="sos-button-inner" aria-hidden="true" />
          <span className="sos-button-content">
            {status === 'sending' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5" aria-hidden="true" />}
            <span className="mt-1 text-base font-black tracking-[0.22em]">SOS</span>
          </span>
        </button>
        <div className="sos-press-status mt-3" role="status">
          {status === 'arming' && [0, 1, 2].map((item) => (
            <span key={item} className={`sos-press-step ${item < pressCount ? 'sos-press-step-active' : ''}`} />
          ))}
          <span>{statusLabel}</span>
        </div>
        {status === 'idle' && <p className="sos-hint">Press 3 times quickly</p>}
      </div>
    </section>
  )
}
