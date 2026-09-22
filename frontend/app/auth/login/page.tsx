'use client'
import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const togglePasswordVisibility = () => {
    setShowPassword(true)
    setTimeout(() => setShowPassword(false), 1000)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.user) {
        setMessage(error?.message || 'Unable to sign in. Check your email and password.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError) {
        setMessage('Signed in, but we could not load your account details. Please try again.')
        return
      }

      const destination = profile?.role === 'admin'
        ? '/admin'
        : profile?.role === 'therapist'
          ? '/therapist-dashboard'
          : profile?.onboarding_completed
            ? '/dashboard'
            : '/start-conversation'

      router.replace(destination)
      router.refresh()
    } catch {
      setMessage('Something went wrong while signing in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-12">
      <div className="relative mx-auto w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-[var(--card)] p-6">
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--primary)]">
              Welcome back
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Continue your conversation with Asa.
            </p>
          </div>

          <div className="relative text-center text-[10px] text-[var(--muted-foreground)]">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--muted)]" aria-hidden />
            <span className="relative bg-[var(--card)] px-3 uppercase tracking-widest">continue with email</span>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={isSubmitting}
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
            <div className="text-right">
              <a href="/auth/forgot-password" className="text-xs text-[var(--primary)] hover:opacity-80">
                Forgot password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition hover:opacity-90"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          {message && <p className="text-sm text-red-500">{message}</p>}

          <div className="space-y-1.5 text-center text-sm text-[var(--muted-foreground)]">
            <p>Don&apos;t have an account?</p>
            <a href="/auth/signup" className="font-medium text-[var(--primary)] hover:opacity-80">
              Sign up
            </a>
          </div>

          <div className="space-y-1.5 text-center text-sm text-[var(--muted-foreground)]">
            <p>Registered mental health pro?</p>
            <a href="/auth/signup/therapist" className="font-medium text-[var(--primary)] hover:opacity-80">
              Sign up as a therapist
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
