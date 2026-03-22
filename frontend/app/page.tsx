import { createClient } from '../utils/supabase/server'
import { redirect } from 'next/navigation'
import HomeChat from '@/components/home/HomeChat'

export default async function Home() {
  const supabase = await createClient()
  
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    // User not authenticated, show home page
    return <HomeChat />
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.onboarding_completed) {
      redirect('/chat')
    }
    redirect('/dashboard')
  }

  return <HomeChat />
}