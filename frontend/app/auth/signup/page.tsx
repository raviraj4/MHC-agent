'use client'

import { signup } from '../actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
    setIsSubmitting(true)
    
    try {
      const result: SignupState = await signup(formData)
      
      if (result.error) {
        toast.error('Registration Failed', {
          description: result.error,
          duration: 5000,
        })
      } else if (result.success) {
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
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[var(--background)] px-4 py-12 text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-r from-[#3b82f6]/30 via-transparent to-[#06b6d4]/30 blur-3xl" aria-hidden />
      <form
        action={handleSubmit}
        className="relative mx-auto w-full max-w-xl space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--card)]/95 p-8 shadow-2xl backdrop-blur"
      >
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#38bdf8]">Join Asa</p>
          <h1 className="mt-2 text-3xl font-semibold">Create Account</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Tell us about yourself so Asa can tailor every check-in.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Enter your email"
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-background)] px-4 py-3 text-sm focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/30"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
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
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-background)] px-4 py-3 pr-12 text-sm focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/30"
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

        <div className="space-y-2">
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
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-background)] px-4 py-3 pr-12 text-sm focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/30"
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
          className="w-full rounded-full bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
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

        <p className="pt-2 text-center text-sm text-[var(--muted-foreground)]">
          Already have an account?{' '}
          <a 
            href="/auth/login" 
            className="font-semibold text-[#38bdf8] hover:text-[#0ea5e9]"
          >
            Sign in
          </a>
        </p>
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