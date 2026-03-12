'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { forgotPassword } from '../actions'

const initialState: { error?: string; success?: boolean; message?: string } = {}

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(forgotPassword, initialState)
  const searchParams = useSearchParams()

  // userType drives post-reset routing (user | professional | organisation)
  const userType = searchParams.get('userType') ?? 'user'

  const label: Record<string, string> = {
    user: 'Reset your password',
    professional: 'Professional account recovery',
    organisation: 'Organisation account recovery',
  }

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-12">
      <div className="relative mx-auto w-full max-w-md">
        <form className="space-y-5 rounded-2xl bg-[var(--card)] p-6">
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--primary)]">
              Account recovery
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              {label[userType] ?? label.user}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Enter the email linked to your account and we&apos;ll send a reset link.
            </p>
          </div>

          {/* hidden field so the server action knows the caller type */}
          <input type="hidden" name="userType" value={userType} />

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
            />
          </div>

          <button
            formAction={formAction}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition hover:opacity-90"
          >
            Send reset link
          </button>

          {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
          {state?.success && <p className="text-sm text-emerald-500">{state.message}</p>}

          <div className="text-center text-sm text-[var(--muted-foreground)]">
            <a href="/auth/login" className="font-medium text-[var(--primary)] hover:opacity-80">
              Back to sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
