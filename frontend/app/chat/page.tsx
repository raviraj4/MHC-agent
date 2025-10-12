import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'
// import { logout } from '../auth/actions'
// import ThemeToggle from '@/components/ui/ThemeToggle'
import AppLayout from '@/components/layouts/AppLayout'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <AppLayout userEmail={session.user.email!}>
      {/* Chat Interface */}
      <div className="h-full flex flex-col p-6">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to Your Mental Health Companion
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Chat interface coming soon...
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}