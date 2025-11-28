import AppLayout from '@/components/layouts/AppLayout'
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
      <section className="h-full overflow-y-auto bg-gray-50 px-4 py-10 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-amber-500">Journal</p>
          <h1 className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">Coming soon</h1>
          <p className="mt-3 text-base">
            We&apos;re building reflective prompts and mood tracking. For now, hop into chat with Asa
            or check back later.
          </p>
        </div>
      </section>
    </AppLayout>
  )
}
