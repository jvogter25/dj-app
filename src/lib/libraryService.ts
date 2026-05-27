/**
 * libraryService.ts
 *
 * Frontend service for accessing the user's downloaded track library.
 * Reads from Supabase (library_tracks, library_playlists)
 * and triggers syncs via the Railway backend.
 */

import { supabase } from './supabase'

const RAILWAY_URL = process.env.REACT_APP_RAILWAY_SYNC_URL || ''
const SYNC_API_KEY = process.env.REACT_APP_SYNC_API_KEY || ''

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LibraryTrack {
  id: string
  spotify_id: string | null
  title: string
  artist: string
  album: string
  album_art_url: string | null
  duration_ms: number
  bpm: number | null
  key_camelot: string | null
  key_number: number | null
  energy: number | null
  danceability: number | null
  storage_path: string | null
  source: 'spotify' | 'soundcloud' | 'manual'
  sync_status: 'pending' | 'downloading' | 'ready' | 'error'
  error_message: string | null
  created_at: string
}

export interface LibraryPlaylist {
  id: string
  spotify_id: string
  name: string
  description: string | null
  cover_url: string | null
  track_count: number
  last_synced_at: string | null
}

export interface PlaylistWithTracks extends LibraryPlaylist {
  tracks: LibraryTrack[]
}

export interface QueueStats {
  pending: number
  downloading: number
  ready: number
  error: number
}

// ─── Library reads ─────────────────────────────────────────────────────────────

/**
 * Get all playlists for the current user.
 */
export async function getUserPlaylists(): Promise<LibraryPlaylist[]> {
  const { data, error } = await supabase
    .from('library_playlists')
    .select('*')
    .order('name')

  if (error) throw new Error(`Failed to fetch playlists: ${error.message}`)
  return (data || []) as LibraryPlaylist[]
}

/**
 * Get all tracks in a playlist, ordered by position.
 */
export async function getPlaylistTracks(playlistId: string): Promise<LibraryTrack[]> {
  const { data, error } = await supabase
    .from('playlist_tracks')
    .select(`
      position,
      track:library_tracks (*)
    `)
    .eq('playlist_id', playlistId)
    .order('position')

  if (error) throw new Error(`Failed to fetch playlist tracks: ${error.message}`)

  return (data || [])
    .map((row: { track: unknown }) => row.track as LibraryTrack | null)
    .filter((t): t is LibraryTrack => t !== null)
}

/**
 * Get all ready tracks for a user (across all playlists).
 * Used for search and browsing all downloaded tracks.
 */
export async function getAllReadyTracks(searchQuery?: string): Promise<LibraryTrack[]> {
  let query = supabase
    .from('library_tracks')
    .select('*')
    .eq('sync_status', 'ready')
    .order('artist')
    .order('title')
    .limit(500)

  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,artist.ilike.%${searchQuery}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch tracks: ${error.message}`)
  return (data || []) as LibraryTrack[]
}

/**
 * Get a signed URL for a track's audio file (valid for 1 hour).
 * Call this right before loading into the deck — don't cache long-term.
 */
export async function getTrackAudioUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('track-audio')
    .createSignedUrl(storagePath, 3600)

  if (error || !data) {
    throw new Error(`Failed to get audio URL: ${error?.message}`)
  }

  return data.signedUrl
}

/**
 * Get queue stats (pending/downloading/ready/error counts).
 */
export async function getQueueStats(): Promise<QueueStats> {
  const { data, error } = await supabase
    .from('library_tracks')
    .select('sync_status')

  if (error) throw new Error(`Failed to get queue stats: ${error.message}`)

  const stats: QueueStats = { pending: 0, downloading: 0, ready: 0, error: 0 }
  for (const row of data || []) {
    const status = row.sync_status as keyof QueueStats
    if (status in stats) stats[status]++
  }

  return stats
}

// ─── Sync triggers ─────────────────────────────────────────────────────────────

function railwayHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-api-key': SYNC_API_KEY
  }
}

/**
 * Trigger a full Spotify library sync for the current user.
 * Calls the Railway backend which fetches playlists and queues downloads.
 */
export async function triggerSpotifySync(userId: string): Promise<void> {
  if (!RAILWAY_URL) {
    throw new Error('Railway sync URL not configured (REACT_APP_RAILWAY_SYNC_URL)')
  }

  const response = await fetch(`${RAILWAY_URL}/sync/spotify`, {
    method: 'POST',
    headers: railwayHeaders(),
    body: JSON.stringify({ userId })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Sync failed: ${response.status} ${text}`)
  }
}

/**
 * Submit a URL (SoundCloud or any yt-dlp compatible URL) for download.
 * Creates a library_tracks record and kicks off the download.
 */
export async function submitUrlForDownload(params: {
  userId: string
  url: string
  title?: string
  artist?: string
}): Promise<{ trackId: string }> {
  if (!RAILWAY_URL) {
    throw new Error('Railway sync URL not configured (REACT_APP_RAILWAY_SYNC_URL)')
  }

  const response = await fetch(`${RAILWAY_URL}/sync/download-url`, {
    method: 'POST',
    headers: railwayHeaders(),
    body: JSON.stringify(params)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Download failed: ${response.status} ${text}`)
  }

  return response.json()
}

/**
 * Poll Railway for queue stats (separate from Supabase stats — Railway has yt-dlp status).
 */
export async function getRailwayQueueStats(userId: string): Promise<QueueStats | null> {
  if (!RAILWAY_URL) return null

  try {
    const response = await fetch(
      `${RAILWAY_URL}/sync/stats?userId=${encodeURIComponent(userId)}`,
      { headers: railwayHeaders() }
    )

    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}
