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

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <AppLayout userEmail={user.email!}>
      <section className="h-full overflow-y-auto px-4 py-8 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          {/* Hero greeting */}
          <div className="animate-fade-in-up py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">{greeting}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Hi {displayName} <span className="inline-block origin-[70%_70%] animate-[wave_2s_ease-in-out_1]">👋</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--muted-foreground)]">
              How are you today? Choose where you&apos;d like to begin — chat, journal, or just breathe.
            </p>
          </div>

          {/* Action cards */}
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Chat Card */}
            <Link
              href="/chat"
              className="animate-fade-in-up stagger-1 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary)] via-sky-500 to-cyan-400 p-6 shadow-lg shadow-[var(--primary)]/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--primary)]/25"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
              <div className="relative">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-sm">
                  <HiOutlineChatBubbleOvalLeft className="text-2xl" />
                </div>
                <div className="mt-5">
                  <h2 className="text-lg font-bold text-white">Chat with ASA</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/80">
                    Open a supportive space to talk through anything on your mind.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-white">
                  Start chatting
                  <span className="transition-transform duration-300 group-hover:translate-x-1.5" aria-hidden>→</span>
                </div>
              </div>
            </Link>

            {/* Journal Card */}
            <Link
              href="/journal"
              className="animate-fade-in-up stagger-2 group relative overflow-hidden rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:ring-[var(--primary)]/30 hover:shadow-lg hover:shadow-[var(--primary)]/8"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--secondary)]/[0.03] to-transparent" />
              <div className="relative">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted)] text-lg">
                  📝
                </div>
                <div className="mt-5">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">Journal entry</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                    Capture your thoughts, wins, or challenges in a private space.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                  Open journal
                  <span className="transition-transform duration-300 group-hover:translate-x-1.5" aria-hidden>→</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Quick tips */}
          <div className="animate-fade-in-up stagger-3 rounded-2xl bg-[var(--card)] p-5 ring-1 ring-[var(--border)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">Daily tip</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
              💡 <strong>Try the 5-4-3-2-1 technique</strong> — notice 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste. It&apos;s a simple way to ground yourself when feeling anxious.
            </p>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}
