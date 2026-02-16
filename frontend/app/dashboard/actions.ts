'use server'

import { createClient } from '@/utils/supabase/server'
import type { MoodCheckin } from '@/types'

export async function logMoodCheckin(data: {
  mood: number
  energy: number
  stress: number
  note?: string
  tags?: string[]
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    return { error: 'Not authenticated' }
  }

  const { data: checkin, error } = await supabase
    .from('mood_checkins')
    .insert({
      user_id: user.id,
      mood: data.mood,
      energy: data.energy,
      stress: data.stress,
      note: data.note || null,
      tags: data.tags || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Mood insert error:', JSON.stringify(error, null, 2))
    return { error: error.message || 'Failed to save check-in. Have you run the mood_checkins migration?' }
  }

  return { data: checkin as MoodCheckin }
}
