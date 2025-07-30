// Production Real-time Audio Analyzer
// Performs live audio analysis using Web Audio API for real-time feedback

import { SpectralFeatures } from './spectralAnalysis'
import { MoodFeatures } from './moodAnalysis'

export interface RealtimeAnalysisResult {
  timestamp: number
  
  // Spectral features
  spectralCentroid: number
  spectralRolloff: number
  spectralFlux: number
  spectralFlatness: number
  spectralBandEnergy: {
    sub: number      // 20-60 Hz
    bass: number     // 60-250 Hz
    lowMid: number   // 250-500 Hz
    mid: number      // 500-2000 Hz
    highMid: number  // 2000-4000 Hz
    presence: number // 4000-6000 Hz
    brilliance: number // 6000-20000 Hz
  }
  
  // Rhythm features
  rms: number
  peak: number
  zeroCrossingRate: number
  tempo: number
  beatProbability: number
  onsetStrength: number
  
  // Harmonic features
  chromaVector: number[] // 12 pitch classes
  harmonicEnergy: number
  percussiveEnergy: number
  
  // Dynamic features
  loudness: number
  dynamicRange: number
  crestFactor: number
}

export interface RealtimeAnalyzerConfig {
  fftSize: number
  smoothingTimeConstant: number
  minDecibels: number
  maxDecibels: number
  bufferSize: number
  hopSize: number
  sampleRate: number
}

export class ProductionRealtimeAudioAnalyzer {
  private audioContext: AudioContext
  private analyser: AnalyserNode
  private config: RealtimeAnalyzerConfig
  
  // Analysis buffers
  private frequencyData: Float32Array
  private timeData: Float32Array
  private previousSpectrum: Float32Array | null = null
  
  // Rhythm detection
  private beatDetector: BeatDetector
  private onsetDetector: OnsetDetector
  
  // Feature extractors
  private chromaExtractor: ChromaExtractor
  private spectralAnalyzer: SpectralAnalyzer
  
  // Analysis state
  private isAnalyzing = false
  private animationFrameId: number | null = null
  private analysisCallbacks: ((result: RealtimeAnalysisResult) => void)[] = []
  
  constructor(audioContext: AudioContext, config?: Partial<RealtimeAnalyzerConfig>) {
    this.audioContext = audioContext
    
    // Default configuration
    this.config = {
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      minDecibels: -100,
      maxDecibels: -30,
      bufferSize: 4096,
      hopSize: 512,
      sampleRate: audioContext.sampleRate,
      ...config
    }
    
    // Create analyser node
    this.analyser = audioContext.createAnalyser()
    this.analyser.fftSize = this.config.fftSize
    this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant
    this.analyser.minDecibels = this.config.minDecibels
    this.analyser.maxDecibels = this.config.maxDecibels
    
    // Initialize buffers
    const bufferLength = this.analyser.frequencyBinCount
    this.frequencyData = new Float32Array(bufferLength)
    this.timeData = new Float32Array(this.config.fftSize)
    
    // Initialize feature extractors
    this.beatDetector = new BeatDetector(this.config.sampleRate)
    this.onsetDetector = new OnsetDetector(this.config.sampleRate)
    this.chromaExtractor = new ChromaExtractor(this.config.sampleRate, this.config.fftSize)
    this.spectralAnalyzer = new SpectralAnalyzer(this.config.sampleRate)
  }
  
  /**
   * Connect audio source for analysis
   */
  connectSource(source: AudioNode): void {
    source.connect(this.analyser)
  }
  
  /**
   * Disconnect audio source
   */
  disconnectSource(source: AudioNode): void {
    source.disconnect(this.analyser)
  }
  
  /**
   * Start real-time analysis
   */
  startAnalysis(): void {
    if (this.isAnalyzing) return
    
    this.isAnalyzing = true
    this.analyze()
  }
  
  /**
   * Stop real-time analysis
   */
  stopAnalysis(): void {
    this.isAnalyzing = false
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }
  
