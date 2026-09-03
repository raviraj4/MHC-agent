'use client'

import { signup } from '../actions'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const SIGNUP_CLIENT_COOLDOWN_MS = 60_000

interface SignupState {
  error?: string
  success?: boolean
  message?: string
}

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitInFlight = useRef(false)

  // Password validation rules
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

  const togglePasswordVisibility = () => {
    setShowPassword(true)
    setTimeout(() => setShowPassword(false), 1000)
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(true)
    setTimeout(() => setShowConfirmPassword(false), 1000)
  }

  const handleSubmit = async (formData: FormData) => {
    if (submitInFlight.current) {
      return
    }

    const cooldownUntilRaw = localStorage.getItem('signupCooldownUntil')
    const cooldownUntil = cooldownUntilRaw ? Number(cooldownUntilRaw) : 0
    const now = Date.now()

    if (cooldownUntil > now) {
      const waitSeconds = Math.ceil((cooldownUntil - now) / 1000)
      toast.error('Please wait', {
        description: `You can request another verification email in ${waitSeconds}s.`,
        duration: 3500,
      })
      return
    }

    submitInFlight.current = true
    setIsSubmitting(true)
    
    try {
      const result: SignupState = await signup(formData)
      
      if (result.error) {
        if (
          result.error.toLowerCase().includes('wait') ||
          result.error.toLowerCase().includes('rate limit')
        ) {
          localStorage.setItem('signupCooldownUntil', String(Date.now() + SIGNUP_CLIENT_COOLDOWN_MS))
        }

        toast.error('Registration Failed', {
          description: result.error,
          duration: 5000,
        })
      } else if (result.success) {
        localStorage.setItem('signupCooldownUntil', String(Date.now() + SIGNUP_CLIENT_COOLDOWN_MS))
        toast.success('Registration Successful', {
          description: result.message,
          duration: 4000,
        })
        
        setTimeout(() => {
          router.push('/start-conversation')
        }, 1500)
      }
    } catch (error) {
      toast.error('Unexpected Error', {
        description: 'An unexpected error occurred. Please try again.',
        duration: 5000,
      })
    } finally {
      submitInFlight.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <form
        action={handleSubmit}
        className="relative mx-auto w-full max-w-xl space-y-5 rounded-2xl bg-[var(--card)] p-6"
      >
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--primary)]">Join Asa</p>
          <h1 className="mt-2 text-2xl font-semibold">Create Account</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Tell us about yourself so Asa can tailor every check-in.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Enter your email"
            className="w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              placeholder="Create a strong password"
              className="w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              disabled={isSubmitting}
              className="absolute inset-y-0 right-3 flex items-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
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

          {/* Password Strength Indicator */}
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

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <div className="relative">
            <input 
              id="confirmPassword" 
              name="confirmPassword" 
              type={showConfirmPassword ? 'text' : 'password'}
              required 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full rounded-xl bg-[var(--muted)] px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/50"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              disabled={isSubmitting}
              className="absolute inset-y-0 right-3 flex items-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
            >
              {showConfirmPassword ? (
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
          
          {/* Password Match Indicator */}
          {confirmPassword.length > 0 && (
            <div className={`mt-2 flex items-center text-sm ${validations.passwordsMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
              <div className={`mr-2 h-2 w-2 rounded-full ${validations.passwordsMatch ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {validations.passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </div>
          )}
        </div>

        <button 
          type="submit"
          disabled={!isPasswordValid || isSubmitting}
          className="w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Account...
            </div>
          ) : (
            'Create Account'
          )}
        </button>

        <div className="space-y-2 pt-2 text-center text-sm text-[var(--muted-foreground)]">
          <p>
            Already have an account?{' '}
            <a href="/auth/login" className="font-medium text-[var(--primary)] hover:opacity-80">
              Sign in
            </a>
          </p>
          <p>
            Are you a licensed therapist?{' '}
            <a href="/auth/signup/therapist" className="font-medium text-[var(--primary)] hover:opacity-80">
              Apply here instead
            </a>
          </p>
        </div>
      </form>
    </div>
  )
}

function ValidationLine({ label, isValid }: { label: string; isValid: boolean }) {
  return (
    <div className={`flex items-center ${isValid ? 'text-emerald-500' : 'text-rose-500'}`}>
      <div className={`mr-2 h-2 w-2 rounded-full ${isValid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {label}
    </div>
  )
}