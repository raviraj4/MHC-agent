
import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'
// import { logout } from '../auth/actions'
// import ThemeToggle from '@/components/ui/ThemeToggle'
import AppLayout from '@/components/layouts/AppLayout'
import ChatInterface from './ChatInterface'
import AsaChatInterface from './AsaChatInterface'

export default async function ChatPage() {
const supabase = await createClient()
const { data: { user }, error } = await supabase.auth.getUser()

if (!user || error) {
  redirect('/auth/login')
}

  return (
    <AppLayout userEmail={user.email!}>
      {/* Chat Interface */}
        <AsaChatInterface userId={user.id} />
    </AppLayout>
  )
}