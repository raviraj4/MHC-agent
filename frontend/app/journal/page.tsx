import AppLayout from '@/components/layouts/AppLayout'
import { JournalClient } from '@/components/journal/JournalClient'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function JournalPage() {
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
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.onboarding_completed) {
    redirect('/start-conversation')
  }

  return (
    <AppLayout userEmail={user.email!}>
      <JournalClient />
    </AppLayout>
  )
}
