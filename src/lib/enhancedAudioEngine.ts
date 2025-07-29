// Enhanced audio engine for advanced playback features
// Provides tempo control, seamless looping, and advanced mixing capabilities

import { AudioEffectsProcessor } from './audioEffects'

export interface EnhancedPlayerState {
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  tempo: number // Playback rate multiplier (0.5 = 50%, 2.0 = 200%)
  volume: number
  isCued: boolean
  cuePoint: number
  loopStart: number | null
  loopEnd: number | null
  isLooping: boolean
}

export interface AudioSource {
  url: string
  type: 'spotify-preview' | 'soundcloud' | 'local' | 'streaming'
  duration?: number
}

export class EnhancedAudioEngine {
  private audioContext: AudioContext
  private audioBuffer: AudioBuffer | null = null
  private sourceNode: AudioBufferSourceNode | null = null
  private audioElement: HTMLAudioElement | null = null
  private mediaSource: MediaElementAudioSourceNode | null = null
  
  // Audio nodes
  private gainNode: GainNode
  private effectsProcessor: AudioEffectsProcessor
  
  // Playback state
  private state: EnhancedPlayerState = {
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    tempo: 1.0,
    volume: 0.75,
    isCued: false,
    cuePoint: 0,
    loopStart: null,
    loopEnd: null,
    isLooping: false
  }
  
  // Timing
  private startTime: number = 0
  private pauseTime: number = 0
  private animationFrameId: number | null = null
  
  // Callbacks
  private onStateChange?: (state: EnhancedPlayerState) => void
  private onTrackEnd?: () => void
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    
    // Create audio nodes
    this.gainNode = audioContext.createGain()
    this.effectsProcessor = new AudioEffectsProcessor(audioContext)
    
    // Connect audio graph
    this.effectsProcessor.connectToOutput(this.gainNode)
    this.gainNode.connect(audioContext.destination)
    
