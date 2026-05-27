/**
 * index.ts — Railway Sync Service entry point
 *
 * Exposes a small Express API and runs a cron job that:
 * 1. Syncs all users' Spotify playlists (fetches metadata, queues new tracks)
 * 2. Processes the download queue (yt-dlp → Supabase Storage)
 *
 * Frontend can call these endpoints to trigger manual syncs.
 */

import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { syncSpotifyLibrary } from './spotifySync'
import { processDownloadQueue, downloadByUrl, getQueueStats } from './downloadQueue'
import { supabase } from './supabaseClient'
import { checkYtDlp } from './downloader'

const app = express()
const PORT = process.env.PORT || 3001

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: [
    'https://dj-app-kappa.vercel.app',
    'http://localhost:3000',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean)
}))
app.use(express.json())

// Simple API key auth for Railway endpoints
function requireApiKey(req: Request, res: Response, next: () => void): void {
  const key = req.headers['x-api-key'] || req.query.apiKey
  if (key !== process.env.SYNC_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * Health check
 */
app.get('/health', async (_req: Request, res: Response): Promise<void> => {
  const ytDlpOk = await checkYtDlp()
  res.json({
    status: 'ok',
    ytDlp: ytDlpOk ? 'available' : 'missing',
    timestamp: new Date().toISOString()
  })
})

/**
 * Trigger a full Spotify library sync for a specific user.
 * Called by the frontend "Sync Library" button.
 *
 * POST /sync/spotify
 * Headers: x-api-key: <SYNC_API_KEY>
 * Body: { userId: string }
 */
app.post('/sync/spotify', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.body

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' })
    return
  }

  console.log(`[API] Spotify sync requested for user ${userId}`)

  // Run sync in the background (don't block the HTTP response)
  res.json({ message: 'Sync started', userId })

  try {
    const syncResult = await syncSpotifyLibrary(userId)
    console.log(`[API] Sync complete:`, syncResult)

    // Then kick off downloads for the newly queued tracks
    if (syncResult.tracksQueued > 0) {
      await processDownloadQueue(userId)
    }
  } catch (err) {
    console.error('[API] Sync failed:', err)
  }
})

/**
 * Trigger download queue processing for a user.
 * Can be called repeatedly to drain the queue.
 *
 * POST /sync/process-queue
 * Headers: x-api-key: <SYNC_API_KEY>
 * Body: { userId?: string }
 */
app.post('/sync/process-queue', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.body

  try {
    const processed = await processDownloadQueue(userId)
    res.json({ processed })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: message })
  }
})

/**
 * Download a track from a direct URL (SoundCloud, or any yt-dlp compatible URL).
 * The track record should already exist in library_tracks with status 'pending'.
 *
 * POST /sync/download-url
 * Headers: x-api-key: <SYNC_API_KEY>
 * Body: { trackId: string, url: string, userId: string, title: string, artist: string }
 */
app.post('/sync/download-url', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const { trackId, url, userId, title, artist } = req.body

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required' })
    return
  }

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' })
    return
  }

  console.log(`[API] URL download requested: ${url}`)

  // If trackId provided, use existing record; otherwise create one
  let resolvedTrackId = trackId

  if (!resolvedTrackId) {
    // Create a new manual track record
    const { data, error } = await supabase
      .from('library_tracks')
      .insert({
        user_id: userId,
        spotify_id: null,
        title: title || 'Unknown Title',
        artist: artist || 'Unknown Artist',
        album: '',
        album_art_url: null,
        duration_ms: 0,
        bpm: null,
        key_number: null,
        key_camelot: null,
        energy: null,
        danceability: null,
        storage_path: null,
        storage_url: null,
        source: url.includes('soundcloud.com') ? 'soundcloud' : 'manual',
        sync_status: 'pending',
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error || !data) {
      res.status(500).json({ error: `Failed to create track record: ${error?.message}` })
      return
    }

    resolvedTrackId = data.id
  }

  // Start download in background
  res.json({ message: 'Download started', trackId: resolvedTrackId })

  try {
    await downloadByUrl(resolvedTrackId, url)
  } catch (err) {
    console.error('[API] URL download failed:', err)
  }
})

/**
 * Get queue stats for a user.
 *
 * GET /sync/stats?userId=<userId>
 * Headers: x-api-key: <SYNC_API_KEY>
 */
app.get('/sync/stats', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const userId = req.query.userId as string | undefined

  try {
    const stats = await getQueueStats(userId)
    res.json(stats)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: message })
  }
})

// ─── Cron Job ─────────────────────────────────────────────────────────────────

const cronSchedule = process.env.SYNC_CRON_SCHEDULE || '0 3 */3 * *' // Every 3 days at 3am

if (cron.validate(cronSchedule)) {
  cron.schedule(cronSchedule, async () => {
    console.log(`[Cron] Starting scheduled sync at ${new Date().toISOString()}`)

    try {
      // Fetch all users who have a Spotify token
      const { data: users, error } = await supabase.auth.admin.listUsers()

      if (error) {
        console.error('[Cron] Failed to list users:', error.message)
        return
      }

      const usersWithSpotify = users.users.filter(
        u => u.user_metadata?.spotify_access_token
      )

      console.log(`[Cron] Syncing ${usersWithSpotify.length} users with Spotify`)

      for (const user of usersWithSpotify) {
        try {
          await syncSpotifyLibrary(user.id)
          // Small delay between users
          await new Promise(resolve => setTimeout(resolve, 5000))
        } catch (err) {
          console.error(`[Cron] Failed to sync user ${user.id}:`, err)
        }
      }

      // Process all pending downloads
      let processed = 0
      let total = 0
      do {
        processed = await processDownloadQueue()
        total += processed
      } while (processed === 10) // Keep processing while we fill a full batch

      console.log(`[Cron] Scheduled sync complete. Downloaded ${total} tracks.`)
    } catch (err) {
      console.error('[Cron] Scheduled sync error:', err)
    }
  })

  console.log(`[Cron] Scheduled sync registered: "${cronSchedule}"`)
} else {
  console.warn(`[Cron] Invalid cron schedule: "${cronSchedule}" — scheduled sync disabled`)
}

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🎧 DJ Sync Service running on port ${PORT}`)
  console.log(`   Cron schedule: ${cronSchedule}`)
  console.log(`   Supabase: ${process.env.SUPABASE_URL?.split('.')[0]}...`)
})
