// Enhanced audio player that supports multiple sources and Web Audio API features
import { soundCloudService } from './soundcloudService'

export type AudioSource = 'spotify' | 'soundcloud' | 'local' | 'youtube'

export interface EnhancedTrack {
  id: string
  source: AudioSource
  name: string
  artist: string
  duration: number
  bpm?: number
  key?: string
  energy?: number
  // Source-specific IDs
  spotifyUri?: string
  soundcloudId?: number
  localFileUrl?: string
  youtubeId?: string
  // Capabilities
  canManipulate: boolean // Can use Web Audio API features
  canExport: boolean // Can be included in recorded mixes
}

export class EnhancedAudioPlayer {
  private audioContext: AudioContext
  private currentSource: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null
  private audioElement: HTMLAudioElement | null = null
  private gainNode: GainNode
  private analyser: AnalyserNode
  
  // EQ nodes
  private lowShelf: BiquadFilterNode
  private midPeaking: BiquadFilterNode
  private highShelf: BiquadFilterNode
  
  // Effects
  private filterNode: BiquadFilterNode
  private delayNode: DelayNode
  private delayGainNode: GainNode
  private reverbNode: ConvolverNode | null = null
  
  // Playback state
  private isPlaying = false
  private startTime = 0
  private pauseTime = 0
  private playbackRate = 1.0
  
  // Current track
  private currentTrack: EnhancedTrack | null = null
  
  // Waveform data
  private waveformData: Float32Array | null = null
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Create audio graph
    this.gainNode = this.audioContext.createGain()
    this.analyser = this.audioContext.createAnalyser()
    
    // EQ setup
    this.lowShelf = this.audioContext.createBiquadFilter()
    this.lowShelf.type = 'lowshelf'
    this.lowShelf.frequency.value = 320
    
    this.midPeaking = this.audioContext.createBiquadFilter()
    this.midPeaking.type = 'peaking'
    this.midPeaking.frequency.value = 1000
    this.midPeaking.Q.value = 0.5
    
    this.highShelf = this.audioContext.createBiquadFilter()
    this.highShelf.type = 'highshelf'
    this.highShelf.frequency.value = 3200
    
    // Effects setup
    this.filterNode = this.audioContext.createBiquadFilter()
    this.filterNode.type = 'lowpass'
    this.filterNode.frequency.value = 20000
    this.filterNode.Q.value = 1
    
    this.delayNode = this.audioContext.createDelay(5)
    this.delayGainNode = this.audioContext.createGain()
    this.delayGainNode.gain.value = 0
    