    // Set initial volume
    this.gainNode.gain.value = this.state.volume
  }
  
  // Load audio from various sources
  async loadAudio(source: AudioSource): Promise<void> {
    this.state.isLoading = true
    this.notifyStateChange()
    
    try {
      // Stop current playback
      this.stop()
      
      switch (source.type) {
        case 'spotify-preview':
        case 'soundcloud':
        case 'streaming':
          // For streaming sources, use audio element
          await this.loadStreamingAudio(source.url)
          break
          
        case 'local':
          // For local files, load into buffer for full control
          await this.loadBufferAudio(source.url)
          break
      }
      
      this.state.isLoading = false
      this.state.duration = source.duration || this.getDuration()
      this.notifyStateChange()
      
    } catch (error) {
      console.error('Failed to load audio:', error)
      this.state.isLoading = false
      this.notifyStateChange()
      throw error
    }
  }
  
  // Load streaming audio (Spotify, SoundCloud)
  private async loadStreamingAudio(url: string): Promise<void> {
    // Create audio element
    this.audioElement = document.createElement('audio')
    this.audioElement.crossOrigin = 'anonymous'
    this.audioElement.src = url
    this.audioElement.preload = 'auto'
    
    // Wait for metadata to load
    await new Promise<void>((resolve, reject) => {
      if (!this.audioElement) return reject('No audio element')
      
      this.audioElement.addEventListener('loadedmetadata', () => resolve(), { once: true })
      this.audioElement.addEventListener('error', (e) => reject(e), { once: true })
      
      this.audioElement.load()
    })
    
    // Create media source node
    if (this.audioElement) {
      this.mediaSource = this.audioContext.createMediaElementSource(this.audioElement)
      this.effectsProcessor.connectSource(this.mediaSource)
    }
  }
  
  // Load audio into buffer for full control
  private async loadBufferAudio(url: string): Promise<void> {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
  }
  
  // Play/Resume
  play(): void {
    if (this.state.isPlaying) return
    
    if (this.audioElement) {
      // Streaming playback
      this.audioElement.play()
      this.audioElement.playbackRate = this.state.tempo
    } else if (this.audioBuffer) {
      // Buffer playback with tempo control
      this.playBufferSource()
    }
    
    this.state.isPlaying = true
    this.startTimeTracking()
    this.notifyStateChange()
  }
  
  // Play buffer source with tempo control
  private playBufferSource(): void {
    if (!this.audioBuffer) return
    
    // Create new source node
    this.sourceNode = this.audioContext.createBufferSource()
    this.sourceNode.buffer = this.audioBuffer
    this.sourceNode.playbackRate.value = this.state.tempo
    
    // Connect to effects
    this.effectsProcessor.connectSource(this.sourceNode)
    
    // Handle looping
    if (this.state.isLooping && this.state.loopStart !== null && this.state.loopEnd !== null) {
      this.sourceNode.loop = true
      this.sourceNode.loopStart = this.state.loopStart
      this.sourceNode.loopEnd = this.state.loopEnd
    }
    
    // Handle end of playback
    this.sourceNode.onended = () => {
      if (!this.state.isLooping) {
        this.state.isPlaying = false
        this.notifyStateChange()
        if (this.onTrackEnd) {
          this.onTrackEnd()
        }
      }
    }
    
    // Start playback
    const offset = this.state.currentTime
    this.sourceNode.start(0, offset)
    this.startTime = this.audioContext.currentTime - offset / this.state.tempo
  }
  
  // Pause
  pause(): void {
    if (!this.state.isPlaying) return
    
    if (this.audioElement) {
      this.audioElement.pause()
    } else if (this.sourceNode) {
      this.sourceNode.stop()
      this.sourceNode = null
    }
    
    this.state.isPlaying = false
    this.pauseTime = this.state.currentTime
    this.stopTimeTracking()
    this.notifyStateChange()
  }
  
  // Stop
  stop(): void {
    this.pause()
    this.state.currentTime = 0
    this.state.isCued = false
    this.notifyStateChange()
  }
  
  // Cue
  cue(): void {
    this.stop()
    this.state.isCued = true
    this.state.currentTime = this.state.cuePoint
    
    if (this.audioElement) {
      this.audioElement.currentTime = this.state.cuePoint
    }
    
    this.notifyStateChange()
  }
  
  // Set cue point
  setCuePoint(time: number): void {
    this.state.cuePoint = Math.max(0, Math.min(time, this.state.duration))
    this.notifyStateChange()
  }
  
  // Seek
  seek(time: number): void {
    const clampedTime = Math.max(0, Math.min(time, this.state.duration))
    this.state.currentTime = clampedTime
    
    if (this.audioElement) {
      this.audioElement.currentTime = clampedTime
    } else if (this.state.isPlaying && this.sourceNode) {
      // For buffer playback, we need to restart from new position
      this.sourceNode.stop()
      this.playBufferSource()
    }
    
    this.notifyStateChange()
  }
  
  // Set tempo (playback rate)
  setTempo(tempo: number): void {
    // Clamp tempo between 50% and 150%
    this.state.tempo = Math.max(0.5, Math.min(1.5, tempo))
    
    if (this.audioElement) {
      this.audioElement.playbackRate = this.state.tempo
    } else if (this.sourceNode) {
      this.sourceNode.playbackRate.value = this.state.tempo
    }
    
    // Recalculate start time for accurate position tracking
    if (this.state.isPlaying && !this.audioElement) {
      this.startTime = this.audioContext.currentTime - this.state.currentTime / this.state.tempo
    }
    
    this.notifyStateChange()
  }
  
  // Set volume
  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume))
    this.gainNode.gain.setTargetAtTime(this.state.volume, this.audioContext.currentTime, 0.01)
    this.notifyStateChange()
  }
  
  // Set loop points
  setLoop(start: number | null, end: number | null): void {
    this.state.loopStart = start
    this.state.loopEnd = end
    this.state.isLooping = start !== null && end !== null
    
    if (this.sourceNode && this.audioBuffer) {
      if (this.state.isLooping) {
        this.sourceNode.loop = true
        this.sourceNode.loopStart = start!
        this.sourceNode.loopEnd = end!
      } else {
        this.sourceNode.loop = false
      }
    }
    
    this.notifyStateChange()
  }
  
  // Get effects processor for external control
  getEffectsProcessor(): AudioEffectsProcessor {
    return this.effectsProcessor
  }
  
  // Get current state
  getState(): EnhancedPlayerState {
    return { ...this.state }
  }
  
  // Time tracking
  private startTimeTracking(): void {
    const updateTime = () => {
      if (!this.state.isPlaying) return
      
      if (this.audioElement) {
        this.state.currentTime = this.audioElement.currentTime
      } else {
        const elapsed = (this.audioContext.currentTime - this.startTime) * this.state.tempo
        this.state.currentTime = Math.min(elapsed, this.state.duration)
      }
      
      this.notifyStateChange()
      this.animationFrameId = requestAnimationFrame(updateTime)
    }
    
    updateTime()
  }
  
  private stopTimeTracking(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }
  
  // Get duration
  private getDuration(): number {
    if (this.audioElement) {
      return this.audioElement.duration || 0
    } else if (this.audioBuffer) {
      return this.audioBuffer.duration || 0
    }
    return 0
  }
  
  // State change notification
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState())
    }
  }
  
  // Set state change callback
  onStateChanged(callback: (state: EnhancedPlayerState) => void): void {
    this.onStateChange = callback
  }
  
  // Set track end callback
  onTrackEnded(callback: () => void): void {
    this.onTrackEnd = callback
  }
  
  // Cleanup
  disconnect(): void {
    this.stop()
    this.stopTimeTracking()
    
    if (this.mediaSource) {
      this.mediaSource.disconnect()
    }
    
    this.effectsProcessor.disconnect()
    this.gainNode.disconnect()
    
    if (this.audioElement) {
      this.audioElement.src = ''
      this.audioElement = null
    }
  }
}