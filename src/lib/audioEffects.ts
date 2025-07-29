// Audio effects processing using Web Audio API
// Provides EQ, filters, and effects for DJ mixing

export interface EQSettings {
  high: number  // -20 to +20 dB
  mid: number   // -20 to +20 dB
  low: number   // -20 to +20 dB
}

export interface FilterSettings {
  highpass: {
    frequency: number
    resonance: number
    enabled: boolean
  }
  lowpass: {
    frequency: number
    resonance: number
    enabled: boolean
  }
}

export class AudioEffectsProcessor {
  private audioContext: AudioContext
  private inputNode: GainNode
  private outputNode: GainNode
  
  // EQ nodes (3-band)
  private lowShelf: BiquadFilterNode
  private midPeaking: BiquadFilterNode
  private highShelf: BiquadFilterNode
  
  // Filter nodes
  private highpassFilter: BiquadFilterNode
  private lowpassFilter: BiquadFilterNode
  
  // Effects nodes
  private reverbNode: ConvolverNode | null = null
  private delayNode: DelayNode
  private delayFeedback: GainNode
  private delayWet: GainNode
  
  // Compressor for final output
  private compressor: DynamicsCompressorNode
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    
    // Create main input/output nodes
    this.inputNode = audioContext.createGain()
    this.outputNode = audioContext.createGain()
    
    // Create EQ nodes
    this.lowShelf = audioContext.createBiquadFilter()
    this.lowShelf.type = 'lowshelf'
    this.lowShelf.frequency.value = 320 // Hz
    
    this.midPeaking = audioContext.createBiquadFilter()
    this.midPeaking.type = 'peaking'
    this.midPeaking.frequency.value = 1000 // Hz
    this.midPeaking.Q.value = 0.5
    
    this.highShelf = audioContext.createBiquadFilter()
    this.highShelf.type = 'highshelf'
    this.highShelf.frequency.value = 3200 // Hz
    
    // Create filter nodes
    this.highpassFilter = audioContext.createBiquadFilter()
    this.highpassFilter.type = 'highpass'
    this.highpassFilter.frequency.value = 20
    this.highpassFilter.Q.value = 0.7
    
    this.lowpassFilter = audioContext.createBiquadFilter()
    this.lowpassFilter.type = 'lowpass'
    this.lowpassFilter.frequency.value = 20000
    this.lowpassFilter.Q.value = 0.7
    
    // Create delay effect
    this.delayNode = audioContext.createDelay(2.0) // Max 2 seconds
    this.delayNode.delayTime.value = 0.5
    
    this.delayFeedback = audioContext.createGain()
    this.delayFeedback.gain.value = 0.3
    
    this.delayWet = audioContext.createGain()
    this.delayWet.gain.value = 0
    
    // Create compressor
    this.compressor = audioContext.createDynamicsCompressor()
    this.compressor.threshold.value = -24
    this.compressor.knee.value = 30
    this.compressor.ratio.value = 12
    this.compressor.attack.value = 0.003
    this.compressor.release.value = 0.25
    
