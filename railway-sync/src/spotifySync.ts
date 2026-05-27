/**
 * spotifySync.ts
 *
 * Fetches all of a user's Spotify playlists and tracks using the Spotify API.
 * Uses the user's access token (stored in Supabase user metadata) to call the API,
 * refreshing it if needed via Client Credentials for the app-level operations.
 */

import { supabase } from './supabaseClient'
import { SpotifyPlaylist, SpotifyTrack, SpotifyAudioFeatures, LibraryPlaylist, LibraryTrack, SyncResult } from './types'
import { camelotKey } from './musicTheory'

const SPOTIFY_API = 'https://api.spotify.com/v1'
const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com'

// ─── Spotify API helpers ─────────────────────────────────────────────────────

async function spotifyGet<T>(endpoint: string, accessToken: string): Promise<T> {
  const response = await fetch(`${SPOTIFY_API}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (response.status === 401) {
    throw new Error('SPOTIFY_TOKEN_EXPIRED')
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Spotify API error ${response.status}: ${text}`)
  }

  return response.json() as Promise<T>
}

/**
 * Refresh a user's Spotify access token using their stored refresh token.
 * Returns the new access token and updates Supabase user metadata.
 */
async function refreshSpotifyToken(userId: string, refreshToken: string): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret
  })

  const response = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token refresh failed: ${text}`)
  }

  const data = await response.json() as { access_token: string; refresh_token?: string }
  const newAccessToken = data.access_token
  const newRefreshToken = data.refresh_token || refreshToken

  // Update in Supabase
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      spotify_access_token: newAccessToken,
      spotify_refresh_token: newRefreshToken
    }
  })

  return newAccessToken
}

/**
 * Get a valid Spotify access token for a user, refreshing if needed.
 */
async function getValidAccessToken(userId: string): Promise<string> {
  const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)

  if (error || !user) {
    throw new Error(`User not found: ${userId}`)
  }

  const accessToken = user.user_metadata?.spotify_access_token as string | undefined
  const refreshToken = user.user_metadata?.spotify_refresh_token as string | undefined

  if (!accessToken) {
    throw new Error(`No Spotify access token for user ${userId}`)
  }

  // Test if token is still valid
  try {
    await spotifyGet<{ id: string }>('/me', accessToken)
    return accessToken
  } catch (err) {
    if (err instanceof Error && err.message === 'SPOTIFY_TOKEN_EXPIRED') {
      if (!refreshToken) {
        throw new Error(`Spotify token expired and no refresh token available for user ${userId}`)
      }
      console.log(`Refreshing Spotify token for user ${userId}...`)
      return refreshSpotifyToken(userId, refreshToken)
    }
    throw err
  }
}

// ─── Playlist fetching ────────────────────────────────────────────────────────

/**
 * Fetch all of a user's Spotify playlists (handles pagination).
 */
async function fetchAllPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
  const playlists: SpotifyPlaylist[] = []
  let url: string | null = '/me/playlists?limit=50'

  while (url) {
    type PlaylistPage = { items: SpotifyPlaylist[]; next: string | null }
    const page: PlaylistPage = await spotifyGet<PlaylistPage>(url, accessToken)

    playlists.push(...page.items)

    // Spotify returns full URL for next page, strip the base
    url = page.next ? page.next.replace(SPOTIFY_API, '') : null
  }

  return playlists
}

/**
 * Fetch all tracks in a playlist (handles pagination).
 */
async function fetchPlaylistTracks(
  playlistId: string,
  accessToken: string
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = []
  let url: string | null = `/playlists/${playlistId}/tracks?limit=100&fields=items(added_at,track(id,name,artists,album,duration_ms,uri,external_urls)),next`

  while (url) {
    type TrackPage = { items: Array<{ track: SpotifyTrack | null }>; next: string | null }
    const page: TrackPage = await spotifyGet<TrackPage>(url, accessToken)

    // Filter out null tracks (removed/unavailable)
    const validTracks = page.items
      .map((item: { track: SpotifyTrack | null }) => item.track)
      .filter((track: SpotifyTrack | null): track is SpotifyTrack => track !== null && !!track.id)

    tracks.push(...validTracks)
    url = page.next ? page.next.replace(SPOTIFY_API, '') : null
  }

  return tracks
}

/**
 * Fetch audio features for up to 100 tracks at once.
 */
async function fetchAudioFeatures(
  trackIds: string[],
  accessToken: string
): Promise<Map<string, SpotifyAudioFeatures>> {
  const featuresMap = new Map<string, SpotifyAudioFeatures>()

  // Batch in groups of 100 (Spotify limit)
  for (let i = 0; i < trackIds.length; i += 100) {
    const batch = trackIds.slice(i, i + 100)
    const ids = batch.join(',')

    try {
      const data = await spotifyGet<{ audio_features: Array<SpotifyAudioFeatures | null> }>(
        `/audio-features?ids=${ids}`,
        accessToken
      )

      data.audio_features.forEach((features, index) => {
        if (features) {
          featuresMap.set(batch[index], features)
        }
      })
    } catch (err) {
      console.warn('Failed to fetch audio features batch:', err)
    }
  }

  return featuresMap
}

// ─── Database sync helpers ─────────────────────────────────────────────────────

/**
 * Upsert a playlist record in the database.
 */
async function upsertPlaylist(userId: string, playlist: SpotifyPlaylist): Promise<string> {
  const record: Omit<LibraryPlaylist, 'id'> = {
    user_id: userId,
    spotify_id: playlist.id,
    name: playlist.name,
    description: playlist.description || null,
    cover_url: playlist.images?.[0]?.url || null,
    track_count: playlist.tracks.total,
    last_synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('library_playlists')
    .upsert(record, { onConflict: 'user_id,spotify_id' })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to upsert playlist ${playlist.id}: ${error.message}`)
  }

  return data.id
}

