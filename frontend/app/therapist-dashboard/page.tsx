'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { HiOutlineExclamationCircle, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi'
import NotificationBell from '@/components/ui/NotificationBell'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

export default function TherapistDashboard() {
  const { user, session, isLoading } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<'pending_review' | 'verified' | 'rejected' | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [statusError, setStatusError] = useState('')
  const [connections, setConnections] = useState<Array<{ id: string; connection_scope: string; conversation_id: string | null; user: { full_name?: string; email?: string } }>>([])
  const isApproved = status === 'verified'
  const isRejected = status === 'rejected'

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, isLoading, router])

  const loadApplicationStatus = useCallback(async () => {
    if (!user || !session?.access_token) return

    setStatusError('')
    try {
      const response = await fetch(`${API_BASE}/therapist/application-status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await response.json()
      if (!response.ok || !data.verification_status) {
        throw new Error(data.detail || 'Status unavailable')
      }
      setStatus(data.verification_status as 'pending_review' | 'verified' | 'rejected')
    } catch (error) {
      console.error('Failed to load therapist application status:', error)
      setStatusError('We could not load your application status. Please try again.')
    }
    setStatusLoading(false)
  }, [session?.access_token, user])

  useEffect(() => {
    if (!user) return

    loadApplicationStatus()
    const interval = window.setInterval(loadApplicationStatus, 15_000)
    const refreshOnFocus = () => loadApplicationStatus()
    window.addEventListener('focus', refreshOnFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [loadApplicationStatus, user])

  const loadConnections = useCallback(async () => {
    if (!session?.access_token) return
    try {
      const response = await fetch(`${API_BASE}/therapist/connections`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!response.ok) return
      const data = await response.json()
      setConnections(data.data || [])
    } catch (error) {
      console.error('Failed to load therapist connections:', error)
    }
  }, [session?.access_token])

  useEffect(() => {
    if (!isApproved) return
    loadConnections()
    const interval = window.setInterval(loadConnections, 15_000)
    return () => {
      window.clearInterval(interval)
    }
  }, [isApproved, loadConnections])

  if (isLoading || (user && statusLoading)) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin">
          <div className="h-12 w-12 rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
        </div>
      </div>
    )
  }

  const title = statusError
    ? 'Application Status Unavailable'
    : isApproved ? 'Application Approved' : isRejected ? 'Application Update' : 'Application Under Review'
  const description = isApproved
    ? 'Your credentials have been verified and your therapist account is active.'
    : isRejected
      ? 'Your application was not approved at this time. Please contact support if you have questions.'
      : statusError || 'Thank you for applying to join our network of mental health professionals.'

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 sm:px-6">
        <span className="mr-auto text-sm font-semibold">Therapist Dashboard</span>
        <NotificationBell />
        <Link href="/profile" className="rounded-xl px-3 py-2 text-xs font-medium text-[var(--primary)] hover:bg-[var(--muted)]">Profile</Link>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="rounded-2xl bg-[var(--card)] p-8 ring-1 ring-[var(--border)]">
          <div className="flex items-start gap-4">
            <div className={`rounded-2xl p-3 ${isApproved ? 'bg-emerald-500/10 text-emerald-600' : isRejected ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-500'}`}>
              {isApproved ? <HiOutlineCheckCircle className="h-8 w-8" /> : isRejected ? <HiOutlineXCircle className="h-8 w-8" /> : <HiOutlineExclamationCircle className="h-8 w-8" />}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                {title}
              </h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {description}
              </p>
            </div>
          </div>
        </div>

        {statusError && (
          <button
            onClick={loadApplicationStatus}
            className="mt-4 w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            Retry status check
          </button>
        )}

        {isApproved && (
          <section className="mt-8 rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)]">
            <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">Connected users</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">People who have connected with you can be contacted immediately.</p></div><span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-medium">{connections.length}</span></div>
            <div className="mt-5 space-y-3">{connections.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">No users have connected with you yet.</p> : connections.map((connection) => <div key={connection.id} className="flex items-center justify-between gap-4 rounded-xl bg-[var(--muted)] px-4 py-3"><div><p className="font-medium">{connection.user.full_name || 'User'}</p><p className="text-xs text-[var(--muted-foreground)]">{connection.user.email || ''} · {connection.connection_scope === 'same_organisation' ? 'Your organisation' : 'External connection'}</p></div>{connection.conversation_id && <Link href={`/messages/${connection.conversation_id}`} className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-medium text-[var(--primary-foreground)]">Open DM</Link>}</div>)}</div>
          </section>
        )}

        {/* Content */}
        <div className="mt-8 space-y-6">
          {!isApproved && !isRejected && <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              What happens next?
            </h2>
            <div className="space-y-3">
              {[
                {
                  step: '1',
                  title: 'Credential Verification',
                  description: 'We verify your license number and professional credentials.',
                  status: 'In Progress'
                },
                {
                  step: '2',
                  title: 'Organisation Assignment',
                  description: 'Our team will assign you to an appropriate practice or organisation.',
                  status: 'Pending'
                },
                {
                  step: '3',
                  title: 'Final Approval',
                  description: 'Once approved, you\'ll receive an email confirmation and access to your therapist dashboard.',
                  status: 'Pending'
                }
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex gap-4 rounded-xl bg-[var(--muted)] p-4"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] font-semibold flex-shrink-0">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[var(--foreground)]">{item.title}</h3>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-500/10 text-amber-600">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>}

          {/* Timeline */}
          {!isApproved && !isRejected && <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <h3 className="font-semibold text-[var(--foreground)] mb-4">
              Estimated Timeline
            </h3>
            <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
              <p>• Credential verification: 1-2 business days</p>
              <p>• Organisation assignment: 2-3 business days</p>
              <p>• Final approval: 1 business day</p>
              <p className="mt-4 text-xs font-medium text-[var(--foreground)]">
                Total expected: 4-6 business days
              </p>
            </div>
          </div>}

          {/* Support */}
          <div className="rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 p-6">
            <h3 className="font-semibold text-[var(--foreground)] mb-2">
              Need Help?
            </h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              If you have any questions about your application status, please contact our support team at{' '}
              <a href="mailto:support@asa.com" className="font-medium text-[var(--primary)] hover:opacity-80">
                support@asa.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
