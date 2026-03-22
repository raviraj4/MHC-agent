import { createClient } from '../utils/supabase/server'
import { redirect } from 'next/navigation'
import HomeChat from '@/components/home/HomeChat'

export default async function Home() {
  const supabase = await createClient()
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user

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