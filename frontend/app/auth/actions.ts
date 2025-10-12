'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Validation
  if (!data.email || !data.password) {
    return { error: 'Email and password are required' }
  }

  if (!data.email.includes('@')) {
    return { error: 'Please enter a valid email address' }
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    const errorMessages: { [key: string]: string } = {
      'Invalid login credentials': 'Invalid email or password',
      'Email not confirmed': 'Please confirm your email address before logging in',
    }
    
    return { error: errorMessages[error.message] || 'Authentication failed' }
  }

  redirect('/chat')
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

  const { data: signUpData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    const errorMessages: { [key: string]: string } = {
      'User already registered': 'An account with this email already exists',
      'Invalid email': 'Please enter a valid email address',
    }
    
    return { error: errorMessages[error.message] || 'Registration failed' }
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

export async function logout() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    return { error: error.message }
  }
  
  redirect('/auth/login')
}