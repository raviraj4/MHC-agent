import AppLayout from '@/components/layouts/AppLayout'
import { DirectMessageClient } from '@/components/messages/DirectMessageClient'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DirectMessagePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/auth/login')
  const { id } = await params
  return <AppLayout userEmail={user.email || ''}><DirectMessageClient conversationId={id} /></AppLayout>
}
