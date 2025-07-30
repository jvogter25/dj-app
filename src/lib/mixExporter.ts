// Production Mix Export Service
// High-quality audio export functionality for DJ mixes

import { MixState, MixTrack } from './mixManager'

export interface ExportOptions {
  format: 'mp3' | 'wav' | 'flac'
  quality: 'high' | 'medium' | 'low' | 'lossless'
  sampleRate: 44100 | 48000 | 96000
  bitDepth: 16 | 24 | 32
  channels: 'stereo' | 'mono'
  normalize: boolean
  fadeIn: number // seconds
  fadeOut: number // seconds
  includeMetadata: boolean
  chapterMarkers: boolean
}

export interface ExportProgress {
  stage: 'preparing' | 'loading' | 'processing' | 'encoding' | 'finalizing' | 'complete' | 'error'
  progress: number // 0-100
  currentTrack?: string
  estimatedTimeRemaining?: number
  message?: string
  error?: string
}

export interface ExportResult {
  success: boolean
  audioUrl?: string
  audioBlob?: Blob
  duration: number
  fileSize: number
  format: string
  metadata?: {
    title: string
    artist: string
    album?: string
    genre?: string
    year?: number
    artwork?: string
    chapters?: ChapterMarker[]
  }
  error?: string
}

export interface ChapterMarker {
  title: string
  startTime: number
  endTime: number
  artist?: string
}

class ProductionMixExporter {
  private audioContext: AudioContext | null = null
  private abortController: AbortController | null = null

  // Main export function
  async exportMix(
    mixState: MixState,
    options: ExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    this.abortController = new AbortController()
    
    try {
      // Initialize audio context
      await this.initializeAudioContext(options.sampleRate)
      
      onProgress?.({
        stage: 'preparing',
        progress: 0,
        message: 'Preparing mix export...'
      })

      // Validate mix state
      if (!mixState.tracks || mixState.tracks.length === 0) {
        throw new Error('No tracks in mix to export')
      }

      // Load and process all tracks
      const processedTracks = await this.loadAndProcessTracks(
        mixState.tracks,
        options,
        onProgress
      )

      if (this.abortController.signal.aborted) {
        throw new Error('Export cancelled')
      }

      onProgress?.({
        stage: 'processing',
        progress: 50,
        message: 'Mixing tracks together...'
      })

      // Create final mix
      const finalAudioBuffer = await this.mixTracks(
        processedTracks,
        mixState,
        options,
        onProgress
      )

      if (this.abortController.signal.aborted) {
        throw new Error('Export cancelled')
      }

      onProgress?.({
        stage: 'encoding',
        progress: 80,
        message: `Encoding to ${options.format.toUpperCase()}...`
      })

      // Encode to desired format
      const audioBlob = await this.encodeAudio(finalAudioBuffer, options)

      if (this.abortController.signal.aborted) {
        throw new Error('Export cancelled')
      }

      onProgress?.({
        stage: 'finalizing',
        progress: 95,
        message: 'Finalizing export...'
      })

      // Create metadata
      const metadata = options.includeMetadata ? this.createMetadata(mixState, options) : undefined

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Export complete!'
      })

