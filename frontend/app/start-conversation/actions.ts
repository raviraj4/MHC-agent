'use server'

import { createClient } from '@/utils/supabase/server'

export interface OnboardingPayload {
  name: string
  goals: string[]
  activities: string[]
}


export async function completeOnboarding(payload: OnboardingPayload) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You need to be signed in to continue.' }
  }

  const trimmedName = payload.name?.trim()
  if (!trimmedName) {
    return { error: 'Please share what you would like us to call you.' }
  }

  const goals = Array.from(new Set(payload.goals || []))
  const activities = Array.from(new Set(payload.activities || []))

  const { error } = await supabase.from('profiles').upsert(
    {
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
    },
    { onConflict: 'id' },
  )

  if (error) {
    return { error: error.message }
  }

  return { success: true, name: trimmedName }
}
