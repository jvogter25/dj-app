// Shared types for the Railway sync service

export interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ id: string; name: string }>
  album: {
    id: string
    name: string
    images: Array<{ url: string; width: number; height: number }>
  }
  duration_ms: number
  uri: string
  external_urls: { spotify: string }
  audio_features?: SpotifyAudioFeatures
}

export interface SpotifyAudioFeatures {
  tempo: number
  key: number
  mode: number
  energy: number
  danceability: number
  valence: number
  acousticness: number
  instrumentalness: number
  loudness: number
  time_signature: number
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string
  images: Array<{ url: string }>
  tracks: {
    total: number
    items: Array<{
      added_at: string
      track: SpotifyTrack
    }>
  }
}

export interface LibraryTrack {
  id: string                // UUID primary key in Supabase
  user_id: string
  spotify_id: string
  title: string
  artist: string
  album: string
  album_art_url: string | null
  duration_ms: number
  bpm: number | null
  key_number: number | null   // 0-11 Spotify key
  key_camelot: string | null  // e.g. "8A", "5B"
  energy: number | null
  danceability: number | null
  storage_path: string | null // path in Supabase storage bucket
  storage_url: string | null  // signed URL (regenerated on access)
  source: 'spotify' | 'soundcloud' | 'manual'
  sync_status: 'pending' | 'downloading' | 'ready' | 'error'
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface LibraryPlaylist {
  id: string
  user_id: string
  spotify_id: string
  name: string
  description: string | null
  cover_url: string | null
  track_count: number
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface PlaylistTrack {
  playlist_id: string
  track_id: string
  position: number
  added_at: string
}

export interface DownloadJob {
  trackId: string
  spotifyId: string
  searchQuery: string   // "Artist - Title" used for YouTube Music search
  userId: string
}

export interface DownloadResult {
  success: boolean
  storagePath?: string
  bpm?: number
  error?: string
}

export interface SyncResult {
  userId: string
  playlistsScanned: number
  tracksFound: number
  tracksAlreadySynced: number
  tracksQueued: number
  errors: string[]
}
