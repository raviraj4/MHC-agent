'use server'

import { createClient } from '@/utils/supabase/server'

export interface EmergencyContactInput {
  id?: string
  name: string
  relationship?: string
  phone: string
  email?: string
  consent: boolean
}

export async function saveEmergencyContact(input: EmergencyContactInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You need to be signed in to update emergency contacts.' }

  const name = input.name?.trim()
  const phone = input.phone?.trim()
  if (!name || !phone) return { error: 'Please provide a contact name and phone number.' }
  if (!input.consent) return { error: 'Please confirm you have permission to list this contact.' }

  const payload = {
    user_id: user.id,
    name,
    relationship: input.relationship?.trim() || null,
    phone,
    email: input.email?.trim() || null,
    consent: true,
    is_primary: false,
    updated_at: new Date().toISOString(),
  }

  const result = input.id
    ? await supabase.from('emergency_contacts').update(payload).eq('id', input.id).eq('user_id', user.id)
    : await supabase.from('emergency_contacts').upsert(payload, { onConflict: 'user_id,phone' })

  if (result.error) {
    console.error('[Emergency Contact Save Error]', result.error)
    return { error: result.error.message || 'Unable to save emergency contact.' }
  }

  return { success: true }
}