/**
 * Check which tracks already exist for this user (returns Set of spotify_ids).
 */
async function getExistingTrackIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('library_tracks')
    .select('spotify_id')
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to fetch existing tracks: ${error.message}`)
  }

  return new Set((data || []).map(row => row.spotify_id))
}

/**
 * Insert a new track record with 'pending' status.
 * Returns the inserted track's UUID.
 */
async function insertPendingTrack(
  userId: string,
  track: SpotifyTrack,
  features: SpotifyAudioFeatures | undefined
): Promise<string> {
  const camelot = features ? camelotKey(features.key, features.mode) : null

  const record: Omit<LibraryTrack, 'id'> = {
    user_id: userId,
    spotify_id: track.id,
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    album_art_url: track.album.images?.[0]?.url || null,
    duration_ms: track.duration_ms,
    bpm: features?.tempo ? Math.round(features.tempo) : null,
    key_number: features?.key ?? null,
    key_camelot: camelot,
    energy: features?.energy ?? null,
    danceability: features?.danceability ?? null,
    storage_path: null,
    storage_url: null,
    source: 'spotify',
    sync_status: 'pending',
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('library_tracks')
    .insert(record)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to insert track ${track.id}: ${error.message}`)
  }

  return data.id
}

/**
 * Link a track to a playlist in the junction table.
 */
async function linkTrackToPlaylist(
  playlistId: string,
  trackId: string,
  position: number
): Promise<void> {
  const { error } = await supabase
    .from('playlist_tracks')
    .upsert(
      { playlist_id: playlistId, track_id: trackId, position, added_at: new Date().toISOString() },
      { onConflict: 'playlist_id,track_id' }
    )

  if (error) {
    // Non-fatal — log but continue
    console.warn(`Failed to link track ${trackId} to playlist ${playlistId}:`, error.message)
  }
}

/**
 * Mark a playlist as synced.
 */
async function markPlaylistSynced(playlistDbId: string, trackCount: number): Promise<void> {
  await supabase
    .from('library_playlists')
    .update({ last_synced_at: new Date().toISOString(), track_count: trackCount })
    .eq('id', playlistDbId)
}

