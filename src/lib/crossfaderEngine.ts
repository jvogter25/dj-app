// Crossfader and transition engine for DJ mixing
// Handles smooth transitions between decks with various curve types

export type CrossfaderCurve = 'linear' | 'smooth' | 'sharp' | 'cut'
export type TransitionType = 'cut' | 'fade' | 'bassSwap' | 'echo' | 'spinback' | 'backspin'

export interface CrossfaderSettings {
  curve: CrossfaderCurve
  cutLag: number // 0-10ms for cut lag simulation
}

export class CrossfaderEngine {
  private audioContext: AudioContext
  private deckAGain: GainNode
  private deckBGain: GainNode
  private channelAGain: GainNode
  private channelBGain: GainNode
  private masterGain: GainNode
  
  // Transition effect nodes
  private transitionFilter: BiquadFilterNode
  private transitionDelay: DelayNode
  private transitionFeedback: GainNode
  
  // Current state
  private crossfaderPosition: number = 0 // -50 to 50
  private channelAVolume: number = 100 // 0 to 100
  private channelBVolume: number = 100 // 0 to 100
  private settings: CrossfaderSettings = {
    curve: 'smooth',
    cutLag: 2
  }
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    
    // Create gain nodes for mixing
    this.deckAGain = audioContext.createGain()
    this.deckBGain = audioContext.createGain()
    this.channelAGain = audioContext.createGain()
    this.channelBGain = audioContext.createGain()
    this.masterGain = audioContext.createGain()
    
    // Create transition effect nodes
    this.transitionFilter = audioContext.createBiquadFilter()
    this.transitionFilter.type = 'lowpass'
    this.transitionFilter.frequency.value = 20000
    
    this.transitionDelay = audioContext.createDelay(2.0)
    this.transitionDelay.delayTime.value = 0
    
    this.transitionFeedback = audioContext.createGain()
    this.transitionFeedback.gain.value = 0
    
    // Set initial gains
    this.updateCrossfaderGains()
    this.updateChannelGains()
    
