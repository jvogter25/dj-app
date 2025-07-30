// Production Supabase Hook
// React hook for accessing Supabase client and auth state

import { useEffect, useState } from 'react'
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js'

// Create Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
)

interface UseSupabaseReturn {
  supabase: SupabaseClient
  user: User | null
  session: Session | null
  loading: boolean
  error: Error | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const useSupabase = (): UseSupabaseReturn => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const refreshSession = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.refreshSession()
      if (error) throw error
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  return {
    supabase,
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshSession
  }
}

// Export the supabase client for direct use
export { supabase }