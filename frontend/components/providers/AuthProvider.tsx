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
  const [isLoading, setIsLoading] = useState(!initialSession)
  const router = useRouter()
  
  // Memoize supabase client to prevent infinite re-renders
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // Get initial session
    const getVerifiedUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        setSession(null)
        setUser(null)
      } else {
        setUser(user)
        // Optionally reconstruct a minimal session object
        setSession({ user } as Session)
      }

      setIsLoading(false)
    }

    if (!initialSession) {
      getVerifiedUser()
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      setIsLoading(false)
      router.refresh()
    })

    return () => subscription.unsubscribe()
  }, [supabase, router, initialSession])

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