/**
 * downloader.ts
 *
 * Downloads audio tracks using yt-dlp.
 *
 * For Spotify tracks: searches YouTube Music for "Artist - Title" and downloads the best match.
 * For SoundCloud URLs: downloads directly.
 *
 * Returns a Buffer of the MP3 file for upload to Supabase Storage.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, unlink, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const execAsync = promisify(exec)

export interface DownloadOptions {
  searchQuery?: string    // For Spotify: "Artist - Title" to search YouTube Music
  directUrl?: string      // For SoundCloud or direct URLs
  outputDir?: string      // Optional custom temp dir (for testing)
}

export interface DownloadedAudio {
  buffer: Buffer
  durationSeconds?: number
  title?: string
  uploader?: string
}

/**
 * Download audio as MP3 using yt-dlp.
 * Provide either searchQuery (for Spotify→YT Music) or directUrl (for SoundCloud).
 */
export async function downloadAudioBuffer(options: DownloadOptions): Promise<DownloadedAudio> {
  const { searchQuery, directUrl } = options

  if (!searchQuery && !directUrl) {
    throw new Error('Must provide either searchQuery or directUrl')
  }

  // Create a temp directory for this download
  const tempDir = await mkdtemp(join(tmpdir(), 'dj-download-'))
  const outputTemplate = join(tempDir, '%(id)s.%(ext)s')

  // Build yt-dlp command
  const ytDlpArgs: string[] = [
    '--format', 'bestaudio/best',
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', '0',          // 0 = best VBR quality (≈320kbps)
    '--output', outputTemplate,
    '--print-json',                   // Print track metadata as JSON
    '--no-playlist',                  // Don't download full playlists
    '--socket-timeout', '30',
    '--retries', '3',
  ]

  if (searchQuery) {
    // YouTube Music search — pick the first result
    // ytmsearch1: prefix searches YouTube Music specifically
    ytDlpArgs.push(`ytmsearch1:${searchQuery}`)
  } else if (directUrl) {
    ytDlpArgs.push(directUrl)
  }

  const command = `yt-dlp ${ytDlpArgs.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ')}`

  console.log(`[Downloader] Running: yt-dlp for "${searchQuery || directUrl}"`)

  let jsonOutput = ''
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 5 * 60 * 1000, // 5 minute timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB stdout buffer
    })

    jsonOutput = stdout
    if (stderr && !stderr.includes('WARNING')) {
      console.warn(`[Downloader] yt-dlp stderr:`, stderr.slice(0, 500))
    }
  } catch (err: unknown) {
    const error = err as { message?: string; stderr?: string }
    const details = error.stderr || error.message || String(err)
    throw new Error(`yt-dlp failed: ${details.slice(0, 500)}`)
  }

  // Parse metadata from JSON output
  let metadata: {
    id?: string
    title?: string
    uploader?: string
    duration?: number
    requested_downloads?: Array<{ filename?: string }>
  } = {}

  try {
    // yt-dlp with --print-json outputs JSON for the info dict
    // The actual downloaded file info is in requested_downloads
    const lines = jsonOutput.trim().split('\n').filter(l => l.startsWith('{'))
    if (lines.length > 0) {
      metadata = JSON.parse(lines[lines.length - 1])
    }
  } catch {
    console.warn('[Downloader] Could not parse yt-dlp JSON output')
  }

  // Find the downloaded MP3 file in the temp directory
  const { readdir } = await import('fs/promises')
  const files = await readdir(tempDir)
  const mp3File = files.find(f => f.endsWith('.mp3'))

  if (!mp3File) {
    throw new Error(`No MP3 file found after download in ${tempDir}. Files: ${files.join(', ')}`)
  }

  const filePath = join(tempDir, mp3File)
  const buffer = await readFile(filePath)

  // Clean up temp file
  try {
    await unlink(filePath)
    await import('fs/promises').then(fs => fs.rmdir(tempDir))
  } catch {
    // Non-fatal cleanup failure
  }

  console.log(`[Downloader] Downloaded ${buffer.length} bytes for "${searchQuery || directUrl}"`)

  return {
    buffer,
    durationSeconds: metadata.duration,
    title: metadata.title,
    uploader: metadata.uploader
  }
}

/**
 * Build a YouTube Music search query from track metadata.
 * Format: "Artist Name - Track Title" — this gives yt-dlp the best chance
 * of finding the official audio.
 */
export function buildSearchQuery(artist: string, title: string): string {
  // Clean up titles: remove remix info in parens for initial search
  // (yt-dlp will still find remixes if the exact title is in the search)
  return `${artist} - ${title}`
}

/**
 * Check if yt-dlp is installed and accessible.
 */
export async function checkYtDlp(): Promise<boolean> {
  try {
    await execAsync('yt-dlp --version', { timeout: 5000 })
    return true
  } catch {
    return false
  }
}
