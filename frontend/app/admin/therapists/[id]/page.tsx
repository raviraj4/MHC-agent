'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineCalendar } from 'react-icons/hi'
import { toast } from 'sonner'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

interface TherapistApplication {
  therapist_id: string
  profile_id: string
  full_name: string
  email: string
  license_number: string
  practice_name: string
  bio: string
  specializations: string[]
  organisation_id: string
  verification_status: string
  verified_at: string
  verified_by_admin: string
  created_at: string
  updated_at: string
}

interface Organisation {
  id: string
  name: string
  city: string
  state: string
}

export default function TherapistDetailPage() {
  const { user, session, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const therapistId = params.id as string

  const [application, setApplication] = useState<TherapistApplication | null>(null)
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [showRejectionModal, setShowRejectionModal] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && session?.access_token && therapistId) {
      fetchApplicationAndOrgs()
    }
  }, [user, session, therapistId])

  const fetchApplicationAndOrgs = async () => {
    try {
      setLoading(true)
      const token = session?.access_token

      // Fetch therapist application
      const appRes = await fetch(`${API_BASE}/admin/therapist-applications/${therapistId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (appRes.ok) {
        const appData = await appRes.json()
        setApplication(appData)
      } else if (appRes.status === 403) {
        router.push('/auth/login')
        return
      }

      // Fetch organisations
      const orgsRes = await fetch(`${API_BASE}/admin/organisations`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (orgsRes.ok) {
        const orgsData = await orgsRes.json()
        setOrganisations(orgsData.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load application details')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedOrgId) {
      toast.error('Please select an organisation')
      return
    }

    try {
      setApproving(true)
      const token = session?.access_token

      const res = await fetch(
        `${API_BASE}/admin/therapist-applications/${therapistId}/approve`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ organisation_id: selectedOrgId })
        }
      )

      if (res.ok) {
        toast.success('Therapist approved successfully!')
        setShowApprovalModal(false)
        setTimeout(() => router.push('/admin/therapists'), 1500)
      } else {
        toast.error('Failed to approve therapist')
      }
    } catch (error) {
      console.error('Approval error:', error)
      toast.error('An error occurred during approval')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    try {
      setRejecting(true)
      const token = session?.access_token

      const res = await fetch(
        `${API_BASE}/admin/therapist-applications/${therapistId}/reject`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ notes: rejectionNotes })
        }
      )

      if (res.ok) {
        toast.success('Therapist application rejected')
        setShowRejectionModal(false)
        setTimeout(() => router.push('/admin/therapists'), 1500)
      } else {
        toast.error('Failed to reject therapist')
      }
    } catch (error) {
      console.error('Rejection error:', error)
      toast.error('An error occurred during rejection')
    } finally {
      setRejecting(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin">
          <div className="h-12 w-12 rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <Link href="/admin/therapists" className="flex items-center gap-2 text-[var(--primary)] hover:opacity-80 mb-8">
            <HiOutlineArrowLeft className="h-5 w-5" />
            Back to Applications
          </Link>
          <div className="rounded-2xl bg-[var(--card)] p-12 text-center ring-1 ring-[var(--border)]">
            <p className="text-[var(--muted-foreground)]">
              Application not found
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <Link href="/admin/therapists" className="flex items-center gap-2 text-[var(--primary)] hover:opacity-80 mb-4">
            <HiOutlineArrowLeft className="h-5 w-5" />
            Back to Applications
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                {application.full_name}
              </h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {application.email}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${
                application.verification_status === 'pending_review'
                  ? 'bg-amber-500/10 text-amber-600'
                  : application.verification_status === 'verified'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-red-500/10 text-red-600'
              }`}
            >
              {application.verification_status === 'pending_review'
                ? 'Pending Review'
                : application.verification_status === 'verified'
                ? 'Verified'
                : 'Rejected'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Credentials Section */}
            <div className="rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                Professional Credentials
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">
                    License Number
                  </label>
                  <p className="mt-1 text-[var(--foreground)]">{application.license_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">
                    Practice Name
                  </label>
                  <p className="mt-1 text-[var(--foreground)]">
                    {application.practice_name || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">
                    Specializations
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {application.specializations?.length > 0 ? (
                      application.specializations.map((spec, idx) => (
                        <span key={idx} className="inline-flex rounded-lg bg-[var(--muted)] px-3 py-1 text-sm font-medium text-[var(--foreground)]">
                          {spec}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                Professional Bio
              </h2>
              <p className="text-[var(--muted-foreground)]">
                {application.bio || 'No bio provided'}
              </p>
            </div>

            {/* Timeline Section */}
            {application.verification_status !== 'pending_review' && (
              <div className="rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                  Review Timeline
                </h2>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--muted)]">
                      <HiOutlineCalendar className="h-4 w-4 text-[var(--muted-foreground)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        Submitted
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Date(application.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      application.verification_status === 'verified'
                        ? 'bg-emerald-500/10'
                        : 'bg-red-500/10'
                    }`}>
                      {application.verification_status === 'verified' ? (
                        <HiOutlineCheckCircle className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <HiOutlineXCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {application.verification_status === 'verified' ? 'Approved' : 'Rejected'}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Date(application.verified_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        By: {application.verified_by_admin}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Actions */}
          <div className="lg:col-span-1">
            {application.verification_status === 'pending_review' && (
              <div className="sticky top-8 space-y-3">
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <HiOutlineCheckCircle className="h-5 w-5" />
                  Approve
                </button>
                <button
                  onClick={() => setShowRejectionModal(true)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] transition-colors flex items-center justify-center gap-2"
                >
                  <HiOutlineXCircle className="h-5 w-5" />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl bg-[var(--card)] p-6 max-w-md w-full ring-1 ring-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Approve Therapist Application
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              Select an organisation to assign this therapist to, then confirm approval.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Organisation
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-[var(--muted)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
              >
                <option value="">Select an organisation...</option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.city}, {org.state})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                disabled={approving}
                className="flex-1 px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approving || !selectedOrgId}
                className="flex-1 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {approving ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-[var(--primary-foreground)]/30 border-t-[var(--primary-foreground)] animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <HiOutlineCheckCircle className="h-5 w-5" />
                    Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl bg-[var(--card)] p-6 max-w-md w-full ring-1 ring-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Reject Application
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              Add optional notes about why this application is being rejected.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Rejection Notes (Optional)
              </label>
              <textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full px-4 py-2 rounded-xl bg-[var(--muted)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectionModal(false)}
                disabled={rejecting}
                className="flex-1 px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {rejecting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <HiOutlineXCircle className="h-5 w-5" />
                    Reject
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