    // Connect audio graph
    this.connectNodes()
  }
  
  private connectNodes() {
    // Main signal path: source -> EQ -> filter -> gain -> destination
    this.lowShelf.connect(this.midPeaking)
    this.midPeaking.connect(this.highShelf)
    this.highShelf.connect(this.filterNode)
    this.filterNode.connect(this.gainNode)
    this.gainNode.connect(this.analyser)
    this.analyser.connect(this.audioContext.destination)
    
    // Delay effect path (parallel)
    this.filterNode.connect(this.delayNode)
    this.delayNode.connect(this.delayGainNode)
    this.delayGainNode.connect(this.delayNode) // Feedback
    this.delayGainNode.connect(this.audioContext.destination)
  }
  
  async loadTrack(track: EnhancedTrack) {
    this.stop()
    this.currentTrack = track
    
    switch (track.source) {
      case 'soundcloud':
        await this.loadSoundCloudTrack(track)
        break
      case 'local':
        await this.loadLocalTrack(track)
        break
      case 'spotify':
        // Spotify tracks can't be manipulated, use regular player
        console.warn('Spotify tracks cannot use enhanced features')
        break
      default:
        throw new Error(`Unsupported source: ${track.source}`)
    }
  }
  
  private async loadSoundCloudTrack(track: EnhancedTrack) {
    if (!track.soundcloudId) throw new Error('No SoundCloud ID')
    
    const streamUrl = await soundCloudService.getStreamUrl(track.soundcloudId)
    if (!streamUrl) throw new Error('Could not get stream URL')
    
    // Create audio element for streaming
    this.audioElement = new Audio(streamUrl)
    this.audioElement.crossOrigin = 'anonymous'
    
    await new Promise((resolve, reject) => {
      this.audioElement!.addEventListener('canplay', resolve)
      this.audioElement!.addEventListener('error', reject)
    })
    
    // Create source node
    const source = this.audioContext.createMediaElementSource(this.audioElement)
    source.connect(this.lowShelf)
    this.currentSource = source
  }
  
  private async loadLocalTrack(track: EnhancedTrack) {
    if (!track.localFileUrl) throw new Error('No local file URL')
    
    // Fetch and decode audio file
    const response = await fetch(track.localFileUrl)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
    
    // Generate waveform data
    this.generateWaveform(audioBuffer)
    
    // Store buffer for playback
    this.audioBuffer = audioBuffer
  }
  
  private generateWaveform(audioBuffer: AudioBuffer) {
    const channelData = audioBuffer.getChannelData(0)
    const samples = 1000 // Number of waveform points
    const blockSize = Math.floor(channelData.length / samples)
    this.waveformData = new Float32Array(samples)
    
    for (let i = 0; i < samples; i++) {
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j])
      }
      this.waveformData[i] = sum / blockSize
    }
  }
  
  play() {
    if (this.isPlaying) return
    
    if (this.audioElement) {
      this.audioElement.play()
    } else if (this.audioBuffer) {
      const source = this.audioContext.createBufferSource()
      source.buffer = this.audioBuffer
      source.playbackRate.value = this.playbackRate
      source.connect(this.lowShelf)
      
      const offset = this.pauseTime
      source.start(0, offset)
      
      this.currentSource = source
      this.startTime = this.audioContext.currentTime - offset
    }
    
    this.isPlaying = true
  }
  
  pause() {
    if (!this.isPlaying) return
    
    if (this.audioElement) {
      this.audioElement.pause()
    } else if (this.currentSource && this.currentSource instanceof AudioBufferSourceNode) {
      this.currentSource.stop()
      this.pauseTime = this.audioContext.currentTime - this.startTime
    }
    
    this.isPlaying = false
  }
  
  stop() {
    this.pause()
    this.pauseTime = 0
    
    if (this.audioElement) {
      this.audioElement.currentTime = 0
      this.audioElement = null
    }
    
    this.currentSource = null
  }
  
  seek(position: number) {
    const wasPlaying = this.isPlaying
    
    if (this.audioElement) {
      this.audioElement.currentTime = position
    } else {
      this.pause()
      this.pauseTime = position
      if (wasPlaying) {
        this.play()
      }
    }
  }
  
  // Get current position in seconds
  getCurrentTime(): number {
    if (this.audioElement) {
      return this.audioElement.currentTime
    } else if (this.isPlaying) {
      return this.audioContext.currentTime - this.startTime
    } else {
      return this.pauseTime
    }
  }
  
  // Volume control (0-1)
  setVolume(volume: number) {
    this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
  }
  
  // Tempo control (0.5-2.0)
  setTempo(rate: number) {
    this.playbackRate = Math.max(0.5, Math.min(2.0, rate))
    
    if (this.currentSource && this.currentSource instanceof AudioBufferSourceNode) {
      this.currentSource.playbackRate.value = this.playbackRate
    } else if (this.audioElement) {
      this.audioElement.playbackRate = this.playbackRate
    }
  }
  
  // EQ controls (-20 to +20 dB)
  setLowEQ(gain: number) {
    this.lowShelf.gain.value = Math.max(-20, Math.min(20, gain))
  }
  
  setMidEQ(gain: number) {
    this.midPeaking.gain.value = Math.max(-20, Math.min(20, gain))
  }
  
  setHighEQ(gain: number) {
    this.highShelf.gain.value = Math.max(-20, Math.min(20, gain))
  }
  
  // Filter control
  setFilter(frequency: number, resonance: number) {
    this.filterNode.frequency.value = Math.max(20, Math.min(20000, frequency))
    this.filterNode.Q.value = Math.max(0.1, Math.min(30, resonance))
  }
  
  // Delay effect
  setDelay(time: number, feedback: number, mix: number) {
    this.delayNode.delayTime.value = Math.max(0, Math.min(5, time))
    this.delayGainNode.gain.value = Math.max(0, Math.min(0.95, feedback)) * mix
  }
  
  // Get frequency data for visualization
  getFrequencyData(): Uint8Array {
    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteFrequencyData(dataArray)
    return dataArray
  }
  
  // Get waveform data
  getWaveformData(): Float32Array | null {
    return this.waveformData
  }
  
  // Check if current track can be manipulated
  canManipulate(): boolean {
    return this.currentTrack?.canManipulate || false
  }
  
  // Cleanup
  dispose() {
    this.stop()
    this.audioContext.close()
  }
  
  private audioBuffer: AudioBuffer | null = null
}

// Create singleton instances for each deck
export const deckAPlayer = new EnhancedAudioPlayer()
export const deckBPlayer = new EnhancedAudioPlayer()