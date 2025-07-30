// Production Mix Management Service
// Comprehensive mix saving, loading, and state management

import { createClient } from '@supabase/supabase-js'
import { TrackAnalysis } from './trackDatabase'

// Types for mix management
export interface MixState {
  id?: string
  title: string
  description?: string
  coverImageUrl?: string
  audioUrl?: string
  
  // Mix metadata
  genre?: string
  mood?: string
  energyLevel?: number
  bpmRange?: { min: number, max: number }
  keySignatures?: string[]
  
  // Technical details
  sampleRate?: number
  bitDepth?: number
  format?: 'mp3' | 'wav' | 'flac'
  fileSizeBytes?: number
  
  // Mix structure
  tracks: MixTrack[]
  totalTracks: number
  transitionCount: number
  avgTransitionQuality?: number
  mixTechnique?: 'live' | 'studio' | 'ai_assisted'
  
  // Visibility and sharing
  isPublic: boolean
  isFeatured?: boolean
  allowDownloads: boolean
  allowRemixes: boolean
  
  // Status
  status: 'draft' | 'processing' | 'published' | 'archived' | 'deleted'
  publishedAt?: string
  
  // Tags and categorization
  tags: string[]
  categories: string[]
  
  // Analytics (read-only)
  playCount?: number
  likeCount?: number
  commentCount?: number
  shareCount?: number
  downloadCount?: number
  
  // Timestamps
  createdAt?: string
  updatedAt?: string
}

export interface MixTrack {
  id?: string
  trackId: string // Spotify/SoundCloud ID
  position: number
  
  // Timing
  startTimeSeconds: number
  endTimeSeconds: number
  fadeInSeconds?: number
  fadeOutSeconds?: number
  
  // Track metadata
  title: string
  artist: string
  album?: string
  durationSeconds: number
  source: 'spotify' | 'soundcloud' | 'local' | 'youtube'
  sourceUrl?: string
  
  // Audio analysis
  bpm?: number
  keySignature?: string
  energy?: number
  valence?: number
  danceability?: number
  instrumentalness?: number
  acousticness?: number
  
  // Mix-specific settings
  volumeAdjustment?: number // dB
  pitchAdjustment?: number // semitones
  tempoAdjustment?: number // percentage
  
  // EQ settings
  eqLow?: number
  eqMid?: number
  eqHigh?: number
  
  // Effects
  effectsApplied?: EffectConfiguration[]
  
  // Transitions
  transitionIn?: TransitionConfiguration
  transitionOut?: TransitionConfiguration
  
  // User annotations
  cuePoints?: CuePoint[]
  notes?: string
}

export interface EffectConfiguration {
  type: string
  parameters: { [key: string]: number }
  enabled: boolean
  wetness?: number
}

export interface TransitionConfiguration {
  type: 'crossfade' | 'cut' | 'echo_out' | 'filter_sweep' | 'scratch'
  durationSeconds: number
  parameters: { [key: string]: number }
  automaticParams?: { [key: string]: number }
}

export interface CuePoint {
  id: string
  timeSeconds: number
  label: string
  color?: string
  type: 'cue' | 'loop_in' | 'loop_out' | 'hot_cue'
}

export interface MixVersion {
  id: string
  mixId: string
  versionNumber: number
  versionName?: string
  description?: string
  audioUrl?: string
  durationSeconds?: number
  fileSizeBytes?: number
  isCurrent: boolean
  isPublished: boolean
  createdAt: string
}

export interface SaveMixOptions {
  createVersion?: boolean
  versionName?: string
  publishAfterSave?: boolean
  generateAudio?: boolean
}

export interface LoadMixOptions {
  includeVersions?: boolean
  includeAnalytics?: boolean
  includeCollaborators?: boolean
}

