/**
 * downloadQueue.ts
 *
 * Processes the queue of 'pending' tracks in the database.
 * Runs downloads sequentially (to avoid hammering YouTube) with a small
 * delay between each download. Designed to run as a background job.
 */

import { supabase, uploadTrackFile } from './supabaseClient'
import { downloadAudioBuffer, buildSearchQuery } from './downloader'
import { LibraryTrack } from './types'

const DOWNLOAD_DELAY_MS = 2000    // 2s between downloads to be polite
const BATCH_SIZE = 10             // Process this many per queue run

/**
 * Update a track's sync status in the database.
 */
async function updateTrackStatus(
  trackId: string,
  status: LibraryTrack['sync_status'],
  updates: Partial<Pick<LibraryTrack, 'storage_path' | 'error_message'>> = {}
): Promise<void> {
  const { error } = await supabase
    .from('library_tracks')
    .update({
      sync_status: status,
      updated_at: new Date().toISOString(),
      ...updates
    })
    .eq('id', trackId)

  if (error) {
    console.error(`[Queue] Failed to update track ${trackId} status:`, error.message)
  }
}

/**
 * Process a single pending track: download + upload to storage.
 */
async function processTrack(track: LibraryTrack): Promise<void> {
  console.log(`[Queue] Processing: "${track.artist} - ${track.title}" (${track.id})`)

  // Mark as downloading
  await updateTrackStatus(track.id, 'downloading')

  try {
    const searchQuery = buildSearchQuery(track.artist, track.title)
    const audio = await downloadAudioBuffer({ searchQuery })

    // Upload to Supabase Storage
    const storagePath = await uploadTrackFile(
      track.user_id,
      track.id,
      audio.buffer
    )

    // Mark as ready
    await updateTrackStatus(track.id, 'ready', { storage_path: storagePath })
    console.log(`[Queue] ✅ Done: "${track.title}" → ${storagePath}`)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`[Queue] ❌ Failed: "${track.title}":`, errorMessage)

    await updateTrackStatus(track.id, 'error', {
      error_message: errorMessage.slice(0, 500)
    })
  }
}

/**
 * Fetch a batch of pending tracks from the database.
 * Optionally filtered by userId for targeted syncs.
 */
async function fetchPendingTracks(userId?: string): Promise<LibraryTrack[]> {
  let query = supabase
    .from('library_tracks')
    .select('*')
    .eq('sync_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch pending tracks: ${error.message}`)
  }

  return (data || []) as LibraryTrack[]
}

/**
 * Also retry any tracks that got stuck in 'downloading' state
 * (e.g., from a previous crashed run).
 */
async function fetchStuckTracks(userId?: string): Promise<LibraryTrack[]> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  let query = supabase
    .from('library_tracks')
    .select('*')
    .eq('sync_status', 'downloading')
    .lt('updated_at', fiveMinutesAgo)
    .limit(5)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data } = await query
  return (data || []) as LibraryTrack[]
}

/**
 * Run a full pass of the download queue.
 * Returns number of tracks processed.
 */
export async function processDownloadQueue(userId?: string): Promise<number> {
  const [pending, stuck] = await Promise.all([
    fetchPendingTracks(userId),
    fetchStuckTracks(userId)
  ])

  // Reset stuck tracks back to pending
  for (const track of stuck) {
    await updateTrackStatus(track.id, 'pending')
  }

  const toProcess = [...stuck, ...pending].slice(0, BATCH_SIZE)

  if (toProcess.length === 0) {
    console.log('[Queue] No pending tracks to process')
    return 0
  }

  console.log(`[Queue] Processing ${toProcess.length} tracks...`)

  for (let i = 0; i < toProcess.length; i++) {
    await processTrack(toProcess[i])

    // Delay between downloads (skip delay after last track)
    if (i < toProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DOWNLOAD_DELAY_MS))
    }
  }

  return toProcess.length
}

/**
 * Download a single track by URL (for SoundCloud / manual URL imports).
 * The track record should already exist in the DB with status 'pending'.
 */
export async function downloadByUrl(trackId: string, url: string): Promise<void> {
  const { data: track, error } = await supabase
    .from('library_tracks')
    .select('*')
    .eq('id', trackId)
    .single()

  if (error || !track) {
    throw new Error(`Track ${trackId} not found`)
  }

  await updateTrackStatus(trackId, 'downloading')

  try {
    const audio = await downloadAudioBuffer({ directUrl: url })

    const storagePath = await uploadTrackFile(
      track.user_id,
      trackId,
      audio.buffer
    )

    await updateTrackStatus(trackId, 'ready', { storage_path: storagePath })
    console.log(`[Queue] ✅ URL download done: "${track.title}" → ${storagePath}`)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    await updateTrackStatus(trackId, 'error', {
      error_message: errorMessage.slice(0, 500)
    })
    throw err
  }
}

/**
 * Get queue stats for the API.
 */
export async function getQueueStats(userId?: string): Promise<{
  pending: number
  downloading: number
  ready: number
  error: number
}> {
  let query = supabase
    .from('library_tracks')
    .select('sync_status')

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data } = await query

  const stats = { pending: 0, downloading: 0, ready: 0, error: 0 }
  for (const row of data || []) {
    const status = row.sync_status as keyof typeof stats
    if (status in stats) stats[status]++
  }

  return stats
}
