import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/start-conversation'
  const type = searchParams.get('type') // userType: user | professional | organisation

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // If the caller explicitly asked for a redirect (e.g. password reset),
      // honour that path and forward the userType as a query param.
      if (next && next !== '/start-conversation') {
        const redirectUrl = new URL(next, origin)
        if (type) redirectUrl.searchParams.set('type', type)
        return NextResponse.redirect(redirectUrl)
      }

      // Default post-auth redirect logic
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.onboarding_completed === true) {
          return NextResponse.redirect(`${origin}/dashboard`)
        }
        return NextResponse.redirect(`${origin}/start-conversation`)
      }
    }
  }

  // Fallback redirect to login if something went wrong
  return NextResponse.redirect(`${origin}/auth/login`)
}
