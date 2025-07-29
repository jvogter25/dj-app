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

export interface EffectsSettings {
  reverb: number     // 0-100 wet percentage
  delay: number      // 0-100 wet percentage  
  filter: number     // -100 to 100 (lowpass to highpass)
  bitcrush: number   // 0-100 effect amount
  phaser: number     // 0-100 effect amount
  flanger: number    // 0-100 effect amount
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
  private reverbWet: GainNode
  private reverbDry: GainNode
  private delayNode: DelayNode
  private delayFeedback: GainNode
  private delayWet: GainNode
  
  // Bitcrusher effect
  private bitcrusherWorklet: AudioWorkletNode | null = null
  private bitcrusherWet: GainNode
  private bitcrusherDry: GainNode
  
  // Phaser effect nodes
  private phaserLFO: OscillatorNode
  private phaserDepth: GainNode
  private phaserFilters: BiquadFilterNode[] = []
  private phaserWet: GainNode
  
  // Flanger effect nodes  
  private flangerDelay: DelayNode
  private flangerLFO: OscillatorNode
  private flangerDepth: GainNode
  private flangerFeedback: GainNode
  private flangerWet: GainNode
  
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
    
    // Create reverb effect
    this.reverbWet = audioContext.createGain()
    this.reverbWet.gain.value = 0
    this.reverbDry = audioContext.createGain()
    this.reverbDry.gain.value = 1
    this.initializeReverb()
    
    // Create delay effect
    this.delayNode = audioContext.createDelay(2.0) // Max 2 seconds
    this.delayNode.delayTime.value = 0.5
    
    this.delayFeedback = audioContext.createGain()
    this.delayFeedback.gain.value = 0.3
    
    this.delayWet = audioContext.createGain()
    this.delayWet.gain.value = 0
    
    // Create bitcrusher effect
    this.bitcrusherWet = audioContext.createGain()
    this.bitcrusherWet.gain.value = 0
    this.bitcrusherDry = audioContext.createGain()
    this.bitcrusherDry.gain.value = 1
    
    // Create phaser effect
    this.phaserLFO = audioContext.createOscillator()
    this.phaserLFO.frequency.value = 0.5 // Hz
    this.phaserLFO.start()
    
    this.phaserDepth = audioContext.createGain()
    this.phaserDepth.gain.value = 1000 // Hz range
    
    this.phaserWet = audioContext.createGain()
    this.phaserWet.gain.value = 0
    
    // Create 4 allpass filters for phaser
    for (let i = 0; i < 4; i++) {
      const filter = audioContext.createBiquadFilter()
      filter.type = 'allpass'
      filter.frequency.value = 200 + i * 500
      this.phaserFilters.push(filter)
    }
    
    // Create flanger effect
    this.flangerDelay = audioContext.createDelay(0.02) // 20ms max
    this.flangerDelay.delayTime.value = 0.005 // 5ms
    
    this.flangerLFO = audioContext.createOscillator()
    this.flangerLFO.frequency.value = 0.2 // Hz
    this.flangerLFO.start()
    
    this.flangerDepth = audioContext.createGain()
    this.flangerDepth.gain.value = 0.002 // 2ms variation
    
    this.flangerFeedback = audioContext.createGain()
    this.flangerFeedback.gain.value = 0.5
    
    this.flangerWet = audioContext.createGain()
    this.flangerWet.gain.value = 0
    
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
  
  // Initialize reverb with impulse response
  private async initializeReverb() {
    try {
      // Create artificial reverb impulse response
      const length = this.audioContext.sampleRate * 2 // 2 second reverb
      const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate)
      
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel)
        
