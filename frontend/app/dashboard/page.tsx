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
      <section className="h-full overflow-y-auto px-4 py-8 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          {/* Header Section - Clean & minimal */}
          <div className="py-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--muted-foreground)]">Welcome back</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Hi {displayName}, how are you feeling today?
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Choose where you&apos;d like to begin. Chat with Asa or write a journal entry.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Chat Card - Primary action */}
            <Link
              href="/chat"
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-sky-500 to-cyan-400 p-6 transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white">
                  <HiOutlineChatBubbleOvalLeft className="text-xl" />
                </div>
                <div className="mt-5">
                  <h2 className="text-lg font-semibold text-white">Chat with ASA</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/75">
                    Open a supportive space to talk through anything on your mind.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-white">
                  Start chatting
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden>→</span>
                </div>
              </div>
            </Link>

            {/* Journal Card - Secondary action */}
            <Link
              href="/journal"
              className="group relative overflow-hidden rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)] transition-all duration-200 hover:ring-2 hover:ring-[var(--primary)]/40 hover:shadow-lg hover:shadow-[var(--primary)]/10 hover:-translate-y-0.5"
            >
              <div className="relative">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--muted)] text-lg">
                  📝
                </div>
                <div className="mt-5">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">Journal entry</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                    Capture your thoughts, wins, or challenges in a private space.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-[var(--primary)]">
                  Open journal
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden>→</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}
