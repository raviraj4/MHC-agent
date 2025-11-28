'use client'
import { useActionState, useState } from 'react'
import { login } from '../actions'


const initialState = { error: false, message: '' }

export default function LoginPage() {
  const [state, formAction] = useActionState(login, initialState)
  const [showPassword, setShowPassword] = useState(false)

  const togglePasswordVisibility = () => {
    setShowPassword(true)
    setTimeout(() => setShowPassword(false), 1000)
  }

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl" aria-hidden>
        <div className="mx-auto h-full max-w-3xl bg-gradient-to-r from-[#3b82f6]/20 via-[#06b6d4]/20 to-transparent" />
      </div>
      <div className="relative mx-auto w-full max-w-md">
        <form className="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--card)]/95 p-8 shadow-2xl backdrop-blur">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#38bdf8]">
              Welcome back
            </p>
            <h1 className="mt-2 text-3xl font-semibold">User Login</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Sign in to continue your conversation with Asa.
            </p>
          </div>

          <div className="relative text-center text-xs text-[var(--muted-foreground)]">
            <span className="bg-[var(--card)] px-3 uppercase tracking-[0.3em]">continue with email</span>
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--border)]" aria-hidden />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-background)] px-4 py-3 text-sm focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/30"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-background)] px-4 py-3 pr-12 text-sm focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/30"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-3 flex items-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            formAction={formAction}
            className="w-full rounded-full bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:opacity-95"
          >
            Log in (User)
          </button>

          {state.error && <p className="text-sm text-red-500">{state.message}</p>}
          {!state.error && state.message && <p className="text-sm text-emerald-500">{state.message}</p>}

          <div className="space-y-2 text-center text-sm text-[var(--muted-foreground)]">
            <p>Don&apos;t have a member account?</p>
            <a href="/auth/signup" className="font-semibold text-[#38bdf8] hover:text-[#0ea5e9]">
              Sign up as a Member
            </a>
          </div>

          <div className="space-y-2 text-center text-sm text-[var(--muted-foreground)]">
            <p>Registered mental health pro?</p>
            <a href="#" className="font-semibold text-[#38bdf8] hover:text-[#0ea5e9]">
              Sign up as a Pro
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}