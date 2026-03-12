'use client'

import { useActionState, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { resetPassword } from '../actions'

const initialState: { error?: string; success?: boolean; message?: string } = {}

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState(resetPassword, initialState)
  const searchParams = useSearchParams()
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)

  // userType passed through the callback redirect
  const userType = searchParams.get('type') ?? 'user'

  const validations = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    passwordsMatch: password === confirmPassword && confirmPassword.length > 0,
  }

  const isPasswordValid = Object.values(validations).every(Boolean)
  const shouldShowValidation = passwordTouched && password.length > 0

  const togglePassword = () => {
    setShowPassword(true)
    setTimeout(() => setShowPassword(false), 1000)
  }

  const toggleConfirm = () => {
    setShowConfirm(true)
    setTimeout(() => setShowConfirm(false), 1000)
  }

  // Redirect after successful reset
  if (state?.success) {
    setTimeout(() => router.push('/auth/login'), 2000)
  }

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-12">
      <div className="relative mx-auto w-full max-w-md">
        <form className="space-y-5 rounded-2xl bg-[var(--card)] p-6">
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--primary)]">
              Secure your account
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Set a new password</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Choose a strong password to keep your account safe.
            </p>
          </div>

          {/* Hidden field preserving userType through the form submission */}
          <input type="hidden" name="userType" value={userType} />

          {/* New password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">New Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                placeholder="Enter new password"
                className="w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
              />
              <button
                type="button"
                onClick={togglePassword}
                aria-label="Toggle password visibility"
                className="absolute inset-y-0 right-3 flex items-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            {shouldShowValidation && (
              <div className="mt-3 space-y-2 text-sm">
                <ValidationLine label="At least 8 characters" isValid={validations.minLength} />
                <ValidationLine label="One uppercase letter" isValid={validations.hasUpperCase} />
                <ValidationLine label="One lowercase letter" isValid={validations.hasLowerCase} />
                <ValidationLine label="One number" isValid={validations.hasNumber} />
                <ValidationLine label="One special character" isValid={validations.hasSpecialChar} />
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
              />
              <button
                type="button"
                onClick={toggleConfirm}
                aria-label="Toggle confirm password visibility"
                className="absolute inset-y-0 right-3 flex items-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {confirmPassword.length > 0 && !validations.passwordsMatch && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <button
            formAction={formAction}
            disabled={!isPasswordValid}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Update password
          </button>

          {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
          {state?.success && <p className="text-sm text-emerald-500">{state.message}</p>}
        </form>
      </div>
    </div>
  )
}

/* ── tiny shared components ─────────────────────────────── */

function ValidationLine({ label, isValid }: { label: string; isValid: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={isValid ? 'text-emerald-500' : 'text-[var(--muted-foreground)]'}>
        {isValid ? '✓' : '○'}
      </span>
      <span className={isValid ? 'text-emerald-600' : 'text-[var(--muted-foreground)]'}>
        {label}
      </span>
    </div>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}
