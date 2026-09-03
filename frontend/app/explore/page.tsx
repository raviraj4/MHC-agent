import { ExploreClient } from "@/components/explore/ExploreClient"
import AppLayout from "@/components/layouts/AppLayout"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function ExplorePage(){
    
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
    .select('onboarding_completed, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'therapist') {
    redirect('/therapist-dashboard')
  }

  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  if (!profile?.onboarding_completed) {
    redirect('/start-conversation')
  }
    return (
        <AppLayout userEmail={user.email!}>
            {/* Organisations available */}
            <ExploreClient/>
        </AppLayout>
            )
}
