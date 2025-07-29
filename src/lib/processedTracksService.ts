import { supabase } from './supabase'

export interface ProcessedTrack {
  id: string
  spotify_id: string
  title: string
  artist: string
  album?: string
  duration_ms: number
  processed_at: string
  processing_version: string
  audio_features?: any
  metadata?: any
  is_public: boolean
  created_by?: string
}

export interface TrackAnalysis {
  id: string
  track_id: string
  bpm: number
  key: string
  camelot_key: string
  energy?: number
  danceability?: number
  valence?: number
  loudness?: number
  tempo_stability?: number
  sections?: any
  beats?: any
  bars?: any
  segments?: any
}

export interface TrackStem {
  id: string
  track_id: string
  stem_type: 'vocals' | 'drums' | 'bass' | 'other' | 'instrumental'
  file_url: string
  file_size_mb?: number
  format: string
  bitrate: number
}

export interface ProcessingQueueItem {
  id: string
  user_id: string
  spotify_track_id: string
  playlist_id?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  priority: number
  started_at?: string
  completed_at?: string
  error_message?: string
  retry_count: number
}

export interface ProcessingBatch {
  id: string
  user_id: string
  playlist_ids: string[]
  total_tracks: number
  processed_tracks: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  notification_email?: string
  notification_phone?: string
  started_at?: string
  completed_at?: string
}

class ProcessedTracksService {
  // Check if a track is already processed
  async checkIfProcessed(spotifyId: string): Promise<ProcessedTrack | null> {
    const { data, error } = await supabase
      .from('processed_tracks')
      .select('*')
      .eq('spotify_id', spotifyId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // Not found error
      console.error('Error checking processed track:', error)
      return null
    }
    
    return data
  }
  
  // Get processed track with full details
  async getProcessedTrack(spotifyId: string): Promise<{
    track: ProcessedTrack
    analysis: TrackAnalysis
    stems: TrackStem[]
    waveform?: any
  } | null> {
    // Get track
    const track = await this.checkIfProcessed(spotifyId)
    if (!track) return null
    
    // Get analysis
    const { data: analysis } = await supabase
      .from('track_analysis')
      .select('*')
      .eq('track_id', track.id)
      .single()
    
    // Get stems
    const { data: stems } = await supabase
      .from('track_stems')
      .select('*')
      .eq('track_id', track.id)
    
    // Get waveform (medium resolution by default)
    const { data: waveform } = await supabase
      .from('track_waveforms')
      .select('*')
      .eq('track_id', track.id)
      .eq('resolution', 'medium')
      .single()
    
    return {
      track,
      analysis: analysis || null,
      stems: stems || [],
      waveform: waveform?.data
    }
  }
  
  // Add track to processing queue
  async addToQueue(spotifyTrackId: string, playlistId?: string): Promise<ProcessingQueueItem | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    const { data, error } = await supabase
      .from('processing_queue')
      .insert({
        user_id: user.id,
        spotify_track_id: spotifyTrackId,
        playlist_id: playlistId
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error adding to queue:', error)
      return null
    }
    
    return data
  }
  
  // Create processing batch for playlists
  async createBatch(
    playlistIds: string[], 
    totalTracks: number,
    notificationEmail?: string,
    notificationPhone?: string
  ): Promise<ProcessingBatch | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    const { data, error } = await supabase
      .from('processing_batches')
      .insert({
        user_id: user.id,
        playlist_ids: playlistIds,
        total_tracks: totalTracks,
        notification_email: notificationEmail,
        notification_phone: notificationPhone
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating batch:', error)
      return null
    }
    
    return data
  }
  
  // Get user's processing queue
  async getUserQueue(): Promise<ProcessingQueueItem[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    
    const { data, error } = await supabase
      .from('processing_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching queue:', error)
      return []
    }
    
    return data || []
  }
  
  // Get user's batches
  async getUserBatches(): Promise<ProcessingBatch[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    
    const { data, error } = await supabase
      .from('processing_batches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching batches:', error)
      return []
    }
    
    return data || []
  }
  
  // Add track to user's library
  async addToLibrary(trackId: string, playlistId?: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    
    const { error } = await supabase
      .from('user_tracks')
      .upsert({
        user_id: user.id,
        track_id: trackId,
        spotify_playlist_id: playlistId
      })
    
    if (error) {
      console.error('Error adding to library:', error)
      return false
    }
    
    return true
  }
  
  // Get user's processed library
  async getUserLibrary(): Promise<ProcessedTrack[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    
    const { data, error } = await supabase
      .from('user_tracks')
      .select(`
        track_id,
        processed_tracks!inner(*)
      `)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error fetching library:', error)
      return []
    }
    
    return data?.map(item => item.processed_tracks as unknown as ProcessedTrack) || []
  }
  
  // Search processed tracks
  async searchProcessedTracks(query: string): Promise<ProcessedTrack[]> {
    const { data, error } = await supabase
      .from('processed_tracks')
      .select('*')
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
      .eq('is_public', true)
      .limit(20)
    
    if (error) {
      console.error('Error searching tracks:', error)
      return []
    }
    
    return data || []
  }
  
  // Get tracks by BPM range
  async getTracksByBPM(minBPM: number, maxBPM: number): Promise<ProcessedTrack[]> {
    const { data, error } = await supabase
      .from('track_analysis')
      .select(`
        track_id,
        bpm,
        processed_tracks!inner(*)
      `)
      .gte('bpm', minBPM)
      .lte('bpm', maxBPM)
      .eq('processed_tracks.is_public', true)
      .limit(50)
    
    if (error) {
      console.error('Error fetching by BPM:', error)
      return []
    }
    
    return data?.map(item => item.processed_tracks as unknown as ProcessedTrack) || []
  }
  
  // Get harmonic matches
  async getHarmonicMatches(camelotKey: string): Promise<ProcessedTrack[]> {
    // Compatible keys based on Camelot Wheel
    const compatibleKeys = this.getCompatibleKeys(camelotKey)
    
    const { data, error } = await supabase
      .from('track_analysis')
      .select(`
        track_id,
        camelot_key,
        processed_tracks!inner(*)
      `)
      .in('camelot_key', compatibleKeys)
      .eq('processed_tracks.is_public', true)
      .limit(30)
    
    if (error) {
      console.error('Error fetching harmonic matches:', error)
      return []
    }
    
    return data?.map(item => item.processed_tracks as unknown as ProcessedTrack) || []
  }
  
  private getCompatibleKeys(camelotKey: string): string[] {
    // Extract number and letter (e.g., "8A" -> 8, "A")
    const match = camelotKey.match(/(\d+)([AB])/)
    if (!match) return [camelotKey]
    
    const num = parseInt(match[1])
    const letter = match[2]
    
    const compatible = [camelotKey]
    
    // Same number, different letter (parallel key)
    compatible.push(`${num}${letter === 'A' ? 'B' : 'A'}`)
    
    // Adjacent numbers, same letter
    const prevNum = num === 1 ? 12 : num - 1
    const nextNum = num === 12 ? 1 : num + 1
    compatible.push(`${prevNum}${letter}`)
    compatible.push(`${nextNum}${letter}`)
    
    return compatible
  }
}

export const processedTracksService = new ProcessedTracksService()