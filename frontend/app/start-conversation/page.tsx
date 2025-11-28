import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'

interface Preferences {
  goals?: string[]
  activities?: string[]
}

export default async function StartConversationPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user || error) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, user_name, preferences, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.onboarding_completed) {
    redirect('/dashboard')
  }

  const preferences = (profile?.preferences as Preferences | null) || undefined

  return (
    <div className="relative min-h-screen bg-[var(--background)] px-4 py-12 text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-r from-[#3b82f6]/25 via-transparent to-[#06b6d4]/25 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-4xl space-y-10">
        <div className="space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#38bdf8]">
            Start Conversation
          </p>
          <h1 className="text-4xl font-semibold">Let&apos;s get to know you</h1>
          <p className="mx-auto max-w-2xl text-base text-[var(--muted-foreground)]">
            Asa tailors each interaction to your needs. Answer a few quick questions so we can
            support you better.
          </p>
        </div>

        <OnboardingFlow
          initialName={profile?.full_name || profile?.user_name || ''}
          initialGoals={preferences?.goals || []}
          initialActivities={preferences?.activities || []}
        />
      </div>
    </div>
  )
}
