import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
}

// Service role client — bypasses RLS, used only server-side
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the storage path on success.
 */
export async function uploadTrackFile(
  userId: string,
  trackId: string,
  buffer: Buffer,
  mimeType: string = 'audio/mpeg'
): Promise<string> {
  const path = `${userId}/${trackId}.mp3`

  const { error } = await supabase.storage
    .from('track-audio')
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true
    })

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  return path
}

/**
 * Get a signed URL for a track file (valid for 1 hour).
 */
export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('track-audio')
    .createSignedUrl(storagePath, 3600)

  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message}`)
  }

  return data.signedUrl
}