// ─── Main sync function ────────────────────────────────────────────────────────

/**
 * Sync all Spotify playlists for a user.
 * Inserts new tracks as 'pending' — the download queue picks them up separately.
 */
export async function syncSpotifyLibrary(userId: string): Promise<SyncResult> {
  console.log(`[SpotifySync] Starting sync for user ${userId}`)

  const result: SyncResult = {
    userId,
    playlistsScanned: 0,
    tracksFound: 0,
    tracksAlreadySynced: 0,
    tracksQueued: 0,
    errors: []
  }

  // Get valid access token
  let accessToken: string
  try {
    accessToken = await getValidAccessToken(userId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    result.errors.push(`Auth failed: ${msg}`)
    return result
  }

  // Fetch all playlists
  let playlists: SpotifyPlaylist[]
  try {
    playlists = await fetchAllPlaylists(accessToken)
    result.playlistsScanned = playlists.length
    console.log(`[SpotifySync] Found ${playlists.length} playlists`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    result.errors.push(`Failed to fetch playlists: ${msg}`)
    return result
  }

  // Get existing tracks to avoid re-queueing
  const existingIds = await getExistingTrackIds(userId)

  // Collect all unique tracks across all playlists
  const allTracks = new Map<string, SpotifyTrack>()
  const playlistTrackMap = new Map<string, { dbId: string; tracks: SpotifyTrack[] }>()

  for (const playlist of playlists) {
    try {
      const playlistDbId = await upsertPlaylist(userId, playlist)
      const tracks = await fetchPlaylistTracks(playlist.id, accessToken)
      playlistTrackMap.set(playlist.id, { dbId: playlistDbId, tracks })

      for (const track of tracks) {
        if (!allTracks.has(track.id)) {
          allTracks.set(track.id, track)
        }
      }

      result.tracksFound += tracks.length
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`Playlist ${playlist.name}: ${msg}`)
    }
  }

  // Fetch audio features for all unique new tracks
  const newTrackIds = Array.from(allTracks.keys()).filter(id => !existingIds.has(id))
  console.log(`[SpotifySync] ${newTrackIds.length} new tracks to process (${existingIds.size} already synced)`)

  let featuresMap = new Map<string, SpotifyAudioFeatures>()
  if (newTrackIds.length > 0) {
    featuresMap = await fetchAudioFeatures(newTrackIds, accessToken)
  }

  // Insert new tracks into the DB
  const trackDbIdMap = new Map<string, string>() // spotify_id → db UUID

  for (const spotifyId of newTrackIds) {
    const track = allTracks.get(spotifyId)!
    const features = featuresMap.get(spotifyId)

    try {
      const dbId = await insertPendingTrack(userId, track, features)
      trackDbIdMap.set(spotifyId, dbId)
      result.tracksQueued++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`Insert track ${track.name}: ${msg}`)
    }
  }

  result.tracksAlreadySynced = existingIds.size

  // Also build dbId map for existing tracks
  if (Array.from(allTracks.keys()).some(id => existingIds.has(id))) {
    const existingSpotifyIds = Array.from(allTracks.keys()).filter(id => existingIds.has(id))
    const { data } = await supabase
      .from('library_tracks')
      .select('id, spotify_id')
      .eq('user_id', userId)
      .in('spotify_id', existingSpotifyIds)

    for (const row of data || []) {
      trackDbIdMap.set(row.spotify_id, row.id)
    }
  }

  // Link tracks to playlists
  for (const [playlistId, { dbId: playlistDbId, tracks }] of playlistTrackMap) {
    for (let i = 0; i < tracks.length; i++) {
      const trackDbId = trackDbIdMap.get(tracks[i].id)
      if (trackDbId) {
        await linkTrackToPlaylist(playlistDbId, trackDbId, i)
      }
    }
    await markPlaylistSynced(playlistDbId, tracks.length)
  }

  console.log(`[SpotifySync] Done. Queued ${result.tracksQueued} new tracks, ${result.tracksAlreadySynced} already synced, ${result.errors.length} errors`)
  return result
}
