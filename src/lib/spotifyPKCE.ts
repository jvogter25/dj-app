import { supabase } from './supabase'

const SPOTIFY_CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID!
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

// PKCE helper functions
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return values.reduce((acc, x) => acc + possible[x % possible.length], '')
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return window.crypto.subtle.digest('SHA-256', data)
}

function base64encode(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input)
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binString)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export const spotifyAuthPKCE = {
  async getAuthUrl(): Promise<string> {
    const state = generateRandomString(16)
    const codeVerifier = generateRandomString(64)
    const hashed = await sha256(codeVerifier)
    const codeChallenge = base64encode(hashed)

    // Store state and verifier
    sessionStorage.setItem('spotify_auth_state', state)
    sessionStorage.setItem('spotify_code_verifier', codeVerifier)

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      state: state,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    })

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`
    console.log('PKCE Auth URL:', authUrl)
    return authUrl
  },

  async handleCallback(queryString: string): Promise<{ user: any, accessToken: string }> {
    const params = new URLSearchParams(queryString)
    const code = params.get('code')
    const state = params.get('state')
    const error = params.get('error')
    
    if (error) {
      throw new Error(`Spotify auth error: ${error}`)
    }

    const storedState = sessionStorage.getItem('spotify_auth_state')
    const codeVerifier = sessionStorage.getItem('spotify_code_verifier')

    if (!code || state !== storedState || !codeVerifier) {
      throw new Error('Invalid authorization response')
    }

    // Clear stored values
    sessionStorage.removeItem('spotify_auth_state')
    sessionStorage.removeItem('spotify_code_verifier')

    // Exchange code for token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Get user profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!profileResponse.ok) {
      throw new Error('Failed to get Spotify profile')
    }

    const profile = await profileResponse.json()

    // Sign in or create Supabase user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: profile.id
    })

    if (authError && authError.message.includes('Invalid login credentials')) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: profile.email,
        password: profile.id,
        options: {
          emailRedirectTo: 'https://dj-app-kappa.vercel.app',
          data: {
            spotify_id: profile.id,
            display_name: profile.display_name,
            spotify_access_token: accessToken,
            spotify_refresh_token: tokenData.refresh_token
          }
        }
      })
      
      if (signUpError) throw signUpError
      return { user: signUpData.user, accessToken }
    }

    if (authError) throw authError

    // Update tokens
    if (authData.user) {
      await supabase.auth.updateUser({
        data: {
          spotify_access_token: accessToken,
          spotify_refresh_token: tokenData.refresh_token
        }
      })
    }

    return { user: authData.user, accessToken }
  },

  async getStoredToken() {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.user_metadata?.spotify_access_token
  }
}