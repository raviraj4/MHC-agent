'use server'

import { createAdminClient, createClient } from '@/utils/supabase/server'

export interface EmergencyContactPayload {
  name: string
  relationship?: string
  phone: string
  email?: string
  consent: boolean
}

export interface OnboardingPayload {
  name: string
  goals: string[]
  activities: string[]
  emergencyContact: EmergencyContactPayload
}


export async function completeOnboarding(payload: OnboardingPayload) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You need to be signed in to continue.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role && profile.role !== 'user') {
    return { error: 'Onboarding is only available to user accounts.' }
  }

  const trimmedName = payload.name?.trim()
  if (!trimmedName) {
    return { error: 'Please share what you would like us to call you.' }
  }

  const trimmedContactName = payload.emergencyContact?.name?.trim()
  const trimmedContactPhone = payload.emergencyContact?.phone?.trim()

  if (!trimmedContactName || !trimmedContactPhone) {
    return { error: 'Please provide a name and phone number for your emergency contact.' }
  }

  if (!payload.emergencyContact?.consent) {
    return { error: 'Please confirm you have permission to list this emergency contact.' }
  }

  const goals = Array.from(new Set(payload.goals || []))
  const activities = Array.from(new Set(payload.activities || []))

  const profilePayload = {
    id: user.id,
    email: user.email,
    full_name: trimmedName,
    user_name: trimmedName,
    preferences: {
      goals,
      activities,
    },
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  }

  // Update profile with preferences
  const profileResult = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' })

  if (profileResult.error) {
    try {
      const adminSupabase = createAdminClient()
      const { error: adminProfileError } = await adminSupabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })

      if (adminProfileError) {
        return { error: adminProfileError.message }
      }
    } catch (adminError) {
      console.error('[Onboarding Profile Admin Error]', adminError)
      return { error: 'We could not save your profile because the server configuration is incomplete.' }
    }
  }

  // Upsert emergency contact into dedicated table
  const { error: contactError } = await supabase.from('emergency_contacts').upsert(
    {
      user_id: user.id,
      name: trimmedContactName,
      relationship: payload.emergencyContact?.relationship?.trim() || null,
      phone: trimmedContactPhone,
      email: payload.emergencyContact?.email?.trim() || null,
      consent: true,
      is_primary: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,phone' },
  )

  if (contactError) {
    return { error: contactError.message }
  }

  return { success: true, name: trimmedName }
}