  /**
   * Add analysis callback
   */
  onAnalysis(callback: (result: RealtimeAnalysisResult) => void): () => void {
    this.analysisCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.analysisCallbacks.indexOf(callback)
      if (index > -1) {
        this.analysisCallbacks.splice(index, 1)
      }
    }
  }
  
  /**
   * Main analysis loop
   */
  private analyze = (): void => {
    if (!this.isAnalyzing) return
    
    // Get frequency and time domain data
    this.analyser.getFloatFrequencyData(this.frequencyData)
    this.analyser.getFloatTimeDomainData(this.timeData)
    
    // Extract features
    const timestamp = performance.now()
    const result = this.extractFeatures(timestamp)
    
    // Notify callbacks
    this.analysisCallbacks.forEach(callback => callback(result))
    
    // Store spectrum for flux calculation
    if (!this.previousSpectrum) {
      this.previousSpectrum = new Float32Array(this.frequencyData.length)
    }
    this.previousSpectrum.set(this.frequencyData)
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.analyze)
  }
  
  /**
   * Extract all features from current frame
   */
  private extractFeatures(timestamp: number): RealtimeAnalysisResult {
    // Spectral features
    const spectralCentroid = this.spectralAnalyzer.getSpectralCentroid(this.frequencyData)
    const spectralRolloff = this.spectralAnalyzer.getSpectralRolloff(this.frequencyData)
    const spectralFlux = this.spectralAnalyzer.getSpectralFlux(this.frequencyData, this.previousSpectrum)
    const spectralFlatness = this.spectralAnalyzer.getSpectralFlatness(this.frequencyData)
    const spectralBandEnergy = this.spectralAnalyzer.getBandEnergy(this.frequencyData)
    
    // Time domain features
    const { rms, peak } = this.calculateAmplitudeFeatures(this.timeData)
    const zeroCrossingRate = this.calculateZeroCrossingRate(this.timeData)
    
    // Rhythm features
    const onsetStrength = this.onsetDetector.detectOnset(this.frequencyData)
    const beatProbability = this.beatDetector.detectBeat(this.timeData, rms)
    const tempo = this.beatDetector.getCurrentTempo()
    
    // Harmonic features
    const chromaVector = this.chromaExtractor.extractChroma(this.frequencyData)
    const { harmonicEnergy, percussiveEnergy } = this.separateHarmonicPercussive(this.frequencyData)
    
    // Loudness and dynamics
    const loudness = this.calculateLoudness(this.frequencyData)
    const dynamicRange = this.calculateDynamicRange(rms, peak)
    const crestFactor = peak / (rms + 1e-10)
    
    return {
      timestamp,
      spectralCentroid,
      spectralRolloff,
      spectralFlux,
      spectralFlatness,
      spectralBandEnergy,
      rms,
      peak,
      zeroCrossingRate,
      tempo,
      beatProbability,
      onsetStrength,
      chromaVector,
      harmonicEnergy,
      percussiveEnergy,
      loudness,
      dynamicRange,
      crestFactor
    }
  }
  
  /**
   * Calculate amplitude features
   */
  private calculateAmplitudeFeatures(timeData: Float32Array): { rms: number; peak: number } {
    let sum = 0
    let peak = 0
    
    for (let i = 0; i < timeData.length; i++) {
      const abs = Math.abs(timeData[i])
      sum += abs * abs
      if (abs > peak) peak = abs
    }
    
    const rms = Math.sqrt(sum / timeData.length)
    
    return { rms, peak }
  }
  
  /**
   * Calculate zero crossing rate
   */
  private calculateZeroCrossingRate(timeData: Float32Array): number {
    let crossings = 0
    
    for (let i = 1; i < timeData.length; i++) {
      if ((timeData[i] >= 0) !== (timeData[i - 1] >= 0)) {
        crossings++
      }
    }
    
    return crossings / timeData.length
  }
  
  /**
   * Calculate perceptual loudness
   */
  private calculateLoudness(frequencyData: Float32Array): number {
    // A-weighting approximation
    const aWeights = this.getAWeightingCurve(frequencyData.length)
    
    let weightedSum = 0
    for (let i = 0; i < frequencyData.length; i++) {
      const linearMagnitude = Math.pow(10, frequencyData[i] / 20)
      weightedSum += linearMagnitude * aWeights[i]
    }
    
    return 20 * Math.log10(weightedSum + 1e-10)
  }
  
  /**
   * Calculate dynamic range
   */
  private calculateDynamicRange(rms: number, peak: number): number {
    const rmsDb = 20 * Math.log10(rms + 1e-10)
    const peakDb = 20 * Math.log10(peak + 1e-10)
    return peakDb - rmsDb
  }
  
  /**
   * Separate harmonic and percussive energy
   */
  private separateHarmonicPercussive(frequencyData: Float32Array): {
    harmonicEnergy: number
    percussiveEnergy: number
  } {
    // Simple median filtering approach
    const medianFiltered = this.medianFilter(frequencyData, 7)
    
    let harmonicEnergy = 0
    let percussiveEnergy = 0
    
    for (let i = 0; i < frequencyData.length; i++) {
      const linear = Math.pow(10, frequencyData[i] / 20)
      const medianLinear = Math.pow(10, medianFiltered[i] / 20)
      
      if (linear > medianLinear * 1.5) {
        percussiveEnergy += linear
      } else {
        harmonicEnergy += linear
      }
    }
    
    return { harmonicEnergy, percussiveEnergy }
  }
  
  /**
   * Get A-weighting curve
   */
  private getAWeightingCurve(length: number): Float32Array {
    const weights = new Float32Array(length)
    const nyquist = this.config.sampleRate / 2
    
    for (let i = 0; i < length; i++) {
      const freq = (i / length) * nyquist
      
      // A-weighting formula
      const f2 = freq * freq
      const f4 = f2 * f2
      const c1 = 12200 * 12200
      const c2 = 20.6 * 20.6
      const c3 = 107.7 * 107.7
      const c4 = 737.9 * 737.9
      
      const num = c1 * f4
      const den = (f2 + c2) * Math.sqrt((f2 + c3) * (f2 + c4)) * (f2 + c1)
      
      weights[i] = num / den
    }
    
    return weights
  }
  
  /**
   * Median filter for harmonic/percussive separation
   */
  private medianFilter(data: Float32Array, windowSize: number): Float32Array {
    const filtered = new Float32Array(data.length)
    const halfWindow = Math.floor(windowSize / 2)
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - halfWindow)
      const end = Math.min(data.length, i + halfWindow + 1)
      
      const window: number[] = []
      for (let j = start; j < end; j++) {
        window.push(data[j])
      }
      
      window.sort((a, b) => a - b)
      filtered[i] = window[Math.floor(window.length / 2)]
    }
    
    return filtered
  }
}

