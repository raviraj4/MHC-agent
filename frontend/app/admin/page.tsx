'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { HiOutlineUserGroup, HiOutlineAdjustments, HiOutlineArrowRight } from 'react-icons/hi'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

interface DashboardStats {
  pendingCount: number
}

export default function AdminDashboard() {
  const { user, session, isLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && session?.access_token) {
      fetchStats()
    }
  }, [user, session])

  const fetchStats = async () => {
    try {
      const token = session?.access_token
      const res = await fetch(`${API_BASE}/admin/therapist-applications?status=pending_review`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setStats({ pendingCount: data.count })
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoadingStats(false)
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
          <div className="flex items-center justify-between">
            
            <div>
                 <div className="flex items-center gap-2 mb-2">
            <Link href="/" className="text-sm text-[var(--primary)] hover:opacity-80">
              Home
            </Link>
            <span className="text-[var(--muted-foreground)]">/</span>
            <Link href="/admin" className="text-sm text-[var(--primary)] hover:opacity-80">
              Admin
            </Link>
            <span className="text-[var(--muted-foreground)]">/</span>
            </div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Manage therapist applications, organisations, and system settings.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)]">Logged in as</p>
              <p className="font-medium text-[var(--foreground)]">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Quick Stats */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Quick Overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Pending Applications Card */}
            <Link href="/admin/therapists">
              <div className="group rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)] hover:ring-[var(--primary)]/30 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--muted-foreground)]">
                      Pending Applications
                    </p>
                    <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">
                      {loadingStats ? '-' : stats?.pendingCount || 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                    <HiOutlineUserGroup className="h-8 w-8" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                  Review Now
                  <HiOutlineArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            {/* Organisations Card */}
            <div className="rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">
                    Total Organisations
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">
                    -
                  </p>
                </div>
                <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500">
                  <HiOutlineAdjustments className="h-8 w-8" />
                </div>
              </div>
              <p className="mt-4 text-xs text-[var(--muted-foreground)]">
                Coming soon
              </p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Management
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Therapist Applications */}
            
            <Link href="/admin/therapists">
              <div className="group rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)] hover:ring-[var(--primary)]/30 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[var(--foreground)]">
                    Therapist Applications
                  </h3>
                  <HiOutlineUserGroup className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Review, verify credentials, and approve therapist applications.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                  Go to Applications
                  <HiOutlineArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            {/* Organisations (Placeholder) */}
            <div className="rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)] opacity-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--foreground)]">
                  Organisations
                </h3>
                <HiOutlineAdjustments className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Manage organisations and their profiles.
              </p>
              <p className="mt-4 text-xs text-[var(--muted-foreground)] font-medium">
                Coming soon
              </p>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 p-6">
          <h3 className="font-semibold text-[var(--foreground)] mb-2">
            Admin Resources
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            For questions about managing applications or organisations, please refer to the admin documentation or contact the development team.
          </p>
        </div>
      </div>
    </div>
  )
}
