'use client'

import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import { useCallback, useEffect, useState } from 'react'
import { HiOutlineBell } from 'react-icons/hi'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'
type Notification = { id: string; title: string; body?: string | null; conversation_id?: string | null; read_at?: string | null; created_at: string }

export default function NotificationBell() {
  const { session } = useAuth()
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  const loadNotifications = useCallback(async () => {
    if (!session?.access_token) return
    try {
      const response = await fetch(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!response.ok) return
      const data = await response.json()
      setItems(data.data || [])
      setUnread(data.unread_count || 0)
    } catch { /* notifications should not block the app */ }
  }, [session?.access_token])

  useEffect(() => {
    loadNotifications()
    const interval = window.setInterval(loadNotifications, 15_000)
    return () => {
      window.clearInterval(interval)
    }
  }, [loadNotifications])

  return <div className="relative">
    <button onClick={() => setOpen((value) => !value)} aria-label="Notifications" className="relative rounded-xl p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
      <HiOutlineBell className="text-xl" />
      {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl bg-[var(--card)] shadow-xl ring-1 ring-[var(--border)]">
      <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">Notifications</div>
      <div className="max-h-80 overflow-y-auto">{items.length === 0 ? <p className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">You’re all caught up.</p> : items.map((item) => item.conversation_id ? <Link onClick={() => setOpen(false)} key={item.id} href={`/messages/${item.conversation_id}`} className={`block border-b border-[var(--border)] px-4 py-3 text-sm hover:bg-[var(--muted)] ${!item.read_at ? 'bg-[var(--primary)]/5' : ''}`}><p className="font-medium">{item.title}</p>{item.body && <p className="mt-1 line-clamp-2 text-xs text-[var(--muted-foreground)]">{item.body}</p>}</Link> : <div key={item.id} className="border-b border-[var(--border)] px-4 py-3 text-sm"><p className="font-medium">{item.title}</p>{item.body && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.body}</p>}</div>)}</div>
    </div>}
  </div>
}
