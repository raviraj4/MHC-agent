import AppLayout from '@/components/layouts/AppLayout'
import ThemeToggle from '@/components/ui/ThemeToggle'
import LogoutButton from '@/app/auth/LogoutButton'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

interface Preferences {
  goals?: string[]
  activities?: string[]
}

export default async function ProfilePage() {
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
    .select('full_name, user_name, onboarding_completed, preferences')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.onboarding_completed) {
    redirect('/start-conversation')
  }

  const preferences = (profile?.preferences as Preferences | null) || undefined
  const goals = preferences?.goals || []
  const activities = preferences?.activities || []
  const preferredName = profile.full_name || profile.user_name || 'Friend'
  const cardClasses = 'rounded-2xl bg-[var(--card)] p-6 ring-1 ring-[var(--border)] transition-all duration-200'
  const labelClasses = 'text-[var(--muted-foreground)] uppercase tracking-widest text-[10px] font-medium'
  const chipClasses = 'rounded-full bg-[var(--muted)] px-3 py-1.5 text-xs text-[var(--foreground)]'

  return (
    <AppLayout userEmail={user.email!}>
      <div className="h-full w-full overflow-y-auto">
        <section className="px-4 py-8 lg:px-8 max-w-2xl mx-auto space-y-5 text-[var(--foreground)]">
          <div className="py-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--muted-foreground)]">Settings</p>
            <h2 className="mt-2 text-2xl font-semibold">Profile</h2>
          </div>

          <div className={cardClasses}>
            <h3 className="text-base font-semibold mb-4">Account</h3>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className={labelClasses}>Preferred name</dt>
                <dd className="font-medium">{preferredName}</dd>
              </div>
              <div>
                <dt className={labelClasses}>Email</dt>
                <dd className="font-mono text-sm">{user.email}</dd>
              </div>
              <div>
                <dt className={labelClasses}>Verified</dt>
                <dd className="font-medium">
                  {user.email_confirmed_at ? (
                    <span className="text-emerald-500">Verified</span>
                  ) : (
                    <span className="text-amber-500">Pending verification</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className={`${cardClasses} space-y-5`}>
            <div>
              <h3 className="text-base font-semibold">Wellbeing goals</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">From onboarding · edit anytime</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(goals.length ? goals : ['No goals captured yet']).map((goal) => (
                  <span key={`goal-${goal}`} className={chipClasses}>
                    {goal}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold">Favourite activities</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">We use these to tailor prompts</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(activities.length ? activities : ['No activities captured yet']).map((activity) => (
                  <span key={`activity-${activity}`} className={chipClasses}>
                    {activity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={`${cardClasses} flex items-center justify-between`}> 
            <div>
              <h3 className="text-base font-semibold">Appearance</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Switch between light and dark mode</p>
            </div>
            <ThemeToggle />
          </div>

          <div className={`${cardClasses} flex justify-between items-center`}>
            <div>
              <h3 className="text-base font-semibold">Sign out</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">End the session on this device</p>
            </div>
            <LogoutButton />
          </div>
        </section>
      </div>
    </AppLayout>
  )
}