    // Connect audio graph
    this.connectNodes()
  }
  
  private connectNodes() {
    // Deck A path: deckAGain -> channelAGain -> masterGain
    this.deckAGain.connect(this.channelAGain)
    this.channelAGain.connect(this.masterGain)
    
    // Deck B path: deckBGain -> channelBGain -> masterGain
    this.deckBGain.connect(this.channelBGain)
    this.channelBGain.connect(this.masterGain)
    
    // Transition effects (parallel path)
    this.channelAGain.connect(this.transitionFilter)
    this.channelBGain.connect(this.transitionFilter)
    this.transitionFilter.connect(this.transitionDelay)
    this.transitionDelay.connect(this.transitionFeedback)
    this.transitionFeedback.connect(this.transitionDelay)
    // Don't connect to master yet - will be used during transitions
  }
  
  // Connect deck audio sources
  connectDeckA(source: AudioNode) {
    source.connect(this.deckAGain)
  }
  
  connectDeckB(source: AudioNode) {
    source.connect(this.deckBGain)
  }
  
  // Connect to output
  connectToOutput(destination: AudioNode) {
    this.masterGain.connect(destination)
  }
  
  // Update crossfader position
  setCrossfaderPosition(position: number) {
    this.crossfaderPosition = Math.max(-50, Math.min(50, position))
    this.updateCrossfaderGains()
  }
  
  // Update channel volumes
  setChannelVolume(channel: 'A' | 'B', volume: number) {
    if (channel === 'A') {
      this.channelAVolume = Math.max(0, Math.min(100, volume))
    } else {
      this.channelBVolume = Math.max(0, Math.min(100, volume))
    }
    this.updateChannelGains()
  }
  
  // Set crossfader curve
  setCrossfaderCurve(curve: CrossfaderCurve) {
    this.settings.curve = curve
    this.updateCrossfaderGains()
  }
  
  // Calculate gain based on crossfader curve
  private calculateCrossfaderGain(position: number, deck: 'A' | 'B'): number {
    // Normalize position to 0-1 range
    const normalizedPos = (position + 50) / 100
    
    let gainA = 0
    let gainB = 0
    
    switch (this.settings.curve) {
      case 'linear':
        gainA = 1 - normalizedPos
        gainB = normalizedPos
        break
        
      case 'smooth':
        // S-curve for smooth transitions
        gainA = Math.cos(normalizedPos * Math.PI / 2)
        gainB = Math.sin(normalizedPos * Math.PI / 2)
        break
        
      case 'sharp':
        // Sharp curve - quick cutoff at edges
        if (normalizedPos < 0.2) {
          gainA = 1
          gainB = normalizedPos * 5
        } else if (normalizedPos > 0.8) {
          gainA = (1 - normalizedPos) * 5
          gainB = 1
        } else {
          gainA = 1
          gainB = 1
        }
        break
        
      case 'cut':
        // Scratch/cut curve - very sharp
        if (normalizedPos < 0.1) {
          gainA = 1
          gainB = 0
        } else if (normalizedPos > 0.9) {
          gainA = 0
          gainB = 1
        } else {
          gainA = 1
          gainB = 1
        }
        break
    }
    
    return deck === 'A' ? gainA : gainB
  }
  
  // Update crossfader gains
  private updateCrossfaderGains() {
    const gainA = this.calculateCrossfaderGain(this.crossfaderPosition, 'A')
    const gainB = this.calculateCrossfaderGain(this.crossfaderPosition, 'B')
    
    // Apply cut lag for scratch performances
    const lag = this.settings.cutLag / 1000
    
    this.deckAGain.gain.setTargetAtTime(gainA, this.audioContext.currentTime, lag)
    this.deckBGain.gain.setTargetAtTime(gainB, this.audioContext.currentTime, lag)
  }
  
  // Update channel gains
  private updateChannelGains() {
    this.channelAGain.gain.setTargetAtTime(
      this.channelAVolume / 100,
      this.audioContext.currentTime,
      0.01
    )
    this.channelBGain.gain.setTargetAtTime(
      this.channelBVolume / 100,
      this.audioContext.currentTime,
      0.01
    )
  }
  
  // Perform automated transitions
  async performTransition(type: TransitionType, duration: number = 4): Promise<void> {
    const startPosition = this.crossfaderPosition
    const endPosition = startPosition > 0 ? -50 : 50
    const startTime = this.audioContext.currentTime
    
    switch (type) {
      case 'cut':
        // Instant cut
        this.setCrossfaderPosition(endPosition)
        break
        
      case 'fade':
        // Smooth fade
        await this.animateCrossfader(startPosition, endPosition, duration)
        break
        
      case 'bassSwap':
        // Swap bass frequencies first, then mids/highs
        await this.performBassSwap(startPosition, endPosition, duration)
        break
        
      case 'echo':
        // Add echo effect during transition
        await this.performEchoTransition(startPosition, endPosition, duration)
        break
        
      case 'spinback':
        // Simulate vinyl spinback
        await this.performSpinback(startPosition < 0 ? 'A' : 'B', duration)
        break
        
      case 'backspin':
        // Quick backspin scratch
        await this.performBackspin(startPosition < 0 ? 'A' : 'B')
        break
    }
  }
  
  // Animate crossfader position
  private async animateCrossfader(start: number, end: number, duration: number): Promise<void> {
    const steps = 60 // 60fps animation
    const stepDuration = duration * 1000 / steps
    const stepSize = (end - start) / steps
    
    for (let i = 0; i <= steps; i++) {
      const position = start + (stepSize * i)
      this.setCrossfaderPosition(position)
      await new Promise(resolve => setTimeout(resolve, stepDuration))
    }
  }
  
  // Bass swap transition
  private async performBassSwap(start: number, end: number, duration: number): Promise<void> {
    // This would integrate with the EQ controls to swap bass frequencies
    // For now, just do a regular fade with filter automation
    
    // Start filtering highs on outgoing deck
    this.transitionFilter.frequency.setValueAtTime(20000, this.audioContext.currentTime)
    this.transitionFilter.frequency.linearRampToValueAtTime(200, this.audioContext.currentTime + duration / 2)
    
    // Animate crossfader
    await this.animateCrossfader(start, end, duration)
    
    // Reset filter
    this.transitionFilter.frequency.setValueAtTime(20000, this.audioContext.currentTime)
  }
  
  // Echo transition
  private async performEchoTransition(start: number, end: number, duration: number): Promise<void> {
    // Enable echo effect
    this.transitionDelay.delayTime.setValueAtTime(0.375, this.audioContext.currentTime) // 3/8 beat delay
    this.transitionFeedback.gain.setValueAtTime(0.6, this.audioContext.currentTime)
    
    // Connect delay to output
    this.transitionFeedback.connect(this.masterGain)
    
    // Animate crossfader
    await this.animateCrossfader(start, end, duration)
    
    // Fade out echo
    this.transitionFeedback.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 2)
    
    // Disconnect after fade
    setTimeout(() => {
      this.transitionFeedback.disconnect(this.masterGain)
    }, 2000)
  }
  
  // Spinback effect
  private async performSpinback(deck: 'A' | 'B', duration: number): Promise<void> {
    // This would integrate with the deck's playback rate control
    // Simulating vinyl stopping effect
    console.log(`Performing spinback on deck ${deck} for ${duration}s`)
    
    // For now, just fade out with filter
    const deckGain = deck === 'A' ? this.deckAGain : this.deckBGain
    
    // Ramp down pitch and volume
    deckGain.gain.setValueAtTime(deckGain.gain.value, this.audioContext.currentTime)
    deckGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration)
    
    // Move crossfader to other deck
    const endPosition = deck === 'A' ? 50 : -50
    await this.animateCrossfader(this.crossfaderPosition, endPosition, duration)
    
    // Reset deck gain
    deckGain.gain.setValueAtTime(1, this.audioContext.currentTime)
  }
  
  // Backspin scratch effect
  private async performBackspin(deck: 'A' | 'B'): Promise<void> {
    // Quick scratch effect
    const originalPosition = this.crossfaderPosition
    
    // Simulate scratch pattern
    const scratchPattern = [
      { pos: originalPosition, time: 0 },
      { pos: deck === 'A' ? -50 : 50, time: 50 },
      { pos: deck === 'A' ? 50 : -50, time: 100 },
      { pos: deck === 'A' ? -50 : 50, time: 150 },
      { pos: originalPosition, time: 200 }
    ]
    
    for (const { pos, time } of scratchPattern) {
      setTimeout(() => {
        this.setCrossfaderPosition(pos)
      }, time)
    }
    
    // Wait for scratch to complete
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  
  // Get current mix levels for visualization
  getMixLevels(): { deckA: number, deckB: number } {
    const gainA = this.calculateCrossfaderGain(this.crossfaderPosition, 'A')
    const gainB = this.calculateCrossfaderGain(this.crossfaderPosition, 'B')
    
    return {
      deckA: gainA * (this.channelAVolume / 100),
      deckB: gainB * (this.channelBVolume / 100)
    }
  }
  
  // Disconnect and cleanup
  disconnect() {
    this.deckAGain.disconnect()
    this.deckBGain.disconnect()
    this.channelAGain.disconnect()
    this.channelBGain.disconnect()
    this.masterGain.disconnect()
    this.transitionFilter.disconnect()
    this.transitionDelay.disconnect()
    this.transitionFeedback.disconnect()
  }
}