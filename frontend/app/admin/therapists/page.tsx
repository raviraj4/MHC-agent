'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { HiOutlineSearch, HiOutlineFilter } from 'react-icons/hi'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

interface Application {
  therapist_id: string
  profile_id: string
  full_name: string
  email: string
  license_number: string
  practice_name: string
  specializations: string[]
  verification_status: string
  created_at: string
}

export default function TherapistApplicationsPage() {
  const { user, session, isLoading } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending_review')

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && session?.access_token) {
      fetchApplications()
    }
  }, [user, session, statusFilter, searchQuery])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const token = session?.access_token
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`${API_BASE}/admin/therapist-applications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setApplications(data.data || [])
      } else if (res.status === 403) {
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin">
          <div className="h-12 w-12 rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/" className="text-sm text-[var(--primary)] hover:opacity-80">
              Home
            </Link>
            <span className="text-[var(--muted-foreground)]">/</span>
            <Link href="/admin" className="text-sm text-[var(--primary)] hover:opacity-80">
              Admin
            </Link>
            <span className="text-[var(--muted-foreground)]">/</span>
            <span className="text-sm font-medium text-[var(--foreground)]">
              Therapist Applications
            </span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Therapist Applications
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Review and manage therapist credentials, verify details, and approve applications.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search by name, email, or license..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--muted)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <HiOutlineFilter className="h-5 w-5 text-[var(--muted-foreground)]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-[var(--muted)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
              >
                <option value="pending_review">Pending Review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="">All Statuses</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-[var(--muted-foreground)]">
          {loading ? 'Loading...' : `${applications.length} application${applications.length !== 1 ? 's' : ''}`}
        </div>

        {/* Applications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin">
                <div className="h-8 w-8 rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
              </div>
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-2xl bg-[var(--card)] p-12 text-center ring-1 ring-[var(--border)]">
              <p className="text-[var(--muted-foreground)]">
                {statusFilter === 'pending_review'
                  ? 'No pending applications at this time.'
                  : 'No applications found with the selected filters.'}
              </p>
            </div>
          ) : (
            applications.map((app) => (
              <Link key={app.therapist_id} href={`/admin/therapists/${app.therapist_id}`}>
                <div className="group rounded-2xl bg-[var(--card)] p-5 ring-1 ring-[var(--border)] hover:ring-[var(--primary)]/30 transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                            {app.full_name}
                          </h3>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            {app.email}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <div className="inline-flex items-center gap-1 rounded-lg bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]">
                          License: {app.license_number}
                        </div>
                        {app.practice_name && (
                          <div className="inline-flex items-center gap-1 rounded-lg bg-[var(--muted)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]">
                            {app.practice_name}
                          </div>
                        )}
                        {app.specializations?.length > 0 && (
                          <div className="inline-flex items-center gap-1 rounded-lg bg-[var(--muted)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]">
                            {app.specializations.slice(0, 2).join(', ')}
                            {app.specializations.length > 2 && ` +${app.specializations.length - 2}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          app.verification_status === 'pending_review'
                            ? 'bg-amber-500/10 text-amber-600'
                            : app.verification_status === 'verified'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-red-500/10 text-red-600'
                        }`}
                      >
                        {app.verification_status === 'pending_review'
                          ? 'Pending'
                          : app.verification_status === 'verified'
                          ? 'Verified'
                          : 'Rejected'}
                      </span>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
