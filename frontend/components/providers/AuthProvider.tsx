'use client'

import { createClient } from '@/utils/supabase/client' // ← Make sure this is the BROWSER client
import { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useMemo } from 'react'

type AuthContextType = {
  session: Session | null
  user: User | null
  signOut: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({
  children,
  session: initialSession,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  const [session, setSession] = useState<Session | null>(initialSession)
  const [user, setUser] = useState<User|null>(initialSession?.user ?? null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  
  // Memoize supabase client to prevent infinite re-renders
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // Always hydrate from browser session to get a trusted, full client session/token.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        setSession(null)
        setUser(null)
      } else {
        setSession(session)
        setUser(session.user)
      }
      setIsLoading(false)
    })

    // Listen for auth changes — only refresh on meaningful events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)

      // Only trigger a server refresh on actual sign-in/sign-out,
      // NOT on INITIAL_SESSION or TOKEN_REFRESHED (which would loop)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <AuthContext.Provider value={{ session, user, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}