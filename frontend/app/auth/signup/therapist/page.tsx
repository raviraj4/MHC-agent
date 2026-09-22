'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, InputHTMLAttributes, useState } from 'react'
import { toast } from 'sonner'
import { signupTherapist } from '../../actions'

export default function TherapistSignupPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const password = String(formData.get('password') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await signupTherapist(formData)
      if (result.error) {
        toast.error('Application not submitted', { description: result.error })
        return
      }

      toast.success('Application submitted', { description: result.message })
      form.reset()
      router.push('/auth/login')
    } catch {
      toast.error('Application not submitted', {
        description: 'Something went wrong. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)] sm:py-16">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl space-y-6 rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)] sm:p-8">
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--primary)]">Professional application</p>
          <h1 className="mt-2 text-2xl font-semibold">Join Asa as a therapist</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Submit your credentials for review. Your account is activated after approval.
          </p>
        </div>

        <fieldset disabled={isSubmitting} className="space-y-5 disabled:opacity-70">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" name="fullName" autoComplete="name" required />
            <Field label="License number" name="licenseNumber" required />
          </div>
          <Field label="Email address" name="email" type="email" autoComplete="email" required />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" required className="w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-3 text-xs font-medium text-[var(--primary)]">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">At least 8 characters.</p>
            </div>
            <Field label="Confirm password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required />
          </div>
          <Field label="Practice name" name="practiceName" hint="Optional" />
          <Field label="Specializations" name="specializations" hint="Optional — separate multiple areas with commas" placeholder="Anxiety, CBT, trauma-informed care" />
          <div className="space-y-1.5">
            <label htmlFor="bio" className="text-sm font-medium">Professional bio <span className="font-normal text-[var(--muted-foreground)]">(optional)</span></label>
            <textarea id="bio" name="bio" rows={4} placeholder="Briefly describe your professional experience and approach." className="w-full resize-y rounded-xl bg-[var(--muted)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50" />
          </div>
        </fieldset>

        <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-[var(--primary-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Submitting application…' : 'Submit application'}
        </button>

        <p className="text-center text-sm text-[var(--muted-foreground)]">
          Already have an account? <Link href="/auth/login" className="font-medium text-[var(--primary)] hover:opacity-80">Sign in</Link>
        </p>
      </form>
    </main>
  )
}

function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={props.name} className="text-sm font-medium">{label} {hint && <span className="font-normal text-[var(--muted-foreground)]">({hint})</span>}</label>
      <input id={props.name} {...props} className="w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50" />
    </div>
  )
}
