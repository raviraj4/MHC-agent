'use server'

import { createAdminClient, createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

const SIGNUP_COOLDOWN_MS = 60_000
const signupAttemptByEmail = new Map<string, number>()

export async function login(_prevState: { error: boolean; message: string },
  formData: FormData) {

  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Validation
  if (!data.email || !data.password) {
    return { error: true, message: 'Email and password are required' }
  }

  if (!data.email.includes('@')) {
    return { error: true, message: 'Please enter a valid email address' }
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    // Check for specific email unverified error from Supabase
    const errMsg = error.message.toLowerCase()
    if (errMsg.includes('email not confirmed') || errMsg.includes('email not verified') || error.code === 'email_not_confirmed') {
      return { error: true, message: 'Email not verified. Please check your inbox for a confirmation link.' }
    }
    return { error: true, message: 'Authentication failed! (check password/email)' }
  }

  // Check if user has completed onboarding
  if (authData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profile?.role === 'admin') {
      redirect('/admin')
    }

    if (profile?.role === 'therapist') {
      redirect('/therapist-dashboard')
    }

    // Redirect to onboarding if profile doesn't exist or onboarding not completed
    if (profile?.onboarding_completed === true) {
      redirect('/dashboard')
    }else {
      redirect('/start-conversation')
    }
  }

  redirect('/dashboard')
  // return { error: false, message: 'successfully signed in user! ' }

}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Enhanced validation
  if (!data.email || !data.password) {
    return { error: 'Email and password are required' }
  }

  if (!data.email.includes('@')) {
    return { error: 'Please enter a valid email address' }
  }

  if (data.password.length < 8) {
    return { error: 'Password must be at least 8 characters long' }
  }

  const normalizedEmail = data.email.trim().toLowerCase()
  const lastAttemptAt = signupAttemptByEmail.get(normalizedEmail)
  const now = Date.now()

  if (lastAttemptAt && now - lastAttemptAt < SIGNUP_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((SIGNUP_COOLDOWN_MS - (now - lastAttemptAt)) / 1000)
    return {
      error: `Please wait ${waitSeconds}s before requesting another verification email.`
    }
  }

  signupAttemptByEmail.set(normalizedEmail, now)

  const { data: signUpData, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    console.error('[Signup Error]', error.message, error.status, error.code)
    const errorMessages: { [key: string]: string } = {
      'User already registered': 'An account with this email already exists',
      'Invalid email': 'Please enter a valid email address',
      'Signup requires a valid password': 'Please enter a valid password',
      'Unable to validate email address: invalid format': 'Please enter a valid email address',
      'For security purposes, you can only request this once every 60 seconds': 'Too many signup attempts. Please wait 60 seconds before trying again.',
      over_email_send_rate_limit: 'Email sending rate limit reached. Please wait about a minute before trying again.',
    }
    
    return { error: errorMessages[error.code || ''] || errorMessages[error.message] || `Registration failed: ${error.message}` }
  }

  if (signUpData.user && !signUpData.user.identities?.length) {
    return { error: 'An account with this email already exists' }
  }

  // Success - will be handled by the component with toast
  return { 
    success: true,
    message: 'Registration successful! Please check your email for verification link.'
  }
}

export async function signupTherapist(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string | null)?.trim().toLowerCase()
  const password = formData.get('password') as string | null
  const fullName = (formData.get('fullName') as string | null)?.trim()
  const licenseNumber = (formData.get('licenseNumber') as string | null)?.trim()
  const practiceName = (formData.get('practiceName') as string | null)?.trim()
  const specializations = (formData.get('specializations') as string | null)?.trim()
  const bio = (formData.get('bio') as string | null)?.trim()

  if (!email || !password || !fullName || !licenseNumber) {
    return { error: 'Please complete the required therapist profile fields.' }
  }

  if (!email.includes('@')) {
    return { error: 'Please enter a valid email address.' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' }
  }

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedSpecializations = specializations
    ? specializations
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : []

  const { data: signUpData, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    console.error('[Therapist Signup Error]', error.message, error.status, error.code)
    return { error: error.message || 'Therapist registration failed.' }
  }

  if (signUpData.user && !signUpData.user.identities?.length) {
    return { error: 'An account with this email already exists.' }
  }

  const profilePayload = {
    id: signUpData.user?.id,
    email: normalizedEmail,
    full_name: fullName,
    user_name: fullName,
    role: 'therapist',
    onboarding_completed: false,
    preferences: {
      account_type: 'therapist',
      verification_status: 'pending_review',
      license_number: licenseNumber,
      practice_name: practiceName || null,
      specializations: normalizedSpecializations,
      bio: bio || null,
    },
    updated_at: new Date().toISOString(),
  }

  const profileResult = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' })

  if (profileResult.error) {
    try {
      const adminSupabase = await createAdminClient()
      const { error: adminProfileError } = await adminSupabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })

      if (adminProfileError) {
        console.error('[Therapist Profile Error]', adminProfileError.message)
        return { error: adminProfileError.message || 'We could not save your therapist profile.' }
      }
    } catch (adminError) {
      console.error('[Therapist Profile Admin Error]', adminError)
      return { error: 'We could not save your therapist profile because the server configuration is incomplete.' }
    }
  }

  if (!signUpData.user?.id) {
    return { error: 'We could not create your therapist account. Please try again.' }
  }

  const therapistProfilePayload = {
    therapist_id: signUpData.user.id,
    profile_id: signUpData.user.id,
    license_number: licenseNumber,
    practice_name: practiceName || null,
    specializations: normalizedSpecializations,
    bio: bio || null,
    verification_status: 'pending_review',
    updated_at: new Date().toISOString(),
  }

  // This is the record consumed by the admin review queue. Use the service-role
  // client because a newly registered user may not yet have an authenticated session.
  try {
    const adminSupabase = await createAdminClient()
    const { error: therapistProfileError } = await adminSupabase
      .from('therapist_profiles')
      .upsert(therapistProfilePayload, { onConflict: 'therapist_id' })

    if (therapistProfileError) {
      console.error('[Therapist Application Error]', therapistProfileError.message)
      return { error: 'Your account was created, but we could not submit the application. Please contact support.' }
    }
  } catch (adminError) {
    console.error('[Therapist Application Admin Error]', adminError)
    return { error: 'Your account was created, but the application service is unavailable. Please contact support.' }
  }

  return {
    success: true,
    message: 'Therapist application received. We will review your credentials before activating your account.',
  }
}

/**
 * Sends a password reset email via Supabase.
 * Accepts an optional `userType` to build a redirect URL that the
 * reset-password page can use for role-aware post-reset routing
 * (e.g. user / professional / organisation).
 */
export async function forgotPassword(
  _prevState: { error?: string; success?: boolean; message?: string },
  formData: FormData
) {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const userType = (formData.get('userType') as string) || 'user'

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password&type=${encodeURIComponent(userType)}`,
  })

  if (error) {
    // Don't leak whether the email exists – always show a generic message
    console.error('[ForgotPassword Error]', error.message)
  }

  // Always return success to avoid email enumeration
  return {
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent. Please check your inbox.',
  }
}

/**
 * Updates the user's password after they click the recovery link.
 * Requires an active Supabase session (set by the callback route).
 */
export async function resetPassword(
  _prevState: { error?: string; success?: boolean; message?: string },
  formData: FormData
) {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('[ResetPassword Error]', error.message)
    return { error: error.message }
  }

  return {
    success: true,
    message: 'Password updated successfully! Redirecting to login…',
  }
}

export async function logout() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    return { error: error.message }
  }
  
  redirect('/auth/login')
}