    // Connect the audio graph
    this.connectNodes()
  }
  
  private connectNodes() {
    // Main signal chain: Input -> Filters -> EQ -> Effects -> Compressor -> Output
    this.inputNode.connect(this.highpassFilter)
    this.highpassFilter.connect(this.lowpassFilter)
    this.lowpassFilter.connect(this.lowShelf)
    this.lowShelf.connect(this.midPeaking)
    this.midPeaking.connect(this.highShelf)
    
    // Dry signal to compressor
    this.highShelf.connect(this.compressor)
    
    // Delay effect (parallel)
    this.highShelf.connect(this.delayNode)
    this.delayNode.connect(this.delayFeedback)
    this.delayFeedback.connect(this.delayNode) // Feedback loop
    this.delayNode.connect(this.delayWet)
    this.delayWet.connect(this.compressor)
    
    // Final output
    this.compressor.connect(this.outputNode)
  }
  
  // Connect audio source
  connectSource(source: AudioNode) {
    source.connect(this.inputNode)
  }
  
  // Connect to destination
  connectToOutput(destination: AudioNode) {
    this.outputNode.connect(destination)
  }
  
  // Update EQ settings
  setEQ(eq: EQSettings) {
    // Convert dB to gain values and apply
    // Low shelf (bass)
    this.lowShelf.gain.setTargetAtTime(eq.low, this.audioContext.currentTime, 0.01)
    
    // Mid peaking
    this.midPeaking.gain.setTargetAtTime(eq.mid, this.audioContext.currentTime, 0.01)
    
    // High shelf (treble)
    this.highShelf.gain.setTargetAtTime(eq.high, this.audioContext.currentTime, 0.01)
  }
  
  // Set individual EQ bands
  setLowEQ(gain: number) {
    this.lowShelf.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01)
  }
  
  setMidEQ(gain: number) {
    this.midPeaking.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01)
  }
  
  setHighEQ(gain: number) {
    this.highShelf.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01)
  }
  
  // Update filter settings
  setFilters(filters: FilterSettings) {
    // Highpass filter
    if (filters.highpass.enabled) {
      this.highpassFilter.frequency.setTargetAtTime(
        filters.highpass.frequency,
        this.audioContext.currentTime,
        0.01
      )
      this.highpassFilter.Q.setTargetAtTime(
        filters.highpass.resonance,
        this.audioContext.currentTime,
        0.01
      )
    } else {
      this.highpassFilter.frequency.setTargetAtTime(20, this.audioContext.currentTime, 0.01)
    }
    
    // Lowpass filter
    if (filters.lowpass.enabled) {
      this.lowpassFilter.frequency.setTargetAtTime(
        filters.lowpass.frequency,
        this.audioContext.currentTime,
        0.01
      )
      this.lowpassFilter.Q.setTargetAtTime(
        filters.lowpass.resonance,
        this.audioContext.currentTime,
        0.01
      )
    } else {
      this.lowpassFilter.frequency.setTargetAtTime(20000, this.audioContext.currentTime, 0.01)
    }
  }
  
  // Delay effect controls
  setDelayTime(seconds: number) {
    this.delayNode.delayTime.setTargetAtTime(seconds, this.audioContext.currentTime, 0.01)
  }
  
  setDelayFeedback(amount: number) {
    // Clamp between 0 and 0.9 to prevent infinite feedback
    const clamped = Math.max(0, Math.min(0.9, amount))
    this.delayFeedback.gain.setTargetAtTime(clamped, this.audioContext.currentTime, 0.01)
  }
  
  setDelayMix(wetAmount: number) {
    // 0 = dry, 1 = wet
    this.delayWet.gain.setTargetAtTime(wetAmount, this.audioContext.currentTime, 0.01)
  }
  
  // Kill switches for DJing
  killLows() {
    this.lowShelf.gain.setTargetAtTime(-40, this.audioContext.currentTime, 0.01)
  }
  
  killMids() {
    this.midPeaking.gain.setTargetAtTime(-40, this.audioContext.currentTime, 0.01)
  }
  
  killHighs() {
    this.highShelf.gain.setTargetAtTime(-40, this.audioContext.currentTime, 0.01)
  }
  
  // Reset all effects
  reset() {
    this.setEQ({ high: 0, mid: 0, low: 0 })
    this.setDelayMix(0)
    this.setFilters({
      highpass: { frequency: 20, resonance: 0.7, enabled: false },
      lowpass: { frequency: 20000, resonance: 0.7, enabled: false }
    })
  }
  
  // Get frequency response for visualization
  getFrequencyResponse(
    frequencies: Float32Array,
    magResponse: Float32Array,
    phaseResponse: Float32Array
  ) {
    // Get combined response of all filters
    this.lowShelf.getFrequencyResponse(frequencies, magResponse, phaseResponse)
    
    const tempMag = new Float32Array(frequencies.length)
    const tempPhase = new Float32Array(frequencies.length)
    
    // Multiply responses together
    this.midPeaking.getFrequencyResponse(frequencies, tempMag, tempPhase)
    for (let i = 0; i < frequencies.length; i++) {
      magResponse[i] *= tempMag[i]
    }
    
    this.highShelf.getFrequencyResponse(frequencies, tempMag, tempPhase)
    for (let i = 0; i < frequencies.length; i++) {
      magResponse[i] *= tempMag[i]
    }
    
    this.highpassFilter.getFrequencyResponse(frequencies, tempMag, tempPhase)
    for (let i = 0; i < frequencies.length; i++) {
      magResponse[i] *= tempMag[i]
    }
    
    this.lowpassFilter.getFrequencyResponse(frequencies, tempMag, tempPhase)
    for (let i = 0; i < frequencies.length; i++) {
      magResponse[i] *= tempMag[i]
    }
  }
  
  // Disconnect and cleanup
  disconnect() {
    this.inputNode.disconnect()
    this.outputNode.disconnect()
    this.lowShelf.disconnect()
    this.midPeaking.disconnect()
    this.highShelf.disconnect()
    this.highpassFilter.disconnect()
    this.lowpassFilter.disconnect()
    this.delayNode.disconnect()
    this.delayFeedback.disconnect()
    this.delayWet.disconnect()
    this.compressor.disconnect()
  }
}