// Loop capture and playback functionality for DJ mixing
// Provides loop recording, storage, and seamless playback

export interface Loop {
  id: string
  deckId: 'A' | 'B'
  startTime: number  // in seconds
  endTime: number    // in seconds
  duration: number   // in seconds
  bpm?: number
  audioBuffer?: AudioBuffer
  waveform?: Float32Array
}

export class LoopCaptureEngine {
  private audioContext: AudioContext
  private loops: Map<string, Loop> = new Map()
  private activeLoops: Map<string, { 
    source: AudioBufferSourceNode
    startedAt: number
    pausedAt: number
  }> = new Map()
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
  }
  
  // Capture a loop from the current audio stream
  async captureLoop(
    audioBuffer: AudioBuffer,
    startTime: number,
    endTime: number,
    deckId: 'A' | 'B'
  ): Promise<Loop> {
    // Calculate sample positions
    const sampleRate = audioBuffer.sampleRate
    const startSample = Math.floor(startTime * sampleRate)
    const endSample = Math.floor(endTime * sampleRate)
    const duration = endTime - startTime
    const sampleCount = endSample - startSample
    
    // Create new buffer for the loop
    const loopBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      sampleCount,
      sampleRate
    )
    
    // Copy audio data
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel)
      const loopData = loopBuffer.getChannelData(channel)
      
      for (let i = 0; i < sampleCount; i++) {
        if (startSample + i < sourceData.length) {
          loopData[i] = sourceData[startSample + i]
        }
      }
    }
    
    // Generate waveform data for visualization
    const waveform = this.generateLoopWaveform(loopBuffer)
    
    // Create loop object
    const loop: Loop = {
      id: `loop-${Date.now()}-${deckId}`,
      deckId,
      startTime,
      endTime,
      duration,
      audioBuffer: loopBuffer,
      waveform
    }
    
    // Store the loop
    this.loops.set(loop.id, loop)
    
    return loop
  }
  
  // Generate waveform data for visualization
  private generateLoopWaveform(audioBuffer: AudioBuffer): Float32Array {
    const data = audioBuffer.getChannelData(0)
    const samples = 200 // Number of waveform points
    const blockSize = Math.floor(data.length / samples)
    const waveform = new Float32Array(samples)
    
    for (let i = 0; i < samples; i++) {
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        const idx = i * blockSize + j
        if (idx < data.length) {
          sum += Math.abs(data[idx])
        }
      }
      waveform[i] = sum / blockSize
    }
    
    return waveform
  }
  
  // Start playing a loop
  playLoop(
    loopId: string,
    outputNode: AudioNode,
    loop: boolean = true
  ): AudioBufferSourceNode | null {
    const loopData = this.loops.get(loopId)
    if (!loopData || !loopData.audioBuffer) {
      console.error('Loop not found:', loopId)
      return null
    }
    
    // Stop any existing playback
    this.stopLoop(loopId)
    
    // Create buffer source
    const source = this.audioContext.createBufferSource()
    source.buffer = loopData.audioBuffer
    source.loop = loop
    
    // Connect to output
    source.connect(outputNode)
    
    // Start playback
    source.start(0)
    
    // Store active loop info
    this.activeLoops.set(loopId, {
      source,
      startedAt: this.audioContext.currentTime,
      pausedAt: 0
    })
    
    // Handle loop end if not looping
    if (!loop) {
      source.onended = () => {
        this.activeLoops.delete(loopId)
      }
    }
    
    return source
  }
  
  // Stop a playing loop
  stopLoop(loopId: string) {
    const active = this.activeLoops.get(loopId)
    if (active) {
      active.source.stop()
      active.source.disconnect()
      this.activeLoops.delete(loopId)
    }
  }
  
  // Pause a loop
  pauseLoop(loopId: string) {
    const active = this.activeLoops.get(loopId)
    if (active && active.pausedAt === 0) {
      active.source.stop()
      active.pausedAt = this.audioContext.currentTime
      // We'll need to recreate the source when resuming
    }
  }
  
  // Resume a paused loop
  resumeLoop(loopId: string, outputNode: AudioNode) {
    const active = this.activeLoops.get(loopId)
    const loopData = this.loops.get(loopId)
    
    if (active && active.pausedAt > 0 && loopData && loopData.audioBuffer) {
      const elapsed = active.pausedAt - active.startedAt
      const offset = elapsed % loopData.duration
      
      // Create new source
      const source = this.audioContext.createBufferSource()
      source.buffer = loopData.audioBuffer
      source.loop = true
      source.connect(outputNode)
      source.start(0, offset)
      
      // Update active loop info
      this.activeLoops.set(loopId, {
        source,
        startedAt: this.audioContext.currentTime - offset,
        pausedAt: 0
      })
    }
  }
  
  // Get all loops for a deck
  getLoopsForDeck(deckId: 'A' | 'B'): Loop[] {
    return Array.from(this.loops.values()).filter(loop => loop.deckId === deckId)
  }
  
  // Delete a loop
  deleteLoop(loopId: string) {
    this.stopLoop(loopId)
    this.loops.delete(loopId)
  }
  
  // Export loop as WAV
  async exportLoopAsWAV(loopId: string): Promise<Blob | null> {
    const loop = this.loops.get(loopId)
    if (!loop || !loop.audioBuffer) return null
    
    return this.audioBufferToWAV(loop.audioBuffer)
  }
  
  // Convert AudioBuffer to WAV blob
  private audioBufferToWAV(buffer: AudioBuffer): Blob {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44
    const arrayBuffer = new ArrayBuffer(length)
    const view = new DataView(arrayBuffer)
    const channels: Float32Array[] = []
    let offset = 0
    let pos = 0
    
    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true)
      pos += 2
    }
    
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true)
      pos += 4
    }
    
    // RIFF identifier
    setUint32(0x46464952) // "RIFF"
    setUint32(length - 8) // file length - 8
    setUint32(0x45564157) // "WAVE"
    
    // fmt sub-chunk
    setUint32(0x20746d66) // "fmt "
    setUint32(16) // subchunk size
    setUint16(1) // PCM
    setUint16(buffer.numberOfChannels)
    setUint32(buffer.sampleRate)
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels) // byte rate
    setUint16(buffer.numberOfChannels * 2) // block align
    setUint16(16) // bits per sample
    
    // data sub-chunk
    setUint32(0x61746164) // "data"
    setUint32(length - pos - 4) // subchunk size
    
    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }
    
    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset])) // clamp
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF // scale to 16-bit
        view.setInt16(pos, sample, true)
        pos += 2
      }
      offset++
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }
  
  // Apply trail-off fade to a loop
  applyTrailOff(loopId: string, trailOffSeconds: number) {
    const loop = this.loops.get(loopId)
    if (!loop || !loop.audioBuffer) return
    
    const sampleRate = loop.audioBuffer.sampleRate
    const fadeSamples = Math.floor(trailOffSeconds * sampleRate)
    const startFade = loop.audioBuffer.length - fadeSamples
    
    for (let channel = 0; channel < loop.audioBuffer.numberOfChannels; channel++) {
      const data = loop.audioBuffer.getChannelData(channel)
      
      for (let i = startFade; i < data.length; i++) {
        const fadePosition = (i - startFade) / fadeSamples
        const fadeGain = 1 - fadePosition // Linear fade
        data[i] *= fadeGain
      }
    }
  }
}

// Singleton instance management
let loopCaptureEngine: LoopCaptureEngine | null = null

export function getLoopCaptureEngine(audioContext: AudioContext): LoopCaptureEngine {
  if (!loopCaptureEngine) {
    loopCaptureEngine = new LoopCaptureEngine(audioContext)
  }
  return loopCaptureEngine
}