import { redirect } from 'next/navigation'
import { IoSparkles } from 'react-icons/io5'
import { HiOutlineMusicNote, HiOutlineUsers, HiOutlineLightBulb } from 'react-icons/hi'
import AppLayout from '@/components/layouts/AppLayout'
import { createClient } from '@/utils/supabase/server'

type PlaygroundModule = {
  title: string
  description: string
  tag: string
  icon: React.ComponentType<{ className?: string }>
}

const modules: PlaygroundModule[] = [
  {
    title: 'Music therapy',
    description:
      'Use curated sound prompts and reflection cues to regulate emotions and lower stress.',
    tag: 'Static preview',
    icon: HiOutlineMusicNote,
  },
  {
    title: 'Role playing',
    description:
      'Practice difficult conversations in a safe space with guided scenarios and response ideas.',
    tag: 'Static preview',
    icon: HiOutlineUsers,
  },
  {
    title: 'Thought reframing',
    description:
      'Spot unhelpful thoughts and rewrite them with balanced alternatives using CBT patterns.',
    tag: 'Static preview',
    icon: HiOutlineLightBulb,
  },
]

export default async function PlaygroundPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

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
      <section className="h-full overflow-y-auto px-4 py-8 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <div className="animate-fade-in-up py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Explore</p>
            <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">
              CBT Playground
              <IoSparkles className="text-[var(--primary)]" />
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
              Try interactive CBT-inspired activities in one place. These modules are static for now,
              and ready for behavior wiring in the next iteration.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module, index) => {
              const Icon = module.icon
              return (
                <article
                  key={module.title}
                  className={`animate-fade-in-up stagger-${index + 1} group relative overflow-hidden rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:ring-[var(--primary)]/30 hover:shadow-lg hover:shadow-[var(--primary)]/8`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--secondary)]/[0.03] to-transparent" />
                  <div className="relative">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted)] text-[var(--primary)]">
                      <Icon className="text-xl" />
                    </div>
                    <div className="mt-5">
                      <p className="inline-flex rounded-full bg-[var(--primary)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                        {module.tag}
                      </p>
                      <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">{module.title}</h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                        {module.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="mt-6 rounded-xl bg-[var(--muted)] px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)]"
                    >
                      Coming soon
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </AppLayout>
  )
}
