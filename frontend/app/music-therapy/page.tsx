import { redirect } from 'next/navigation'
import AppLayout from '@/components/layouts/AppLayout'
import MusicTherapyClient from '@/components/music-therapy/MusicTherapyClient'
import { createClient } from '@/utils/supabase/server'

export default async function MusicTherapyPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  return (
    <AppLayout userEmail={user.email!}>
      <MusicTherapyClient userId={user.id} />
    </AppLayout>
  )
}