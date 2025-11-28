import Link from 'next/link'
import { redirect } from 'next/navigation'
import { HiOutlineChatBubbleOvalLeft } from 'react-icons/hi2'
import AppLayout from '@/components/layouts/AppLayout'
import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {
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
    .select('full_name, user_name, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.onboarding_completed) {
    redirect('/start-conversation')
  }

  const displayName = profile.full_name || profile.user_name || user.email || 'friend'

  return (
    <AppLayout userEmail={user.email!}>
      <section className="h-full overflow-y-auto bg-gray-50 px-4 py-10 dark:bg-gray-900">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="rounded-3xl m-4">
            {/* border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 */}
            
            <h1 className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">
              Hi {displayName}, how are you feeling today?
            </h1>
            <p className="mt-2 text-base text-gray-600 dark:text-gray-300">
              Choose where you&apos;d like to begin. You can chat with Asa any time or drop a quick
              journal entry.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/chat"
              className="rounded-3xl bg-gradient-to-r from-[#3b82f6] via-[#0284c7] to-[#06b6d4] p-6 shadow-lg shadow-sky-500/25 transition hover:scale-[1.01]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 text-white/90">
                <HiOutlineChatBubbleOvalLeft className="text-lg" />
              </div>
              <div className="mt-4 text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.3em]">Chat with ASA</p>
                <h2 className="mt-3 text-2xl font-semibold">Get support anytime</h2>
                <p className="mt-2 text-sm text-white/80">
                  Open a supportive space to talk through anything on your mind.
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-white">
                  Go to chat →
                </span>
              </div>
            </Link>

            <Link
              href="/journal"
              className="rounded-3xl border border-[#3b82f6] bg-white p-6 shadow-sm transition hover:border-[#3b82f6] hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#00486c]">Reflection</p>
              <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">Journal entry</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Capture thoughts, wins, or challenges—you&apos;ll soon see guided prompts here.
              </p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-[#00486c]">
                Open journal →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}
