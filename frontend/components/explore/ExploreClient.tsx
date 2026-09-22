"use client"

import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

type Therapist = {
  therapist_id: string
  full_name: string
  practice_name?: string | null
  bio?: string | null
  specializations: string[]
  organisation_name: string
  is_same_organisation: boolean
}

export function ExploreClient() {
  const { session } = useAuth()
  const router = useRouter()
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [query, setQuery] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [connectingId, setConnectingId] = useState<string | null>(null)

  const loadTherapists = useCallback(async (search: string, filter: string) => {
    if (!session?.access_token) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (filter.trim()) params.set('specialization', filter.trim())
      const response = await fetch(`${API_BASE}/therapists?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Unable to load therapists')
      setTherapists(data.data || [])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load therapists')
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => { loadTherapists('', '') }, [loadTherapists])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    loadTherapists(query, specialization)
  }

  const connect = async (therapistId: string) => {
    if (!session?.access_token) return
    setConnectingId(therapistId)
    setError('')
    try {
      const response = await fetch(`${API_BASE}/therapist-connections`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ therapist_id: therapistId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Unable to connect')
      router.push(`/messages/${data.conversation_id}`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to connect')
    } finally {
      setConnectingId(null)
    }
  }

  const sameOrganisation = therapists.filter((item) => item.is_same_organisation)
  const external = therapists.filter((item) => !item.is_same_organisation)

  return (
    <section className="h-full overflow-y-auto px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Therapist directory</p>
          <h1 className="mt-2 text-3xl font-bold">Find a therapist</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Your organisation’s verified therapists are shown first. You can also connect with verified therapists from other organisations.</p>
        </div>

        <form onSubmit={handleSearch} className="grid gap-3 rounded-2xl bg-[var(--card)] p-4 ring-1 ring-[var(--border)] sm:grid-cols-[1fr_1fr_auto]">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, practice, or speciality" className="rounded-xl bg-[var(--muted)] px-4 py-2.5 text-sm outline-none ring-[var(--primary)]/40 focus:ring-2" />
          <input value={specialization} onChange={(event) => setSpecialization(event.target.value)} placeholder="Filter by speciality" className="rounded-xl bg-[var(--muted)] px-4 py-2.5 text-sm outline-none ring-[var(--primary)]/40 focus:ring-2" />
          <button className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)]">Search</button>
        </form>

        {error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</p>}
        {loading ? <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">Loading therapists…</p> : (
          <div className="space-y-8">
            <TherapistSection title="Your organisation" empty="No verified therapists from your organisation match these filters." therapists={sameOrganisation} connectingId={connectingId} onConnect={connect} />
            <TherapistSection title="Other organisations" empty="No other verified therapists match these filters." therapists={external} connectingId={connectingId} onConnect={connect} />
          </div>
        )}
      </div>
    </section>
  )
}

function TherapistSection({ title, empty, therapists, connectingId, onConnect }: { title: string; empty: string; therapists: Therapist[]; connectingId: string | null; onConnect: (id: string) => void }) {
  return <div><h2 className="mb-3 text-lg font-semibold">{title}</h2>{therapists.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">{empty}</p> : <div className="grid gap-4 md:grid-cols-2">{therapists.map((therapist) => <article key={therapist.therapist_id} className="rounded-2xl bg-[var(--card)] p-5 ring-1 ring-[var(--border)]"><p className="text-xs font-medium text-[var(--primary)]">{therapist.organisation_name}</p><h3 className="mt-1 text-lg font-semibold">{therapist.full_name}</h3>{therapist.practice_name && <p className="text-sm text-[var(--muted-foreground)]">{therapist.practice_name}</p>}<p className="mt-3 line-clamp-3 text-sm text-[var(--muted-foreground)]">{therapist.bio || 'Verified mental health professional.'}</p><div className="mt-3 flex flex-wrap gap-2">{therapist.specializations.map((item) => <span key={item} className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs">{item}</span>)}</div><button disabled={connectingId === therapist.therapist_id} onClick={() => onConnect(therapist.therapist_id)} className="mt-5 w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-60">{connectingId === therapist.therapist_id ? 'Connecting…' : 'Connect'}</button></article>)}</div>}</div>
}
