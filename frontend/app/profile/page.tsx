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
    error,
  } = await supabase.auth.getUser()

  if (!user || error) {
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
  const cardClasses = 'bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm'
  const labelClasses = 'text-[var(--muted-foreground)] uppercase tracking-wide text-xs'
  const chipClasses = 'rounded-full bg-[var(--muted)] px-3 py-1 text-xs text-[var(--foreground)]'

  return (
    <AppLayout userEmail={user.email!}>
      <div className="h-full w-full overflow-y-auto">
        <section className="px-6 py-10 pb-16 max-w-2xl mx-auto space-y-8 text-[var(--foreground)]">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-[var(--muted-foreground)]">Settings</p>
            <h2 className="mt-2 text-2xl font-semibold">Profile</h2>
          </div>

          <div className={cardClasses}>
            <h3 className="text-lg font-medium mb-4">Account</h3>
            <dl className="space-y-3 text-sm">
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

          <div className={`${cardClasses} space-y-6`}>
            <div>
              <h3 className="text-lg font-medium">Wellbeing goals</h3>
              <p className="text-sm text-[var(--muted-foreground)]">From onboarding · edit anytime</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(goals.length ? goals : ['No goals captured yet']).map((goal) => (
                  <span key={`goal-${goal}`} className={chipClasses}>
                    {goal}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium">Favourite activities</h3>
              <p className="text-sm text-[var(--muted-foreground)]">We use these to tailor prompts</p>
              <div className="mt-4 flex flex-wrap gap-2">
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
              <h3 className="text-lg font-medium">Appearance</h3>
              <p className="text-sm text-[var(--muted-foreground)]">Switch between light and dark mode</p>
            </div>
            <ThemeToggle />
          </div>

          <div className={`${cardClasses} flex justify-between items-center`}>
            <div>
              <h3 className="text-lg font-medium">Sign out</h3>
              <p className="text-sm text-[var(--muted-foreground)]">End the session on this device</p>
            </div>
            <LogoutButton />
          </div>
        </section>
      </div>
    </AppLayout>
  )
}