class ProductionMixManager {
  private supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL!,
    process.env.REACT_APP_SUPABASE_ANON_KEY!
  )

  // Save mix with full state
  async saveMix(mixState: MixState, userId: string, options: SaveMixOptions = {}): Promise<string> {
    const {
      createVersion = false,
      versionName,
      publishAfterSave = false,
      generateAudio = false
    } = options

    try {
      // Prepare mix data for database
      const mixData = {
        user_id: userId,
        title: mixState.title,
        description: mixState.description,
        cover_image_url: mixState.coverImageUrl,
        audio_url: mixState.audioUrl,
        duration_seconds: this.calculateMixDuration(mixState.tracks),
        
        // Metadata
        genre: mixState.genre,
        mood: mixState.mood,
        energy_level: mixState.energyLevel,
        bpm_range: mixState.bpmRange ? JSON.stringify(mixState.bpmRange) : null,
        key_signatures: mixState.keySignatures,
        
        // Technical details
        sample_rate: mixState.sampleRate || 44100,
        bit_depth: mixState.bitDepth || 16,
        format: mixState.format || 'mp3',
        file_size_bytes: mixState.fileSizeBytes || 0,
        
        // Mix structure
        total_tracks: mixState.tracks.length,
        transition_count: this.countTransitions(mixState.tracks),
        avg_transition_quality: mixState.avgTransitionQuality,
        mix_technique: mixState.mixTechnique || 'studio',
        
        // Visibility
        is_public: mixState.isPublic,
        is_featured: mixState.isFeatured || false,
        allow_downloads: mixState.allowDownloads,
        allow_remixes: mixState.allowRemixes,
        
        // Status
        status: publishAfterSave ? 'published' : mixState.status,
        published_at: publishAfterSave ? new Date().toISOString() : mixState.publishedAt,
        
        // Tags
        tags: mixState.tags,
        categories: mixState.categories
      }

      let mixId: string

      if (mixState.id) {
        // Update existing mix
        const { error } = await this.supabase
          .from('mixes')
          .update(mixData)
          .eq('id', mixState.id)
          .eq('user_id', userId)

        if (error) throw error
        mixId = mixState.id
      } else {
        // Create new mix
        const { data, error } = await this.supabase
          .from('mixes')
          .insert(mixData)
          .select('id')
          .single()

        if (error) throw error
        mixId = data.id
      }

      // Save tracks
      await this.saveMixTracks(mixId, mixState.tracks)

      // Create version if requested
      if (createVersion) {
        await this.createMixVersion(mixId, versionName, generateAudio)
      }

      // Generate audio if requested
      if (generateAudio && !createVersion) {
        await this.generateMixAudio(mixId)
      }

      return mixId
    } catch (error) {
      console.error('Error saving mix:', error)
      throw new Error(`Failed to save mix: ${error}`)
    }
  }

  // Load mix with full state
  async loadMix(mixId: string, options: LoadMixOptions = {}): Promise<MixState | null> {
    const {
      includeVersions = false,
      includeAnalytics = true,
      includeCollaborators = false
    } = options

    try {
      // Load mix data
      const { data: mixData, error: mixError } = await this.supabase
        .from('mixes')
        .select('*')
        .eq('id', mixId)
        .single()

      if (mixError) throw mixError
      if (!mixData) return null

      // Load tracks
      const { data: tracksData, error: tracksError } = await this.supabase
        .from('mix_tracks')
        .select('*')
        .eq('mix_id', mixId)
        .order('position')

      if (tracksError) throw tracksError

      // Convert database format to MixState
      const mixState: MixState = {
        id: mixData.id,
        title: mixData.title,
        description: mixData.description,
        coverImageUrl: mixData.cover_image_url,
        audioUrl: mixData.audio_url,
        
        // Metadata
        genre: mixData.genre,
        mood: mixData.mood,
        energyLevel: mixData.energy_level,
        bpmRange: mixData.bpm_range ? JSON.parse(mixData.bpm_range) : undefined,
        keySignatures: mixData.key_signatures,
        
        // Technical details
        sampleRate: mixData.sample_rate,
        bitDepth: mixData.bit_depth,
        format: mixData.format,
        fileSizeBytes: mixData.file_size_bytes,
        
        // Mix structure
        tracks: this.convertTracksFromDatabase(tracksData || []),
        totalTracks: mixData.total_tracks,
        transitionCount: mixData.transition_count,
        avgTransitionQuality: mixData.avg_transition_quality,
        mixTechnique: mixData.mix_technique,
        
        // Visibility
        isPublic: mixData.is_public,
        isFeatured: mixData.is_featured,
        allowDownloads: mixData.allow_downloads,
        allowRemixes: mixData.allow_remixes,
        
        // Status
        status: mixData.status,
        publishedAt: mixData.published_at,
        
        // Tags
        tags: mixData.tags || [],
        categories: mixData.categories || [],
        
        // Analytics
        playCount: includeAnalytics ? mixData.play_count : undefined,
        likeCount: includeAnalytics ? mixData.like_count : undefined,
        commentCount: includeAnalytics ? mixData.comment_count : undefined,
        shareCount: includeAnalytics ? mixData.share_count : undefined,
        downloadCount: includeAnalytics ? mixData.download_count : undefined,
        
        // Timestamps
        createdAt: mixData.created_at,
        updatedAt: mixData.updated_at
      }

      return mixState
    } catch (error) {
      console.error('Error loading mix:', error)
      throw new Error(`Failed to load mix: ${error}`)
    }
  }

  // Load user's mixes
  async loadUserMixes(userId: string, limit = 20, offset = 0): Promise<MixState[]> {
    try {
      const { data, error } = await this.supabase
        .from('mixes')
        .select(`
          id, title, description, cover_image_url, duration_seconds,
          genre, mood, energy_level, is_public, status, created_at,
          play_count, like_count, comment_count, total_tracks
        `)
        .eq('user_id', userId)
        .neq('status', 'deleted')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return (data || []).map(mix => ({
        id: mix.id,
        title: mix.title,
        description: mix.description,
        coverImageUrl: mix.cover_image_url,
        genre: mix.genre,
        mood: mix.mood,
        energyLevel: mix.energy_level,
        tracks: [], // Not loaded for list view
        totalTracks: mix.total_tracks,
        transitionCount: 0,
        isPublic: mix.is_public,
        allowDownloads: false,
        allowRemixes: false,
        status: mix.status,
        tags: [],
        categories: [],
        playCount: mix.play_count,
        likeCount: mix.like_count,
        commentCount: mix.comment_count,
        createdAt: mix.created_at
      }))
    } catch (error) {
      console.error('Error loading user mixes:', error)
      throw new Error(`Failed to load user mixes: ${error}`)
    }
  }

  // Delete mix
  async deleteMix(mixId: string, userId: string, permanent = false): Promise<void> {
    try {
      if (permanent) {
        // Permanent deletion
        const { error } = await this.supabase
          .from('mixes')
          .delete()
          .eq('id', mixId)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        // Soft deletion
        const { error } = await this.supabase
          .from('mixes')
          .update({ status: 'deleted' })
          .eq('id', mixId)
          .eq('user_id', userId)

        if (error) throw error
      }
    } catch (error) {
      console.error('Error deleting mix:', error)
      throw new Error(`Failed to delete mix: ${error}`)
    }
  }

  // Create mix version
  async createMixVersion(mixId: string, versionName?: string, generateAudio = false): Promise<string> {
    try {
      // Get current version number
      const { data: versions, error: versionError } = await this.supabase
        .from('mix_versions')
        .select('version_number')
        .eq('mix_id', mixId)
        .order('version_number', { ascending: false })
        .limit(1)

      if (versionError) throw versionError

      const nextVersionNumber = versions && versions.length > 0 ? versions[0].version_number + 1 : 1

      // Create new version
      const { data, error } = await this.supabase
        .from('mix_versions')
        .insert({
          mix_id: mixId,
          version_number: nextVersionNumber,
          version_name: versionName || `Version ${nextVersionNumber}`,
          is_current: true
        })
        .select('id')
        .single()

      if (error) throw error

      // Mark other versions as not current
      await this.supabase
        .from('mix_versions')
        .update({ is_current: false })
        .eq('mix_id', mixId)
        .neq('id', data.id)

      if (generateAudio) {
        await this.generateVersionAudio(data.id)
      }

      return data.id
    } catch (error) {
      console.error('Error creating mix version:', error)
      throw new Error(`Failed to create mix version: ${error}`)
    }
  }

  // Duplicate mix
  async duplicateMix(mixId: string, userId: string, newTitle?: string): Promise<string> {
    try {
      const originalMix = await this.loadMix(mixId)
      if (!originalMix) throw new Error('Original mix not found')

      const duplicatedMix: MixState = {
        ...originalMix,
        id: undefined, // Remove ID to create new mix
        title: newTitle || `${originalMix.title} (Copy)`,
        status: 'draft',
        isPublic: false,
        audioUrl: undefined,
        playCount: 0,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        downloadCount: 0,
        publishedAt: undefined,
        createdAt: undefined,
        updatedAt: undefined
      }

      return await this.saveMix(duplicatedMix, userId)
    } catch (error) {
      console.error('Error duplicating mix:', error)
      throw new Error(`Failed to duplicate mix: ${error}`)
    }
  }

  // Private helper methods
  private async saveMixTracks(mixId: string, tracks: MixTrack[]): Promise<void> {
    // Delete existing tracks
    await this.supabase
      .from('mix_tracks')
      .delete()
      .eq('mix_id', mixId)

    if (tracks.length === 0) return

    // Insert new tracks
    const trackData = tracks.map(track => ({
      mix_id: mixId,
      track_id: track.trackId,
      position: track.position,
      start_time_seconds: track.startTimeSeconds,
      end_time_seconds: track.endTimeSeconds,
      fade_in_seconds: track.fadeInSeconds || 0,
      fade_out_seconds: track.fadeOutSeconds || 0,
      
      // Track metadata
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration_seconds: track.durationSeconds,
      source: track.source,
      source_url: track.sourceUrl,
      
      // Audio analysis
      bpm: track.bpm,
      key_signature: track.keySignature,
      energy: track.energy,
      valence: track.valence,
      danceability: track.danceability,
      instrumentalness: track.instrumentalness,
      acousticness: track.acousticness,
      
      // Mix settings
      volume_adjustment: track.volumeAdjustment || 0,
      pitch_adjustment: track.pitchAdjustment || 0,
      tempo_adjustment: track.tempoAdjustment || 0,
      eq_low: track.eqLow || 0,
      eq_mid: track.eqMid || 0,
      eq_high: track.eqHigh || 0,
      
      // Effects and transitions
      effects_applied: JSON.stringify(track.effectsApplied || []),
      transition_in: JSON.stringify(track.transitionIn || {}),
      transition_out: JSON.stringify(track.transitionOut || {}),
      cue_points: JSON.stringify(track.cuePoints || []),
      notes: track.notes
    }))

    const { error } = await this.supabase
      .from('mix_tracks')
      .insert(trackData)

    if (error) throw error
  }

  private convertTracksFromDatabase(dbTracks: any[]): MixTrack[] {
    return dbTracks.map(track => ({
      id: track.id,
      trackId: track.track_id,
      position: track.position,
      startTimeSeconds: track.start_time_seconds,
      endTimeSeconds: track.end_time_seconds,
      fadeInSeconds: track.fade_in_seconds,
      fadeOutSeconds: track.fade_out_seconds,
      
      // Track metadata
      title: track.title,
      artist: track.artist,
      album: track.album,
      durationSeconds: track.duration_seconds,
      source: track.source,
      sourceUrl: track.source_url,
      
      // Audio analysis
      bpm: track.bpm,
      keySignature: track.key_signature,
      energy: track.energy,
      valence: track.valence,
      danceability: track.danceability,
      instrumentalness: track.instrumentalness,
      acousticness: track.acousticness,
      
      // Mix settings
      volumeAdjustment: track.volume_adjustment,
      pitchAdjustment: track.pitch_adjustment,
      tempoAdjustment: track.tempo_adjustment,
      eqLow: track.eq_low,
      eqMid: track.eq_mid,
      eqHigh: track.eq_high,
      
      // Effects and transitions
      effectsApplied: track.effects_applied ? JSON.parse(track.effects_applied) : [],
      transitionIn: track.transition_in ? JSON.parse(track.transition_in) : undefined,
      transitionOut: track.transition_out ? JSON.parse(track.transition_out) : undefined,
      cuePoints: track.cue_points ? JSON.parse(track.cue_points) : [],
      notes: track.notes
    }))
  }

  private calculateMixDuration(tracks: MixTrack[]): number {
    if (tracks.length === 0) return 0
    const lastTrack = tracks[tracks.length - 1]
    return Math.round(lastTrack.endTimeSeconds)
  }

  private countTransitions(tracks: MixTrack[]): number {
    return Math.max(0, tracks.length - 1)
  }

  private async generateMixAudio(mixId: string): Promise<void> {
    // This would trigger audio generation service
    // For now, we'll just update the status
    console.log(`Audio generation requested for mix ${mixId}`)
    
    // Update mix status to processing
    await this.supabase
      .from('mixes')
      .update({ status: 'processing' })
      .eq('id', mixId)
  }

  private async generateVersionAudio(versionId: string): Promise<void> {
    // This would trigger audio generation for specific version
    console.log(`Version audio generation requested for version ${versionId}`)
  }

  // Export current mix state from DJ interface
  static exportMixState(
    tracks: any[], // From current DJ interface
    settings: any, // Global mix settings
    metadata: any // User-provided metadata
  ): MixState {
    const mixTracks: MixTrack[] = tracks.map((track, index) => ({
      trackId: track.id,
      position: index,
      startTimeSeconds: track.startTime || index * 180, // Estimated timing
      endTimeSeconds: track.endTime || (index + 1) * 180,
      
      // Track metadata
      title: track.name,
      artist: track.artists?.[0]?.name || 'Unknown Artist',
      album: track.album?.name,
      durationSeconds: track.duration_ms / 1000,
      source: track.source || 'spotify',
      sourceUrl: track.external_urls?.spotify,
      
      // Audio analysis
      bpm: track.tempo,
      keySignature: track.camelotKey,
      energy: track.energy,
      valence: track.valence,
      danceability: track.danceability,
      instrumentalness: track.instrumentalness,
      acousticness: track.acousticness,
      
      // Current settings from interface
      volumeAdjustment: track.volume || 0,
      pitchAdjustment: track.pitch || 0,
      tempoAdjustment: track.tempoAdjustment || 0,
      eqLow: track.eqLow || 0,
      eqMid: track.eqMid || 0,
      eqHigh: track.eqHigh || 0,
      
      // Effects (if any applied)
      effectsApplied: track.effects || [],
      cuePoints: track.cuePoints || []
    }))

    return {
      title: metadata.title || 'Untitled Mix',
      description: metadata.description,
      genre: metadata.genre,
      mood: metadata.mood,
      tracks: mixTracks,
      totalTracks: mixTracks.length,
      transitionCount: Math.max(0, mixTracks.length - 1),
      isPublic: metadata.isPublic || false,
      allowDownloads: metadata.allowDownloads || false,
      allowRemixes: metadata.allowRemixes || true,
      status: 'draft',
      tags: metadata.tags || [],
      categories: metadata.categories || []
    }
  }
}

// Export singleton instance
export const mixManager = new ProductionMixManager()

// All types are already exported as interfaces above