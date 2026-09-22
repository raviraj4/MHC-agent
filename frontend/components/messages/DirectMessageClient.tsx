'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { ShieldCheck, Stethoscope, UserRound, type LucideIcon } from 'lucide-react'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

type ParticipantRole = 'admin' | 'therapist' | 'user'

type DirectMessageSender = {
  id: string
  email?: string | null
  full_name?: string | null
  user_name?: string | null
  role?: ParticipantRole | string | null
}

type DirectMessage = {
  id: string
  sender_id: string
  body: string
  created_at: string
  sender?: DirectMessageSender | null
}

const roleIcons: Record<ParticipantRole, LucideIcon> = {
  admin: ShieldCheck,
  therapist: Stethoscope,
  user: UserRound,
}

function getSenderDisplayName(sender: DirectMessageSender | null | undefined) {
  return sender?.full_name || sender?.user_name || sender?.email || 'Unknown user'
}

function getSenderRole(sender: DirectMessageSender | null | undefined): ParticipantRole {
  return sender?.role === 'admin' || sender?.role === 'therapist' ? sender.role : 'user'
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatRole(role: ParticipantRole) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

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
            const isMine = message.sender_id === user?.id
            const senderName = getSenderDisplayName(message.sender)
            const senderRole = getSenderRole(message.sender)
            const RoleIcon = roleIcons[senderRole]

            return <div key={message.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
              {!isMine ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]" title={`${senderName} (${formatRole(senderRole)})`}>
                  {getInitials(senderName)}
                </div>
              ) : null}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isMine ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'bg-[var(--card)] ring-1 ring-[var(--border)]'}`}>
                <div className={`mb-1 flex items-center gap-1.5 text-[11px] font-medium ${isMine ? 'text-[var(--primary-foreground)]/80' : 'text-[var(--muted-foreground)]'}`}>
                  <RoleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{senderName}</span>
                  <span className={isMine ? 'opacity-70' : 'text-[var(--muted-foreground)]'}>({formatRole(senderRole)})</span>
                </div>
                <p>{message.body}</p>
                <p className={`mt-1 text-[10px] ${isMine ? 'opacity-70' : 'text-[var(--muted-foreground)]'}`}>{new Date(message.created_at).toLocaleString()}</p>
              </div>
              {isMine ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)] ring-1 ring-[var(--primary)]/30" title={`${senderName} (${formatRole(senderRole)})`}>
                  {getInitials(senderName)}
                </div>
              ) : null}
            </div>
          }
        )
      }
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