/**
 * Beat detection using onset detection and tempo tracking
 */
class BeatDetector {
  private sampleRate: number
  private beatHistory: number[] = []
  private beatTimestamps: number[] = []
  private currentTempo = 128
  private readonly historySize = 43 // ~1 second at 43 fps
  
  constructor(sampleRate: number) {
    this.sampleRate = sampleRate
  }
  
  detectBeat(timeData: Float32Array, rms: number): number {
    // Add to history
    this.beatHistory.push(rms)
    if (this.beatHistory.length > this.historySize) {
      this.beatHistory.shift()
    }
    
    if (this.beatHistory.length < 10) return 0
    
    // Calculate local average
    const localAvg = this.beatHistory.slice(-10).reduce((a, b) => a + b, 0) / 10
    const threshold = localAvg * 1.3
    
    // Detect beat
    const isBeat = rms > threshold && 
                  rms > this.beatHistory[this.beatHistory.length - 2]
    
    if (isBeat) {
      this.beatTimestamps.push(performance.now())
      this.updateTempo()
      return 1
    }
    
    return 0
  }
  
  private updateTempo(): void {
    if (this.beatTimestamps.length < 4) return
    
    // Keep only recent beats
    const now = performance.now()
    this.beatTimestamps = this.beatTimestamps.filter(t => now - t < 5000)
    
    if (this.beatTimestamps.length < 4) return
    
    // Calculate intervals
    const intervals: number[] = []
    for (let i = 1; i < this.beatTimestamps.length; i++) {
      intervals.push(this.beatTimestamps[i] - this.beatTimestamps[i - 1])
    }
    
    // Find most common interval (simple histogram)
    const histogram = new Map<number, number>()
    intervals.forEach(interval => {
      const rounded = Math.round(interval / 10) * 10 // Round to 10ms
      histogram.set(rounded, (histogram.get(rounded) || 0) + 1)
    })
    
    // Find mode
    let maxCount = 0
    let modeInterval = 500 // Default to 120 BPM
    histogram.forEach((count, interval) => {
      if (count > maxCount) {
        maxCount = count
        modeInterval = interval
      }
    })
    
    // Convert to BPM
    this.currentTempo = Math.round(60000 / modeInterval)
  }
  