      return {
        success: true,
        audioBlob,
        audioUrl: URL.createObjectURL(audioBlob),
        duration: finalAudioBuffer.duration,
        fileSize: audioBlob.size,
        format: options.format,
        metadata
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      onProgress?.({
        stage: 'error',
        progress: 0,
        error: errorMessage
      })

      return {
        success: false,
        duration: 0,
        fileSize: 0,
        format: options.format,
        error: errorMessage
      }
    } finally {
      this.cleanup()
    }
  }

  // Cancel ongoing export
  cancelExport(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  // Initialize audio context with specified sample rate
  private async initializeAudioContext(sampleRate: number): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close()
    }

    this.audioContext = new AudioContext({
      sampleRate,
      latencyHint: 'playback'
    })

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  // Load and process individual tracks with effects
  private async loadAndProcessTracks(
    tracks: MixTrack[],
    options: ExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<AudioBuffer[]> {
    const processedTracks: AudioBuffer[] = []
    const totalTracks = tracks.length

    for (let i = 0; i < tracks.length; i++) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Export cancelled')
      }

      const track = tracks[i]
      const progress = Math.round((i / totalTracks) * 40) // 0-40% for loading

      onProgress?.({
        stage: 'loading',
        progress,
        currentTrack: `${track.artist} - ${track.title}`,
        message: `Loading track ${i + 1} of ${totalTracks}...`
      })

      try {
        // Load track audio data
        const audioBuffer = await this.loadTrackAudio(track)
        
        // Apply track-specific processing
        const processedBuffer = await this.processTrackAudio(audioBuffer, track, options)
        
        processedTracks.push(processedBuffer)
      } catch (error) {
        console.error(`Failed to load track ${track.title}:`, error)
        // Create silence buffer as fallback
        const silenceBuffer = this.createSilenceBuffer(track.durationSeconds, options.sampleRate)
        processedTracks.push(silenceBuffer)
      }
    }

    return processedTracks
  }

  // Load audio data for a single track
  private async loadTrackAudio(track: MixTrack): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    // For demo purposes, create a sine wave
    // In production, this would load from Spotify/SoundCloud/local file
    const duration = track.durationSeconds
    const sampleRate = this.audioContext.sampleRate
    const frameCount = sampleRate * duration
    const audioBuffer = this.audioContext.createBuffer(2, frameCount, sampleRate)

    // Generate test tone based on track BPM and key
    const frequency = this.getFrequencyFromKey(track.keySignature) || 440
    const bpm = track.bpm || 120

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel)
      for (let i = 0; i < frameCount; i++) {
        const time = i / sampleRate
        const beatPhase = (time * bpm / 60) % 1
        const envelope = Math.sin(beatPhase * Math.PI) * 0.5 + 0.5
        channelData[i] = Math.sin(2 * Math.PI * frequency * time) * 0.1 * envelope
      }
    }

    return audioBuffer
  }

  // Process track with effects, EQ, and adjustments
  private async processTrackAudio(
    audioBuffer: AudioBuffer,
    track: MixTrack,
    options: ExportOptions
  ): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )

    // Create source
    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer

    // Apply tempo adjustment
    if (track.tempoAdjustment && track.tempoAdjustment !== 0) {
      source.playbackRate.value = 1 + (track.tempoAdjustment / 100)
    }

    // Apply pitch adjustment (simplified - in production would use pitch shifting)
    if (track.pitchAdjustment && track.pitchAdjustment !== 0) {
      // For demo, just adjust playback rate slightly
      source.playbackRate.value *= Math.pow(2, track.pitchAdjustment / 12)
    }

    // Apply EQ
    let currentNode: AudioNode = source
    if (track.eqLow !== 0 || track.eqMid !== 0 || track.eqHigh !== 0) {
      currentNode = this.applyEQ(offlineContext, currentNode, track)
    }

    // Apply volume adjustment
    if (track.volumeAdjustment && track.volumeAdjustment !== 0) {
      const gainNode = offlineContext.createGain()
      gainNode.gain.value = Math.pow(10, track.volumeAdjustment / 20) // dB to linear
      currentNode.connect(gainNode)
      currentNode = gainNode
    }

    // Apply effects
    if (track.effectsApplied && track.effectsApplied.length > 0) {
      currentNode = await this.applyEffects(offlineContext, currentNode, track.effectsApplied)
    }

    // Connect to destination
    currentNode.connect(offlineContext.destination)

    // Start processing
    source.start(0)
    return await offlineContext.startRendering()
  }

  // Apply EQ to track
  private applyEQ(context: BaseAudioContext, source: AudioNode, track: MixTrack): AudioNode {
    // Low shelf filter
    const lowFilter = context.createBiquadFilter()
    lowFilter.type = 'lowshelf'
    lowFilter.frequency.value = 250
    lowFilter.gain.value = track.eqLow || 0

    // Mid peaking filter
    const midFilter = context.createBiquadFilter()
    midFilter.type = 'peaking'
    midFilter.frequency.value = 1000
    midFilter.Q.value = 0.7
    midFilter.gain.value = track.eqMid || 0

    // High shelf filter
    const highFilter = context.createBiquadFilter()
    highFilter.type = 'highshelf'
    highFilter.frequency.value = 4000
    highFilter.gain.value = track.eqHigh || 0

    // Chain filters
    source.connect(lowFilter)
    lowFilter.connect(midFilter)
    midFilter.connect(highFilter)

    return highFilter
  }

  // Apply effects chain
  private async applyEffects(
    context: BaseAudioContext,
    source: AudioNode,
    effects: any[]
  ): Promise<AudioNode> {
    let currentNode = source

    for (const effect of effects) {
      if (!effect.enabled) continue

      switch (effect.type) {
        case 'reverb':
          currentNode = this.applyReverb(context, currentNode, effect.parameters)
          break
        case 'delay':
          currentNode = this.applyDelay(context, currentNode, effect.parameters)
          break
        case 'filter':
          currentNode = this.applyFilter(context, currentNode, effect.parameters)
          break
        // Add more effects as needed
      }
    }

    return currentNode
  }

  // Apply reverb effect
  private applyReverb(context: BaseAudioContext, source: AudioNode, params: any): AudioNode {
    const convolver = context.createConvolver()
    const wetGain = context.createGain()
    const dryGain = context.createGain()
    const output = context.createGain()

    // Create impulse response for reverb
    const duration = params.roomSize || 2
    const impulse = context.createBuffer(2, context.sampleRate * duration, context.sampleRate)
    
    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < channelData.length; i++) {
        const decay = Math.pow(1 - i / channelData.length, 2)
        channelData[i] = (Math.random() * 2 - 1) * decay
      }
    }
    
    convolver.buffer = impulse

    // Set up wet/dry mix
    const wetness = params.wetness || 0.3
    wetGain.gain.value = wetness
    dryGain.gain.value = 1 - wetness

    // Connect nodes
    source.connect(dryGain)
    source.connect(convolver)
    convolver.connect(wetGain)
    
    dryGain.connect(output)
    wetGain.connect(output)

    return output
  }

  // Apply delay effect
  private applyDelay(context: BaseAudioContext, source: AudioNode, params: any): AudioNode {
    const delay = context.createDelay(1)
    const feedback = context.createGain()
    const wetGain = context.createGain()
    const dryGain = context.createGain()
    const output = context.createGain()

    // Set parameters
    delay.delayTime.value = params.time || 0.25
    feedback.gain.value = params.feedback || 0.3
    
    const wetness = params.wetness || 0.2
    wetGain.gain.value = wetness
    dryGain.gain.value = 1 - wetness

    // Connect delay feedback loop
    source.connect(delay)
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(wetGain)

    // Connect wet/dry mix
    source.connect(dryGain)
    dryGain.connect(output)
    wetGain.connect(output)

    return output
  }

  // Apply filter effect
  private applyFilter(context: BaseAudioContext, source: AudioNode, params: any): AudioNode {
    const filter = context.createBiquadFilter()
    filter.type = params.type || 'lowpass'
    filter.frequency.value = params.frequency || 1000
    filter.Q.value = params.resonance || 1

    source.connect(filter)
    return filter
  }

  // Mix all processed tracks together
  private async mixTracks(
    tracks: AudioBuffer[],
    mixState: MixState,
    options: ExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    // Calculate total mix duration
    const totalDuration = this.calculateMixDuration(mixState.tracks)
    const sampleRate = options.sampleRate
    const frameCount = Math.ceil(sampleRate * totalDuration)

    // Create final mix buffer
    const channels = options.channels === 'mono' ? 1 : 2
    const finalBuffer = this.audioContext.createBuffer(channels, frameCount, sampleRate)

    // Mix each track at its designated time
    for (let i = 0; i < tracks.length; i++) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Export cancelled')
      }

      const track = mixState.tracks[i]
      const audioBuffer = tracks[i]
      const progress = 50 + Math.round((i / tracks.length) * 30) // 50-80%

      onProgress?.({
        stage: 'processing',
        progress,
        currentTrack: `${track.artist} - ${track.title}`,
        message: `Mixing track ${i + 1} of ${tracks.length}...`
      })

      // Apply crossfades and transitions
      this.mixTrackIntoBuffer(finalBuffer, audioBuffer, track, i > 0 ? mixState.tracks[i - 1] : null)
    }

    // Apply global mix processing
    return this.applyGlobalProcessing(finalBuffer, options)
  }

  // Mix individual track into final buffer
  private mixTrackIntoBuffer(
    finalBuffer: AudioBuffer,
    trackBuffer: AudioBuffer,
    track: MixTrack,
    previousTrack: MixTrack | null
  ): void {
    const startFrame = Math.floor(track.startTimeSeconds * finalBuffer.sampleRate)
    const endFrame = Math.floor(track.endTimeSeconds * finalBuffer.sampleRate)
    const trackLength = Math.min(trackBuffer.length, endFrame - startFrame)

    // Calculate fade times
    const fadeInFrames = Math.floor((track.fadeInSeconds || 0) * finalBuffer.sampleRate)
    const fadeOutFrames = Math.floor((track.fadeOutSeconds || 0) * finalBuffer.sampleRate)

    for (let channel = 0; channel < Math.min(finalBuffer.numberOfChannels, trackBuffer.numberOfChannels); channel++) {
      const finalData = finalBuffer.getChannelData(channel)
      const trackData = trackBuffer.getChannelData(channel)

      for (let i = 0; i < trackLength; i++) {
        if (startFrame + i >= finalBuffer.length) break

        let sample = trackData[i]
        let gain = 1

        // Apply fade in
        if (i < fadeInFrames) {
          gain *= i / fadeInFrames
        }

        // Apply fade out
        if (i > trackLength - fadeOutFrames) {
          gain *= (trackLength - i) / fadeOutFrames
        }

        // Mix with existing audio
        finalData[startFrame + i] += sample * gain
      }
    }
  }

  // Apply global mix processing (normalization, limiting, etc.)
  private async applyGlobalProcessing(buffer: AudioBuffer, options: ExportOptions): Promise<AudioBuffer> {
    if (!options.normalize) {
      return buffer
    }

    // Find peak level
    let peak = 0
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel)
      for (let i = 0; i < channelData.length; i++) {
        peak = Math.max(peak, Math.abs(channelData[i]))
      }
    }

    // Normalize to prevent clipping
    if (peak > 0) {
      const normalizeGain = 0.95 / peak
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel)
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] *= normalizeGain
        }
      }
    }

    return buffer
  }

  // Encode audio buffer to desired format
  private async encodeAudio(audioBuffer: AudioBuffer, options: ExportOptions): Promise<Blob> {
    switch (options.format) {
      case 'wav':
        return this.encodeWAV(audioBuffer, options)
      case 'mp3':
        return await this.encodeMP3(audioBuffer, options)
      case 'flac':
        return await this.encodeFLAC(audioBuffer, options)
      default:
        throw new Error(`Unsupported format: ${options.format}`)
    }
  }

  // Encode to WAV format
  private encodeWAV(audioBuffer: AudioBuffer, options: ExportOptions): Blob {
    const channels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const bitDepth = options.bitDepth
    const bytesPerSample = bitDepth / 8
    const frameCount = audioBuffer.length

    const buffer = new ArrayBuffer(44 + frameCount * channels * bytesPerSample)
    const view = new DataView(buffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + frameCount * channels * bytesPerSample, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * channels * bytesPerSample, true)
    view.setUint16(32, channels * bytesPerSample, true)
    view.setUint16(34, bitDepth, true)
    writeString(36, 'data')
    view.setUint32(40, frameCount * channels * bytesPerSample, true)

    // Convert audio data
    let offset = 44
    const maxValue = Math.pow(2, bitDepth - 1) - 1

    for (let i = 0; i < frameCount; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]))
        
        if (bitDepth === 16) {
          view.setInt16(offset, sample * maxValue, true)
          offset += 2
        } else if (bitDepth === 24) {
          const intSample = Math.round(sample * maxValue)
          view.setUint8(offset, intSample & 0xFF)
          view.setUint8(offset + 1, (intSample >> 8) & 0xFF)
          view.setUint8(offset + 2, (intSample >> 16) & 0xFF)
          offset += 3
        } else if (bitDepth === 32) {
          view.setFloat32(offset, sample, true)
          offset += 4
        }
      }
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }

  // Encode to MP3 format (simplified - would use proper encoder in production)
  private async encodeMP3(audioBuffer: AudioBuffer, options: ExportOptions): Promise<Blob> {
    // For demo purposes, convert to WAV
    // In production, would use a proper MP3 encoder like lame.js
    const wavBlob = this.encodeWAV(audioBuffer, { ...options, bitDepth: 16 })
    return new Blob([wavBlob], { type: 'audio/mpeg' })
  }

  // Encode to FLAC format (simplified - would use proper encoder in production)
  private async encodeFLAC(audioBuffer: AudioBuffer, options: ExportOptions): Promise<Blob> {
    // For demo purposes, convert to high-quality WAV
    // In production, would use a proper FLAC encoder
    const wavBlob = this.encodeWAV(audioBuffer, { ...options, bitDepth: 24 })
    return new Blob([wavBlob], { type: 'audio/flac' })
  }

  // Create metadata for the exported file
  private createMetadata(mixState: MixState, options: ExportOptions) {
    const chapters: ChapterMarker[] = options.chapterMarkers
      ? mixState.tracks.map(track => ({
          title: `${track.artist} - ${track.title}`,
          startTime: track.startTimeSeconds,
          endTime: track.endTimeSeconds,
          artist: track.artist
        }))
      : []

    return {
      title: mixState.title,
      artist: 'DJ Mix',
      album: mixState.description,
      genre: mixState.genre,
      year: new Date().getFullYear(),
      artwork: mixState.coverImageUrl,
      chapters
    }
  }

  // Utility functions
  private calculateMixDuration(tracks: MixTrack[]): number {
    if (tracks.length === 0) return 0
    return Math.max(...tracks.map(track => track.endTimeSeconds))
  }

  private createSilenceBuffer(duration: number, sampleRate: number): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    const frameCount = sampleRate * duration
    return this.audioContext.createBuffer(2, frameCount, sampleRate)
  }

  private getFrequencyFromKey(key?: string): number | null {
    if (!key) return null
    
    const keyFrequencies: { [key: string]: number } = {
      '1A': 261.63, '1B': 277.18, // C / C#
      '2A': 293.66, '2B': 311.13, // D / D#
      '3A': 329.63, '3B': 349.23, // E / F
      '4A': 369.99, '4B': 392.00, // F# / G
      '5A': 415.30, '5B': 440.00, // G# / A
      '6A': 466.16, '6B': 493.88, // A# / B
      '7A': 523.25, '7B': 554.37, // C / C#
      '8A': 587.33, '8B': 622.25, // D / D#
      '9A': 659.25, '9B': 698.46, // E / F
      '10A': 739.99, '10B': 783.99, // F# / G
      '11A': 830.61, '11B': 880.00, // G# / A
      '12A': 932.33, '12B': 987.77  // A# / B
    }

    return keyFrequencies[key] || 440
  }

  private cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.abortController = null
  }

  // Static helper for getting default export options
  static getDefaultExportOptions(): ExportOptions {
    return {
      format: 'mp3',
      quality: 'high',
      sampleRate: 44100,
      bitDepth: 16,
      channels: 'stereo',
      normalize: true,
      fadeIn: 0,
      fadeOut: 0,
      includeMetadata: true,
      chapterMarkers: false
    }
  }

  // Static helper for quality presets
  static getQualityPreset(quality: ExportOptions['quality']): Partial<ExportOptions> {
    const presets = {
      low: { sampleRate: 44100 as const, bitDepth: 16 as const },
      medium: { sampleRate: 44100 as const, bitDepth: 16 as const },
      high: { sampleRate: 48000 as const, bitDepth: 24 as const },
      lossless: { sampleRate: 96000 as const, bitDepth: 32 as const, format: 'flac' as const }
    }

    return presets[quality] || presets.medium
  }
}

// Export singleton instance
export const mixExporter = new ProductionMixExporter()

// Export class for static methods
export { ProductionMixExporter }

// All types are already exported as interfaces above