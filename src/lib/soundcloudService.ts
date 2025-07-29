// SoundCloud API service for DJ Studio
export interface SoundCloudTrack {
  id: number
  title: string
  duration: number // in milliseconds
  stream_url?: string
  waveform_url?: string
  artwork_url?: string
  user: {
    id: number
    username: string
    avatar_url?: string
  }
  genre?: string
  bpm?: number
  playback_count?: number
  likes_count?: number
  streamable?: boolean
  downloadable?: boolean
  download_url?: string
  permalink_url?: string
  created_at?: string
}

export interface SoundCloudPlaylist {
  id: number
  title: string
  duration: number
  track_count: number
  tracks: SoundCloudTrack[]
  user: {
    id: number
    username: string
  }
  artwork_url?: string
}

export interface SoundCloudUser {
  id: number
  username: string
  avatar_url?: string
  followers_count?: number
  followings_count?: number
  track_count?: number
}

class SoundCloudService {
  private clientId: string
  private clientSecret: string
  private redirectUri: string
  private accessToken: string | null = null
  private baseUrl = 'https://api-v2.soundcloud.com'
  
  constructor() {
    // Use environment variables (will be undefined until app is approved)
    this.clientId = process.env.NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID || 'PENDING_APPROVAL'
    this.clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET || 'PENDING_APPROVAL'
    this.redirectUri = process.env.NEXT_PUBLIC_SOUNDCLOUD_REDIRECT_URI || window.location.origin + '/auth/soundcloud/callback'
    
    // Check for stored access token
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('soundcloud_access_token')
    }
  }
  
  // Get OAuth authorization URL
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'non-expiring'
    })
    
    return `https://soundcloud.com/connect?${params.toString()}`
  }
  
  // Exchange authorization code for access token
  async exchangeToken(code: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code: code
    })
    
    const response = await fetch('https://api.soundcloud.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    })
    
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`)
    }
    
    const data = await response.json()
    this.accessToken = data.access_token
    
    // Store token
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundcloud_access_token', data.access_token)
    }
    
    return data.access_token
  }
  
  // Make authenticated API request
  private async apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with SoundCloud')
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `OAuth ${this.accessToken}`,
        'Accept': 'application/json',
        ...options?.headers
      }
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        this.logout()
        throw new Error('SoundCloud authentication expired. Please login again.')
      }
      throw new Error(`SoundCloud API error: ${response.status}`)
    }
    
    return response.json()
  }
  
  // Get current user
  async getMe(): Promise<SoundCloudUser> {
    return this.apiRequest<SoundCloudUser>('/me')
  }
  
  // Search for tracks
  async searchTracks(query: string, limit: number = 50): Promise<SoundCloudTrack[]> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString()
    })
    
    const response = await this.apiRequest<{ collection: SoundCloudTrack[] }>(
      `/search/tracks?${params.toString()}`
    )
    
    return response.collection || []
  }
  
  // Get user's tracks
  async getUserTracks(userId?: number): Promise<SoundCloudTrack[]> {
    const endpoint = userId ? `/users/${userId}/tracks` : '/me/tracks'
    const response = await this.apiRequest<{ collection: SoundCloudTrack[] }>(endpoint)
    return response.collection || []
  }
  
  // Get user's liked tracks
  async getUserLikes(limit: number = 50): Promise<SoundCloudTrack[]> {
    const params = new URLSearchParams({ limit: limit.toString() })
    const response = await this.apiRequest<{ collection: Array<{ track: SoundCloudTrack }> }>(
      `/me/likes?${params.toString()}`
    )
    
    return response.collection?.map(item => item.track) || []
  }
  
  // Get user's playlists
  async getUserPlaylists(): Promise<SoundCloudPlaylist[]> {
    const response = await this.apiRequest<{ collection: SoundCloudPlaylist[] }>('/me/playlists')
    return response.collection || []
  }
  
  // Get playlist details with tracks
  async getPlaylist(playlistId: number): Promise<SoundCloudPlaylist> {
    return this.apiRequest<SoundCloudPlaylist>(`/playlists/${playlistId}`)
  }
  
  // Get track details
  async getTrack(trackId: number): Promise<SoundCloudTrack> {
    return this.apiRequest<SoundCloudTrack>(`/tracks/${trackId}`)
  }
  
  // Get stream URL for a track
  async getStreamUrl(trackId: number): Promise<string | null> {
    try {
      const response = await this.apiRequest<{ http_mp3_128_url?: string; url?: string }>(
        `/tracks/${trackId}/streams`
      )
      
      // Return MP3 stream URL
      return response.http_mp3_128_url || response.url || null
    } catch (error) {
      console.error('Error getting stream URL:', error)
      return null
    }
  }
  
  // Resolve a SoundCloud URL to get track/playlist info
  async resolve(url: string): Promise<SoundCloudTrack | SoundCloudPlaylist | null> {
    const params = new URLSearchParams({ url })
    
    try {
      return await this.apiRequest(`/resolve?${params.toString()}`)
    } catch (error) {
      console.error('Error resolving URL:', error)
      return null
    }
  }
  
  // Get user's followings (artists they follow)
  async getFollowings(limit: number = 50): Promise<SoundCloudUser[]> {
    const params = new URLSearchParams({ limit: limit.toString() })
    const response = await this.apiRequest<{ collection: SoundCloudUser[] }>(
      `/me/followings?${params.toString()}`
    )
    
    return response.collection || []
  }
  
  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken && this.clientId !== 'PENDING_APPROVAL'
  }
  
  // Check if API keys are configured
  isConfigured(): boolean {
    return this.clientId !== 'PENDING_APPROVAL'
  }
  
  // Logout
  logout() {
    this.accessToken = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('soundcloud_access_token')
    }
  }
  
  // Format track for our app
  formatTrack(track: SoundCloudTrack): any {
    return {
      id: `soundcloud_${track.id}`,
      source: 'soundcloud',
      name: track.title,
      artist: track.user.username,
      duration: track.duration,
      bpm: track.bpm,
      streamable: track.streamable,
      artwork_url: track.artwork_url?.replace('-large', '-t500x500'), // Get higher res
      waveform_url: track.waveform_url,
      soundcloudId: track.id,
      canManipulate: true,
      canExport: track.downloadable || false
    }
  }
}

// Singleton instance
export const soundCloudService = new SoundCloudService()

// Widget API alternative for playing tracks without full API access
export class SoundCloudWidget {
  private widget: any
  private iframe: HTMLIFrameElement | null = null
  
  constructor(containerId: string) {
    // Would initialize SoundCloud widget
  }
  
  async loadTrack(trackUrl: string) {
    // Load track into widget
  }
  
  play() {
    this.widget?.play()
  }
  
  pause() {
    this.widget?.pause()
  }
  
  seek(position: number) {
    this.widget?.seekTo(position)
  }
  
  setVolume(volume: number) {
    this.widget?.setVolume(volume * 100)
  }
  
  // Get current position
  async getPosition(): Promise<number> {
    return new Promise((resolve) => {
      this.widget?.getPosition((position: number) => resolve(position))
    })
  }
  
  // Get duration
  async getDuration(): Promise<number> {
    return new Promise((resolve) => {
      this.widget?.getDuration((duration: number) => resolve(duration))
    })
  }
}