import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { spotifyAuthPKCE } from '../lib/spotifyPKCE'

interface AuthContextType {
  user: User | null
  spotifyToken: string | null
  loading: boolean
  refreshing: boolean
  signInWithSpotify: () => void
  signOut: () => Promise<void>
  refreshSpotifyToken: () => Promise<boolean>
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
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        spotifyAuthPKCE.getStoredToken().then(token => {
          setSpotifyToken(token ?? null)
        })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        spotifyAuthPKCE.getStoredToken().then(token => {
          setSpotifyToken(token ?? null)
        })
      } else {
        setSpotifyToken(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithSpotify = async () => {
    const authUrl = await spotifyAuthPKCE.getAuthUrl()
    window.location.href = authUrl
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSpotifyToken(null)
  }

  const refreshSpotifyToken = async (): Promise<boolean> => {
    if (refreshing) {
      console.log('Already refreshing token...')
      return false
    }
    
    setRefreshing(true)
    try {
      console.log('Refreshing Spotify token...')
      const newToken = await spotifyAuthPKCE.refreshAccessToken()
      
      if (newToken) {
        setSpotifyToken(newToken)
        console.log('Token refreshed successfully')
        // Wait a bit to ensure state propagation
        await new Promise(resolve => setTimeout(resolve, 100))
        return true
      } else {
        console.error('Failed to refresh token - re-authentication required')
        // Don't automatically redirect - let the user decide
        return false
      }
    } catch (error) {
      console.error('Error during token refresh:', error)
      return false
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      spotifyToken,
      loading,
      refreshing,
      signInWithSpotify,
      signOut,
      refreshSpotifyToken
    }}>
      {children}
    </AuthContext.Provider>
  )
}