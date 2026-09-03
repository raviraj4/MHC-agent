'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

type DirectMessage = { id: string; sender_id: string; body: string; created_at: string }

export function DirectMessageClient({ conversationId }: { conversationId: string }) {
  const { session, user } = useAuth()
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagePanelRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    if (!session?.access_token) return
    try {
      const response = await fetch(`${API_BASE}/direct-conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Unable to load messages')
      setMessages(data.data || [])
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load messages')
    } finally {
      setLoading(false)
    }
  }, [conversationId, session?.access_token])

  useEffect(() => {
    loadMessages()
    const interval = window.setInterval(loadMessages, 10_000)
    return () => {
      window.clearInterval(interval)
    }
  }, [loadMessages])

  useEffect(() => {
    const panel = messagePanelRef.current
    if (panel) {
      // Do not use scrollIntoView here: it may scroll the document/AppLayout,
      // not just this panel.
      panel.scrollTop = panel.scrollHeight
    }
  }, [messages])

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!body.trim() || !session?.access_token) return
    setSending(true)
    try {
      const response = await fetch(`${API_BASE}/direct-conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Unable to send message')
      setMessages((current) => [...current, data])
      setBody('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="flex h-full flex-col bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Direct message</p>
        <h1 className="mt-1 text-xl font-semibold">Therapist conversation</h1>
      </header>
      <div ref={messagePanelRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {loading ? <p className="text-center text-sm text-[var(--muted-foreground)]">Loading messages…</p> : null}
        {error ? <p className="mx-auto max-w-3xl rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</p> : null}
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.map((message) => {
            const mine = message.sender_id === user?.id
            return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${mine ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'bg-[var(--card)] ring-1 ring-[var(--border)]'}`}>
                <p>{message.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? 'opacity-70' : 'text-[var(--muted-foreground)]'}`}>{new Date(message.created_at).toLocaleString()}</p>
              </div>
            </div>
          })}
        </div>
      </div>
      <form onSubmit={sendMessage} className="border-t border-[var(--border)] bg-[var(--card)] p-4">
        <div className="mx-auto flex max-w-3xl gap-3">
          <input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message…" disabled={sending} className="min-w-0 flex-1 rounded-xl bg-[var(--muted)] px-4 py-3 text-sm outline-none ring-[var(--primary)]/40 focus:ring-2" />
          <button disabled={sending || !body.trim()} className="rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-60">{sending ? 'Sending…' : 'Send'}</button>
        </div>
      </form>
    </section>
  )
}