  getCurrentTempo(): number {
    return this.currentTempo
  }
}

/**
 * Onset detection for transient detection
 */
class OnsetDetector {
  private sampleRate: number
  private previousMagnitudes: Float32Array | null = null
  private onsetHistory: number[] = []
  
  constructor(sampleRate: number) {
    this.sampleRate = sampleRate
  }
  
  detectOnset(frequencyData: Float32Array): number {
    if (!this.previousMagnitudes) {
      this.previousMagnitudes = new Float32Array(frequencyData.length)
      this.previousMagnitudes.set(frequencyData)
      return 0
    }
    
    // Spectral flux
    let flux = 0
    for (let i = 0; i < frequencyData.length; i++) {
      const diff = frequencyData[i] - this.previousMagnitudes[i]
      if (diff > 0) flux += diff
    }
    
    // Update history
    this.onsetHistory.push(flux)
    if (this.onsetHistory.length > 20) {
      this.onsetHistory.shift()
    }
    
    // Dynamic threshold
    const mean = this.onsetHistory.reduce((a, b) => a + b, 0) / this.onsetHistory.length
    const threshold = mean * 1.5
    
    this.previousMagnitudes.set(frequencyData)
    
    return flux > threshold ? flux / threshold : 0
  }
}

/**
 * Chroma vector extraction for harmonic analysis
 */
class ChromaExtractor {
  private sampleRate: number
  private fftSize: number
  private pitchProfiles: Float32Array[]
  
  constructor(sampleRate: number, fftSize: number) {
    this.sampleRate = sampleRate
    this.fftSize = fftSize
    this.pitchProfiles = this.generatePitchProfiles()
  }
  
  extractChroma(frequencyData: Float32Array): number[] {
    const chroma = new Array(12).fill(0)
    const nyquist = this.sampleRate / 2
    
    for (let i = 0; i < frequencyData.length; i++) {
      const freq = (i / frequencyData.length) * nyquist
      if (freq < 80 || freq > 5000) continue // Focus on musical range
      
      const magnitude = Math.pow(10, frequencyData[i] / 20)
      const pitchClass = this.freqToPitchClass(freq)
      
      chroma[pitchClass] += magnitude
    }
    
    // Normalize
    const sum = chroma.reduce((a, b) => a + b, 0)
    if (sum > 0) {
      for (let i = 0; i < 12; i++) {
        chroma[i] /= sum
      }
    }
    
    return chroma
  }
  
  private freqToPitchClass(freq: number): number {
    const A4 = 440
    const semitones = 12 * Math.log2(freq / A4)
    const pitchClass = Math.round(semitones) % 12
    return (pitchClass + 12) % 12 // Ensure positive
  }
  
