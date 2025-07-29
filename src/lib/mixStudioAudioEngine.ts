import { AudioClip, Track, MixProject } from '../types/mixStudio'
import { audioFileDB } from './audioFileDatabase'

interface AudioNode {
  source: AudioBufferSourceNode
  gainNode: GainNode
  startTime: number
  clipId: string
  trackId: string
}

export class MixStudioAudioEngine {
  private audioContext: AudioContext
  private masterGainNode: GainNode
  private trackGainNodes: Map<string, GainNode> = new Map()
  private activeNodes: AudioNode[] = []
  private audioBuffers: Map<string, AudioBuffer> = new Map()
  private startTime: number = 0
  private pauseTime: number = 0
  private isPlaying: boolean = false
  private schedulerInterval: number | null = null
  private lookAheadTime: number = 0.1 // 100ms lookahead
  private scheduleAheadTime: number = 0.1 // Schedule 100ms ahead
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.masterGainNode = this.audioContext.createGain()
    this.masterGainNode.connect(this.audioContext.destination)
  }
  
  async init() {
    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }
  
  // Load audio file into buffer
  async loadAudioSource(sourceId: string): Promise<AudioBuffer | null> {
    // Check cache first
    if (this.audioBuffers.has(sourceId)) {
      return this.audioBuffers.get(sourceId)!
    }
    
    try {
      // Get file URL from IndexedDB
      const fileUrl = await audioFileDB.getFileUrl(sourceId)
      if (!fileUrl) return null
      
      // Fetch and decode audio
      const response = await fetch(fileUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      
      // Cache the buffer
      this.audioBuffers.set(sourceId, audioBuffer)
      
      // Clean up URL
      URL.revokeObjectURL(fileUrl)
      
      return audioBuffer
    } catch (error) {
      console.error('Error loading audio source:', error)
      return null
    }
  }
  
  // Create gain node for track if doesn't exist
  private getTrackGainNode(trackId: string): GainNode {
    if (!this.trackGainNodes.has(trackId)) {
      const gainNode = this.audioContext.createGain()
      gainNode.connect(this.masterGainNode)
      this.trackGainNodes.set(trackId, gainNode)
    }
    return this.trackGainNodes.get(trackId)!
  }
  
  // Schedule a clip to play
  private async scheduleClip(clip: AudioClip, track: Track, when: number) {
    // Skip if clip is not editable (placeholder)
    if (!clip.source.isEditable) return
    
    // Load audio buffer
    const buffer = await this.loadAudioSource(clip.sourceId)
    if (!buffer) return
    
    // Create source node
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    
    // Create and configure gain node for clip
    const clipGainNode = this.audioContext.createGain()
    clipGainNode.gain.value = clip.volume
    
    // Apply fades
    if (clip.fadeIn > 0) {
      clipGainNode.gain.setValueAtTime(0, when)
      clipGainNode.gain.linearRampToValueAtTime(clip.volume, when + clip.fadeIn)
    }
    
    if (clip.fadeOut > 0) {
      const fadeOutStart = when + clip.duration - clip.fadeOut
      clipGainNode.gain.setValueAtTime(clip.volume, fadeOutStart)
      clipGainNode.gain.linearRampToValueAtTime(0, when + clip.duration)
    }
    
    // Connect nodes
    const trackGainNode = this.getTrackGainNode(track.id)
    source.connect(clipGainNode)
    clipGainNode.connect(trackGainNode)
    
    // Calculate playback parameters
    const offset = clip.trimStart
    const duration = clip.duration - clip.trimStart - clip.trimEnd
    
    // Start playback
    source.start(when, offset, duration)
    
    // Store active node reference
    this.activeNodes.push({
      source,
      gainNode: clipGainNode,
      startTime: when,
      clipId: clip.id,
      trackId: track.id
    })
    
    // Schedule cleanup
    source.onended = () => {
      this.activeNodes = this.activeNodes.filter(node => node.clipId !== clip.id)
      clipGainNode.disconnect()
    }
  }
  
  // Main scheduler function
  private scheduler = async () => {
    if (!this.isPlaying) return
    
    const currentTime = this.getCurrentTime()
    const scheduleTime = currentTime + this.scheduleAheadTime
    
    // Schedule clips that should start playing soon
    this.currentProject?.tracks.forEach(track => {
      track.clips.forEach(async clip => {
        const clipStart = clip.startTime
        const clipEnd = clip.startTime + clip.duration
        
        // Check if clip should be scheduled
        if (clipStart >= currentTime && clipStart < scheduleTime) {
          // Check if already scheduled
          const isScheduled = this.activeNodes.some(node => node.clipId === clip.id)
          if (!isScheduled) {
            const when = this.audioContext.currentTime + (clipStart - currentTime)
            await this.scheduleClip(clip, track, when)
          }
        }
      })
    })
  }
  
  // Get current playback time
  getCurrentTime(): number {
    if (this.isPlaying) {
      return this.audioContext.currentTime - this.startTime
    } else {
      return this.pauseTime
    }
  }
  
  // Start playback
  async play(project: MixProject, startFrom: number = 0) {
    if (this.isPlaying) return
    
    await this.init()
    
    this.currentProject = project
    this.isPlaying = true
    this.startTime = this.audioContext.currentTime - startFrom
    
    // Start scheduler
    this.schedulerInterval = window.setInterval(this.scheduler, this.lookAheadTime * 1000)
    
    // Initial schedule
    this.scheduler()
  }
  
  // Pause playback
  pause() {
    if (!this.isPlaying) return
    
    this.isPlaying = false
    this.pauseTime = this.getCurrentTime()
    
    // Stop scheduler
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval)
      this.schedulerInterval = null
    }
    
    // Stop all active nodes
    this.activeNodes.forEach(node => {
      node.source.stop()
      node.gainNode.disconnect()
    })
    this.activeNodes = []
  }
  
  // Stop playback
  stop() {
    this.pause()
    this.pauseTime = 0
  }
  
  // Seek to position
  async seek(time: number) {
    const wasPlaying = this.isPlaying
    
    if (wasPlaying) {
      this.pause()
    }
    
    this.pauseTime = time
    
    if (wasPlaying && this.currentProject) {
      await this.play(this.currentProject, time)
    }
  }
  
  // Update track settings
  updateTrackSettings(trackId: string, volume: number, pan: number, isMuted: boolean, isSolo: boolean) {
    const gainNode = this.getTrackGainNode(trackId)
    
    // Apply solo logic
    const hasSoloTracks = this.currentProject?.tracks.some(t => t.isSolo) || false
    let finalVolume = volume
    
    if (hasSoloTracks) {
      // If there are solo tracks, mute all non-solo tracks
      const track = this.currentProject?.tracks.find(t => t.id === trackId)
      if (track && !track.isSolo) {
        finalVolume = 0
      }
    } else if (isMuted) {
      finalVolume = 0
    }
    
    gainNode.gain.value = finalVolume
  }
  
  // Update master volume
  setMasterVolume(volume: number) {
    this.masterGainNode.gain.value = volume
  }
  
  // Export mix to audio buffer
  async exportMix(project: MixProject): Promise<AudioBuffer> {
    // Create offline context for rendering
    const sampleRate = 44100
    const offlineContext = new OfflineAudioContext(
      2, // stereo
      project.duration * sampleRate,
      sampleRate
    )
    
    // TODO: Implement offline rendering
    // This would involve recreating the entire mix in the offline context
    // and rendering it to a buffer
    
    throw new Error('Export not yet implemented')
  }
  
  // Cleanup
  dispose() {
    this.stop()
    this.audioContext.close()
    this.trackGainNodes.clear()
    this.audioBuffers.clear()
  }
  
  private currentProject: MixProject | null = null
}

// Singleton instance
export const mixStudioAudioEngine = new MixStudioAudioEngine()