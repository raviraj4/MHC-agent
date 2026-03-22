
import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'
// import { logout } from '../auth/actions'
// import ThemeToggle from '@/components/ui/ThemeToggle'
import AppLayout from '@/components/layouts/AppLayout'
import AsaChatInterface from './AsaChatInterface'

export default async function ChatPage() {
const supabase = await createClient()
const { data: { user }, error: authError } = await supabase.auth.getUser()

if (authError || !user) {
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
      {/* Chat Interface */}
        <AsaChatInterface userId={user.id} />
    </AppLayout>
  )
}