        for (let i = 0; i < length; i++) {
          // Exponential decay with random noise
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2)
        }
      }
      
      this.reverbNode = this.audioContext.createConvolver()
      this.reverbNode.buffer = impulse
    } catch (error) {
      console.error('Failed to initialize reverb:', error)
    }
  }
  
  private connectNodes() {
    // Main signal chain: Input -> Filters -> EQ
    this.inputNode.connect(this.highpassFilter)
    this.highpassFilter.connect(this.lowpassFilter)
    this.lowpassFilter.connect(this.lowShelf)
    this.lowShelf.connect(this.midPeaking)
    this.midPeaking.connect(this.highShelf)
    
    // Split for dry and effects processing
    const postEQ = this.highShelf
    
    // Dry signal path
    postEQ.connect(this.reverbDry)
    this.reverbDry.connect(this.compressor)
    
    // Reverb effect (parallel)
    if (this.reverbNode) {
      postEQ.connect(this.reverbNode)
      this.reverbNode.connect(this.reverbWet)
      this.reverbWet.connect(this.compressor)
    }
    
    // Delay effect (parallel)
    postEQ.connect(this.delayNode)
    this.delayNode.connect(this.delayFeedback)
    this.delayFeedback.connect(this.delayNode) // Feedback loop
    this.delayNode.connect(this.delayWet)
    this.delayWet.connect(this.compressor)
    
    // Phaser effect (serial through filters)
    postEQ.connect(this.phaserFilters[0])
    for (let i = 0; i < this.phaserFilters.length - 1; i++) {
      this.phaserFilters[i].connect(this.phaserFilters[i + 1])
    }
    this.phaserFilters[this.phaserFilters.length - 1].connect(this.phaserWet)
    this.phaserWet.connect(this.compressor)
    
    // Connect phaser LFO
    this.phaserLFO.connect(this.phaserDepth)
    this.phaserFilters.forEach(filter => {
      this.phaserDepth.connect(filter.frequency)
    })
    
    // Flanger effect
    postEQ.connect(this.flangerDelay)
    this.flangerDelay.connect(this.flangerFeedback)
    this.flangerFeedback.connect(this.flangerDelay)
    this.flangerDelay.connect(this.flangerWet)
    this.flangerWet.connect(this.compressor)
    
    // Connect flanger LFO
    this.flangerLFO.connect(this.flangerDepth)
    this.flangerDepth.connect(this.flangerDelay.delayTime)
    
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
  
  // Reverb effect controls
  setReverbMix(wetAmount: number) {
    // 0 = dry, 100 = fully wet
    const wetGain = wetAmount / 100
    const dryGain = 1 - wetGain
    
    this.reverbWet.gain.setTargetAtTime(wetGain, this.audioContext.currentTime, 0.01)
    this.reverbDry.gain.setTargetAtTime(dryGain, this.audioContext.currentTime, 0.01)
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
    // 0 = dry, 100 = fully wet
    const wetGain = wetAmount / 100
    this.delayWet.gain.setTargetAtTime(wetGain, this.audioContext.currentTime, 0.01)
  }
  
  // Phaser effect controls
  setPhaserRate(rate: number) {
    // 0.1 to 10 Hz
    this.phaserLFO.frequency.setTargetAtTime(rate, this.audioContext.currentTime, 0.01)
  }
  
  setPhaserDepth(depth: number) {
    // 0 to 2000 Hz sweep range
    this.phaserDepth.gain.setTargetAtTime(depth, this.audioContext.currentTime, 0.01)
  }
  
  setPhaserMix(wetAmount: number) {
    // 0 = dry, 100 = fully wet
    const wetGain = wetAmount / 100
    this.phaserWet.gain.setTargetAtTime(wetGain, this.audioContext.currentTime, 0.01)
  }
  
  // Flanger effect controls
  setFlangerRate(rate: number) {
    // 0.1 to 5 Hz
    this.flangerLFO.frequency.setTargetAtTime(rate, this.audioContext.currentTime, 0.01)
  }
  
  setFlangerDepth(depth: number) {
    // 0 to 0.005 seconds variation
    const depthInSeconds = depth * 0.005 / 100
    this.flangerDepth.gain.setTargetAtTime(depthInSeconds, this.audioContext.currentTime, 0.01)
  }
  
  setFlangerFeedback(amount: number) {
    // 0 to 0.95
    const clamped = Math.max(0, Math.min(0.95, amount / 100))
    this.flangerFeedback.gain.setTargetAtTime(clamped, this.audioContext.currentTime, 0.01)
  }
  
  setFlangerMix(wetAmount: number) {
    // 0 = dry, 100 = fully wet
    const wetGain = wetAmount / 100
    this.flangerWet.gain.setTargetAtTime(wetGain, this.audioContext.currentTime, 0.01)
  }
  
  // Set all effects at once
  setEffects(effects: EffectsSettings) {
    this.setReverbMix(effects.reverb)
    this.setDelayMix(effects.delay)
    this.setPhaserMix(effects.phaser)
    this.setFlangerMix(effects.flanger)
    
    // Filter control (-100 to 100)
    if (effects.filter !== 0) {
      if (effects.filter < 0) {
        // Lowpass
        const freq = 20000 * Math.pow(10, effects.filter / 100)
        this.lowpassFilter.frequency.setTargetAtTime(freq, this.audioContext.currentTime, 0.01)
        this.highpassFilter.frequency.setTargetAtTime(20, this.audioContext.currentTime, 0.01)
      } else {
        // Highpass
        const freq = 20 * Math.pow(10, effects.filter / 50)
        this.highpassFilter.frequency.setTargetAtTime(freq, this.audioContext.currentTime, 0.01)
        this.lowpassFilter.frequency.setTargetAtTime(20000, this.audioContext.currentTime, 0.01)
      }
    } else {
      // Neutral
      this.highpassFilter.frequency.setTargetAtTime(20, this.audioContext.currentTime, 0.01)
      this.lowpassFilter.frequency.setTargetAtTime(20000, this.audioContext.currentTime, 0.01)
    }
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
    this.setEffects({
      reverb: 0,
      delay: 0,
      filter: 0,
      bitcrush: 0,
      phaser: 0,
      flanger: 0
    })
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
    // Stop oscillators
    this.phaserLFO.stop()
    this.flangerLFO.stop()
    
    // Disconnect all nodes
    this.inputNode.disconnect()
    this.outputNode.disconnect()
    this.lowShelf.disconnect()
    this.midPeaking.disconnect()
    this.highShelf.disconnect()
    this.highpassFilter.disconnect()
    this.lowpassFilter.disconnect()
    
    // Disconnect effects
    if (this.reverbNode) this.reverbNode.disconnect()
    this.reverbWet.disconnect()
    this.reverbDry.disconnect()
    
    this.delayNode.disconnect()
    this.delayFeedback.disconnect()
    this.delayWet.disconnect()
    
    this.phaserFilters.forEach(filter => filter.disconnect())
    this.phaserLFO.disconnect()
    this.phaserDepth.disconnect()
    this.phaserWet.disconnect()
    
    this.flangerDelay.disconnect()
    this.flangerLFO.disconnect()
    this.flangerDepth.disconnect()
    this.flangerFeedback.disconnect()
    this.flangerWet.disconnect()
    
    this.compressor.disconnect()
  }
}