  private generatePitchProfiles(): Float32Array[] {
    // Generate ideal pitch profiles for each pitch class
    const profiles: Float32Array[] = []
    
    for (let pc = 0; pc < 12; pc++) {
      const profile = new Float32Array(this.fftSize / 2)
      // Add harmonics for this pitch class
      // Simplified - in production use proper harmonic templates
      profiles.push(profile)
    }
    
    return profiles
  }
}

/**
 * Spectral feature analyzer
 */
class SpectralAnalyzer {
  private sampleRate: number
  private frequencyBands = [
    { name: 'sub', min: 20, max: 60 },
    { name: 'bass', min: 60, max: 250 },
    { name: 'lowMid', min: 250, max: 500 },
    { name: 'mid', min: 500, max: 2000 },
    { name: 'highMid', min: 2000, max: 4000 },
    { name: 'presence', min: 4000, max: 6000 },
    { name: 'brilliance', min: 6000, max: 20000 }
  ]
  
  constructor(sampleRate: number) {
    this.sampleRate = sampleRate
  }
  
  getSpectralCentroid(frequencyData: Float32Array): number {
    let weightedSum = 0
    let magnitudeSum = 0
    const nyquist = this.sampleRate / 2
    
    for (let i = 0; i < frequencyData.length; i++) {
      const freq = (i / frequencyData.length) * nyquist
      const magnitude = Math.pow(10, frequencyData[i] / 20)
      
      weightedSum += freq * magnitude
      magnitudeSum += magnitude
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0
  }
  
  getSpectralRolloff(frequencyData: Float32Array, threshold = 0.85): number {
    let totalEnergy = 0
    const nyquist = this.sampleRate / 2
    
    // Calculate total energy
    for (let i = 0; i < frequencyData.length; i++) {
      totalEnergy += Math.pow(10, frequencyData[i] / 20)
    }
    
    // Find rolloff point
    let cumulativeEnergy = 0
    for (let i = 0; i < frequencyData.length; i++) {
      cumulativeEnergy += Math.pow(10, frequencyData[i] / 20)
      
      if (cumulativeEnergy >= totalEnergy * threshold) {
        return (i / frequencyData.length) * nyquist
      }
    }
    
    return nyquist
  }
  
  getSpectralFlux(current: Float32Array, previous: Float32Array | null): number {
    if (!previous) return 0
    
    let flux = 0
    for (let i = 0; i < current.length; i++) {
      const diff = current[i] - previous[i]
      if (diff > 0) flux += diff
    }
    
    return flux / current.length
  }
  
  getSpectralFlatness(frequencyData: Float32Array): number {
    let geometricMean = 0
    let arithmeticMean = 0
    let count = 0
    
    for (let i = 1; i < frequencyData.length; i++) {
      const magnitude = Math.pow(10, frequencyData[i] / 20)
      if (magnitude > 0) {
        geometricMean += Math.log(magnitude)
        arithmeticMean += magnitude
        count++
      }
    }
    
    if (count === 0) return 0
    
    geometricMean = Math.exp(geometricMean / count)
    arithmeticMean = arithmeticMean / count
    
    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0
  }
  
  getBandEnergy(frequencyData: Float32Array): RealtimeAnalysisResult['spectralBandEnergy'] {
    const bandEnergy: any = {}
    const nyquist = this.sampleRate / 2
    const binWidth = nyquist / frequencyData.length
    
    this.frequencyBands.forEach(band => {
      const startBin = Math.floor(band.min / binWidth)
      const endBin = Math.ceil(band.max / binWidth)
      
      let energy = 0
      for (let i = startBin; i < endBin && i < frequencyData.length; i++) {
        energy += Math.pow(10, frequencyData[i] / 20)
      }
      
      bandEnergy[band.name] = energy / (endBin - startBin)
    })
    
    return bandEnergy
  }
}

// Export singleton instance
export const realtimeAudioAnalyzer = (audioContext: AudioContext, config?: Partial<RealtimeAnalyzerConfig>) => 
  new ProductionRealtimeAudioAnalyzer(audioContext, config)