import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'

interface EmergencyContactPreference {
  name?: string
  relationship?: string
  phone?: string
  email?: string
  consent?: boolean
}

interface Preferences {
  goals?: string[]
  activities?: string[]
  emergencyContact?: EmergencyContactPreference
}

export default async function StartConversationPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, user_name, preferences, onboarding_completed, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  if (profile?.role === 'therapist') {
    redirect('/therapist-dashboard')
  }

  const { data: emergencyContact } = await supabase
    .from('emergency_contacts')
    .select('name, relationship, phone, email, consent')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile?.onboarding_completed) {
    redirect('/dashboard')
  }

  const preferences = (profile?.preferences as Preferences | null) || undefined

  return (
    <div className="relative min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <div className="relative mx-auto max-w-3xl space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--primary)]">
            Start Conversation
          </p>
          <h1 className="text-2xl font-semibold">Let&apos;s get to know you</h1>
          <p className="mx-auto max-w-lg text-sm text-[var(--muted-foreground)]">
            Asa tailors each interaction to your needs. Answer a few quick questions so we can
            support you better.
          </p>
        </div>

        <OnboardingFlow
          initialName={profile?.full_name || profile?.user_name || ''}
          initialGoals={preferences?.goals || []}
          initialActivities={preferences?.activities || []}
          initialEmergencyContact={emergencyContact || {}}
        />
      </div>
    </div>
  )
}
