import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { spotifyAuth } from '../lib/spotify'

interface AuthContextType {
  user: User | null
  spotifyToken: string | null
  loading: boolean
  signInWithSpotify: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        spotifyAuth.getStoredToken().then(token => {
          setSpotifyToken(token ?? null)
        })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        spotifyAuth.getStoredToken().then(token => {
          setSpotifyToken(token ?? null)
        })
      } else {
        setSpotifyToken(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithSpotify = () => {
    window.location.href = spotifyAuth.getAuthUrl()
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSpotifyToken(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      spotifyToken,
      loading,
      signInWithSpotify,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}