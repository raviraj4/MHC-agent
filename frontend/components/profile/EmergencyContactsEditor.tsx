'use client'

import { useState, useTransition } from 'react'
import { Check, Pencil, Plus, ShieldCheck, UserRound, X } from 'lucide-react'
import { saveEmergencyContact } from '@/app/profile/actions'

export interface EmergencyContactRecord {
  id: string
  name: string
  relationship?: string | null
  phone: string
  email?: string | null
  consent: boolean
  is_primary?: boolean
}

type ContactForm = {
  name: string
  relationship: string
  phone: string
  email: string
  consent: boolean
}

const emptyForm: ContactForm = { name: '', relationship: '', phone: '', email: '', consent: false }

export default function EmergencyContactsEditor({ initialContacts }: { initialContacts: EmergencyContactRecord[] }) {
  const [contacts, setContacts] = useState(initialContacts)
  const [form, setForm] = useState<ContactForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const startEditing = (contact: EmergencyContactRecord) => {
    setEditingId(contact.id)
    setForm({
      name: contact.name,
      relationship: contact.relationship || '',
      phone: contact.phone,
      email: contact.email || '',
      consent: contact.consent,
    })
    setMessage(null)
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMessage(null)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await saveEmergencyContact({ ...form, id: editingId || undefined })
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
        return
      }

      const savedContact: EmergencyContactRecord = {
        id: editingId || crypto.randomUUID(),
        name: form.name.trim(),
        relationship: form.relationship.trim() || null,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        consent: true,
        is_primary: editingId ? contacts.find((contact) => contact.id === editingId)?.is_primary : false,
      }
      setContacts((current) => editingId
        ? current.map((contact) => contact.id === editingId ? savedContact : contact)
        : [...current, savedContact])
      setMessage({ type: 'success', text: editingId ? 'Emergency contact updated.' : 'Emergency contact added.' })
      setEditingId(null)
      setForm(emptyForm)
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-red-500" aria-hidden="true" />
          <h3 className="text-base font-semibold">Emergency contacts</h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
          Keep these details current so your therapist can reach someone you trust if you send an SOS.
        </p>
      </div>

      {contacts.length > 0 && (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--muted)]/60 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{contact.name}{contact.is_primary ? <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Primary</span> : null}</p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">{contact.relationship || 'Emergency contact'} · {contact.phone}</p>
                </div>
              </div>
              <button type="button" onClick={() => startEditing(contact)} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--card)]" aria-label={`Edit ${contact.name}`}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/45 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            {editingId ? 'Update contact' : 'Add a contact'}
          </p>
          {editingId && (
            <button type="button" onClick={resetForm} className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Full name" className="rounded-xl bg-[var(--card)] px-3.5 py-2.5 text-sm outline-none ring-[var(--primary)]/40 focus:ring-2" />
          <input value={form.relationship} onChange={(event) => setForm({ ...form, relationship: event.target.value })} placeholder="Relationship (optional)" className="rounded-xl bg-[var(--card)] px-3.5 py-2.5 text-sm outline-none ring-[var(--primary)]/40 focus:ring-2" />
          <input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone number" type="tel" className="rounded-xl bg-[var(--card)] px-3.5 py-2.5 text-sm outline-none ring-[var(--primary)]/40 focus:ring-2" />
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email (optional)" type="email" className="rounded-xl bg-[var(--card)] px-3.5 py-2.5 text-sm outline-none ring-[var(--primary)]/40 focus:ring-2" />
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
          <input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} className="mt-0.5 accent-red-500" />
          I have permission to list this person as an emergency contact.
        </label>
        {message && <p className={`mt-3 text-xs font-medium ${message.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</p>}
        <button disabled={isPending} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity disabled:opacity-60">
          {editingId ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          {isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add emergency contact'}
        </button>
      </form>
    </div>
  )
}
