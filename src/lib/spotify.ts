import { supabase } from './supabase'

const SPOTIFY_CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID!
// Use a fixed redirect URI to ensure consistency
const REDIRECT_URI = 'https://dj-app-kappa.vercel.app/auth/callback'
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-library-read',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-currently-playing',
  'app-remote-control'
].join(' ')

export const spotifyAuth = {
  getAuthUrl: () => {
    // Clear any existing state first
    sessionStorage.removeItem('spotify_auth_state')
    
    const state = crypto.randomUUID()
    sessionStorage.setItem('spotify_auth_state', state)
    
    // Debug logging
    console.log('Spotify auth URL generation:', {
      clientId: SPOTIFY_CLIENT_ID,
      redirectUri: REDIRECT_URI,
      state: state
    })
    
    // For Web Playback SDK, we need to use implicit grant with token response type
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'token',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      state: state,
      show_dialog: 'false'
    })
    
    return `https://accounts.spotify.com/authorize?${params.toString()}`
  },
  
  handleCallback: async (hash: string) => {
    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const error = params.get('error')
    const state = params.get('state')
    const storedState = sessionStorage.getItem('spotify_auth_state')
    
    // Check for Spotify error first
    if (error) {
      throw new Error(`Spotify auth error: ${error}`)
    }
    
    if (!accessToken || state !== storedState) {
      console.error('Auth debug:', { 
        hasToken: !!accessToken, 
        state, 
        storedState,
        allParams: Object.fromEntries(params.entries())
      })
      throw new Error('Invalid authentication response')
    }
    
    sessionStorage.removeItem('spotify_auth_state')
    
    // Get Spotify user profile
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to get Spotify profile')
    }
    
    const profile = await response.json()
    
    // Sign in or create Supabase user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: profile.id // Using Spotify ID as password
    })
    
    if (authError && authError.message.includes('Invalid login credentials')) {
      // User doesn't exist, create new account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: profile.email,
        password: profile.id,
        options: {
          data: {
            spotify_id: profile.id,
            display_name: profile.display_name,
            spotify_access_token: accessToken
          }
        }
      })
      
      if (signUpError) throw signUpError
      return { user: signUpData.user, accessToken }
    }
    
    if (authError) throw authError
    
    // Update user metadata with latest access token
    if (authData.user) {
      await supabase.auth.updateUser({
        data: {
          spotify_access_token: accessToken
        }
      })
    }
    
    return { user: authData.user, accessToken }
  },
  
  getStoredToken: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.user_metadata?.spotify_access_token
  }
}