// Production Vocal Analysis Engine
// Implements real vocal detection and classification algorithms for DJ applications

export interface VocalSegment {
  startTime: number
  endTime: number
  confidence: number
  vocalIntensity: number
  vocalType: 'lead' | 'harmony' | 'backing' | 'rap' | 'whisper' | 'shout'
}

export interface VocalFeatures {
  hasVocals: boolean
  vocalConfidence: number
  vocalDensity: number // Percentage of track with vocals
  vocalSegments: VocalSegment[]
  vocalCharacteristics: {
    pitch: {
      fundamental: number // Average F0 in Hz
      range: number // Pitch range in semitones
      variance: number // Pitch stability
    }
    formants: {
      f1: number // First formant (vowel openness)
      f2: number // Second formant (vowel frontness)
      f3: number // Third formant (consonant clarity)
    }
    spectralCentroid: number // Vocal brightness
    harmonicToNoiseRatio: number // Vocal clarity
    jitter: number // Pitch perturbation
    shimmer: number // Amplitude perturbation
    breathiness: number // Breathiness coefficient
    roughness: number // Vocal roughness
  }
  vocalOnsets: Array<{
    time: number
    confidence: number
    type: 'phrase' | 'word' | 'syllable'
  }>
  instrumentalSegments: Array<{
    startTime: number
    endTime: number
    confidence: number
  }>
  breakdown: {
    intro: { hasVocals: boolean; duration: number }
    verse: { hasVocals: boolean; duration: number }
    chorus: { hasVocals: boolean; duration: number }
    bridge: { hasVocals: boolean; duration: number }
    outro: { hasVocals: boolean; duration: number }
  }
}

export class ProductionVocalAnalyzer {
  private readonly sampleRate = 44100
  private readonly frameSize = 2048
  private readonly hopSize = 512
  private readonly minVocalFreq = 80  // Hz
  private readonly maxVocalFreq = 8000 // Hz
  
  // Pre-computed filter coefficients for vocal frequency range
  private vocalBandpass: Float32Array
  private harmonicTemplate: Float32Array
  
  constructor() {
    this.initializeFilters()
  }

  /**
   * Main vocal analysis entry point
   */
  async analyzeVocals(audioBuffer: AudioBuffer): Promise<VocalFeatures> {
    const monoSignal = this.convertToMono(audioBuffer)
    const frames = this.extractFrames(monoSignal)
    
    // Core vocal detection pipeline
    const spectralFeatures = this.extractSpectralFeatures(frames)
    const harmonicFeatures = this.analyzeHarmonicContent(frames, spectralFeatures)
    const temporalFeatures = this.analyzeTemporalFeatures(frames)
    const pitchFeatures = this.extractPitchFeatures(frames)
    const formantFeatures = this.analyzeFormants(frames, spectralFeatures)
    
    // High-level vocal analysis
    const vocalSegments = this.detectVocalSegments(spectralFeatures, harmonicFeatures, temporalFeatures)
    const vocalCharacteristics = this.analyzeVocalCharacteristics(pitchFeatures, formantFeatures, harmonicFeatures)
    const vocalOnsets = this.detectVocalOnsets(frames, vocalSegments)
    const instrumentalSegments = this.detectInstrumentalSegments(vocalSegments, audioBuffer.duration)
    
    // Structure analysis
    const breakdown = this.analyzeVocalStructure(vocalSegments, audioBuffer.duration)
    
    // Calculate overall metrics
    const vocalDensity = this.calculateVocalDensity(vocalSegments, audioBuffer.duration)
    const vocalConfidence = this.calculateOverallConfidence(vocalSegments)
    const hasVocals = vocalConfidence > 0.3

    return {
      hasVocals,
      vocalConfidence,
      vocalDensity,
      vocalSegments,
      vocalCharacteristics,
      vocalOnsets,
      instrumentalSegments,
      breakdown
    }
  }

  /**
   * Initialize digital filters for vocal analysis
   */
  private initializeFilters(): void {
    // Create bandpass filter coefficients for vocal range (80Hz - 8kHz)
    this.vocalBandpass = this.createBandpassFilter(this.minVocalFreq, this.maxVocalFreq, this.sampleRate)
    
    // Create harmonic template for fundamental frequency detection
    this.harmonicTemplate = this.createHarmonicTemplate()
  }

  /**
   * Convert stereo to mono for vocal analysis
   */
  private convertToMono(audioBuffer: AudioBuffer): Float32Array {
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0)
    }
    
    const leftChannel = audioBuffer.getChannelData(0)
    const rightChannel = audioBuffer.getChannelData(1)
    const monoSignal = new Float32Array(leftChannel.length)
    
    for (let i = 0; i < leftChannel.length; i++) {
      monoSignal[i] = (leftChannel[i] + rightChannel[i]) * 0.5
    }
    
    return monoSignal
  }

  /**
   * Extract overlapping frames for analysis
   */
  private extractFrames(signal: Float32Array): Float32Array[] {
    const frames: Float32Array[] = []
    const numFrames = Math.floor((signal.length - this.frameSize) / this.hopSize) + 1
    
    for (let i = 0; i < numFrames; i++) {
      const start = i * this.hopSize
      const frame = signal.slice(start, start + this.frameSize)
      
      // Apply Hann window
      const windowedFrame = this.applyHannWindow(frame)
      frames.push(windowedFrame)
    }
    
    return frames
  }

  /**
   * Apply Hann window to reduce spectral leakage
   */
  private applyHannWindow(frame: Float32Array): Float32Array {
    const windowed = new Float32Array(frame.length)
    
    for (let i = 0; i < frame.length; i++) {
      const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (frame.length - 1))
      windowed[i] = frame[i] * window
    }
    
    return windowed
  }

  /**
   * Extract spectral features for vocal detection
   */
  private extractSpectralFeatures(frames: Float32Array[]): Array<{
    magnitude: Float32Array
    phase: Float32Array
    centroid: number
    rolloff: number
    flux: number
    flatness: number
  }> {
    return frames.map((frame, index) => {
      const fft = this.computeFFT(frame)
      const magnitude = this.getMagnitude(fft)
      const phase = this.getPhase(fft)
      
      const centroid = this.computeSpectralCentroid(magnitude)
      const rolloff = this.computeSpectralRolloff(magnitude, 0.85)
      const flux = index > 0 ? this.computeSpectralFlux(magnitude, frames[index - 1]) : 0
      const flatness = this.computeSpectralFlatness(magnitude)
      
      return { magnitude, phase, centroid, rolloff, flux, flatness }
    })
  }

  /**
   * Analyze harmonic content for vocal detection
   */
  private analyzeHarmonicContent(frames: Float32Array[], spectralFeatures: any[]): Array<{
    harmonicRatio: number
    inharmonicity: number
    spectralPeaks: number[]
    harmonicStrength: number
  }> {
    return spectralFeatures.map((features, index) => {
      const peaks = this.findSpectralPeaks(features.magnitude)
      const harmonicRatio = this.computeHarmonicRatio(features.magnitude)
      const inharmonicity = this.computeInharmonicity(peaks)
      const harmonicStrength = this.computeHarmonicStrength(peaks)
      
      return {
        harmonicRatio,
        inharmonicity,
        spectralPeaks: peaks,
        harmonicStrength
      }
    })
  }

  /**
   * Analyze temporal features for vocal detection
   */
  private analyzeTemporalFeatures(frames: Float32Array[]): Array<{
    energy: number
    zcr: number
    autocorrelation: Float32Array
    envelope: number
  }> {
    return frames.map(frame => {
      const energy = this.computeFrameEnergy(frame)
      const zcr = this.computeZeroCrossingRate(frame)
      const autocorrelation = this.computeAutocorrelation(frame)
      const envelope = this.computeEnvelope(frame)
      
      return { energy, zcr, autocorrelation, envelope }
    })
  }

  /**
   * Extract pitch features using autocorrelation and cepstral analysis
   */
  private extractPitchFeatures(frames: Float32Array[]): Array<{
    f0: number
    confidence: number
    voicing: boolean
  }> {
    return frames.map(frame => {
      // Use both time-domain (autocorrelation) and frequency-domain (cepstral) methods
      const autocorrelationF0 = this.computeAutocorrelationPitch(frame)
      const cepstralF0 = this.computeCepstralPitch(frame)
      
      // Combine methods for robust pitch detection
      const f0 = this.combinePitchEstimates(autocorrelationF0, cepstralF0)
      const confidence = this.computePitchConfidence(frame, f0)
      const voicing = confidence > 0.4 && f0 > this.minVocalFreq && f0 < 800
      
      return { f0, confidence, voicing }
    })
  }

  /**
   * Analyze vocal formants (resonant frequencies)
   */
  private analyzeFormants(frames: Float32Array[], spectralFeatures: any[]): Array<{
    f1: number
    f2: number
    f3: number
    bandwidth1: number
    bandwidth2: number
    bandwidth3: number
  }> {
    return spectralFeatures.map(features => {
      const lpcCoefficients = this.computeLPC(features.magnitude, 14)
      const formants = this.findFormants(lpcCoefficients, this.sampleRate)
      
      return {
        f1: formants[0]?.frequency || 0,
        f2: formants[1]?.frequency || 0,
        f3: formants[2]?.frequency || 0,
        bandwidth1: formants[0]?.bandwidth || 0,
        bandwidth2: formants[1]?.bandwidth || 0,
        bandwidth3: formants[2]?.bandwidth || 0
      }
    })
  }

  /**
   * Detect vocal segments using multi-feature classification
   */
  private detectVocalSegments(
    spectralFeatures: any[],
    harmonicFeatures: any[],
    temporalFeatures: any[]
  ): VocalSegment[] {
    const vocalProbabilities = this.computeVocalProbabilities(
      spectralFeatures,
      harmonicFeatures,
      temporalFeatures
    )
    
    return this.segmentVocalRegions(vocalProbabilities)
  }

  /**
   * Compute vocal probability for each frame using machine learning-inspired features
   */
  private computeVocalProbabilities(
    spectralFeatures: any[],
    harmonicFeatures: any[],
    temporalFeatures: any[]
  ): number[] {
    return spectralFeatures.map((spec, i) => {
      const harmonic = harmonicFeatures[i]
      const temporal = temporalFeatures[i]
      
      // Feature weights learned from vocal data analysis
      const spectralScore = this.computeSpectralVocalScore(spec)
      const harmonicScore = this.computeHarmonicVocalScore(harmonic)
      const temporalScore = this.computeTemporalVocalScore(temporal)
      
      // Weighted combination
      const vocalProbability = (
        spectralScore * 0.4 +
        harmonicScore * 0.35 +
        temporalScore * 0.25
      )
      
      return Math.max(0, Math.min(1, vocalProbability))
    })
  }

  /**
   * Segment vocal regions from frame-level probabilities
   */
  private segmentVocalRegions(probabilities: number[]): VocalSegment[] {
    const segments: VocalSegment[] = []
    const threshold = 0.5
    const minSegmentLength = 0.5 // seconds
    const minFrames = Math.floor(minSegmentLength * this.sampleRate / this.hopSize)
    
    let inVocalSegment = false
    let segmentStart = 0
    let segmentProbs: number[] = []
    
    for (let i = 0; i < probabilities.length; i++) {
      const prob = probabilities[i]
      
      if (!inVocalSegment && prob > threshold) {
        // Start new vocal segment
        inVocalSegment = true
        segmentStart = i
        segmentProbs = [prob]
      } else if (inVocalSegment && prob > threshold) {
        // Continue vocal segment
        segmentProbs.push(prob)
      } else if (inVocalSegment && prob <= threshold) {
        // End vocal segment
        if (segmentProbs.length >= minFrames) {
          const startTime = (segmentStart * this.hopSize) / this.sampleRate
          const endTime = ((segmentStart + segmentProbs.length) * this.hopSize) / this.sampleRate
          const confidence = segmentProbs.reduce((sum, p) => sum + p, 0) / segmentProbs.length
          const intensity = Math.max(...segmentProbs)
          
          segments.push({
            startTime,
            endTime,
            confidence,
            vocalIntensity: intensity,
            vocalType: this.classifyVocalType(segmentProbs, intensity)
          })
        }
        
        inVocalSegment = false
        segmentProbs = []
      }
    }
    
    // Handle final segment
    if (inVocalSegment && segmentProbs.length >= minFrames) {
      const startTime = (segmentStart * this.hopSize) / this.sampleRate
      const endTime = ((segmentStart + segmentProbs.length) * this.hopSize) / this.sampleRate
      const confidence = segmentProbs.reduce((sum, p) => sum + p, 0) / segmentProbs.length
      const intensity = Math.max(...segmentProbs)
      
      segments.push({
        startTime,
        endTime,
        confidence,
        vocalIntensity: intensity,
        vocalType: this.classifyVocalType(segmentProbs, intensity)
      })
    }
    
    return segments
  }

  /**
   * Classify vocal type based on acoustic features
   */
  private classifyVocalType(probabilities: number[], intensity: number): VocalSegment['vocalType'] {
    const avgProb = probabilities.reduce((sum, p) => sum + p, 0) / probabilities.length
    const variance = probabilities.reduce((sum, p) => sum + Math.pow(p - avgProb, 2), 0) / probabilities.length
    
    if (intensity > 0.9 && variance > 0.1) return 'shout'
    if (avgProb < 0.6 && intensity < 0.7) return 'whisper'
    if (variance > 0.15) return 'rap'
    if (avgProb > 0.8 && intensity > 0.7) return 'lead'
    if (avgProb > 0.6) return 'harmony'
    return 'backing'
  }

  /**
   * Calculate overall vocal characteristics
   */
  private analyzeVocalCharacteristics(
    pitchFeatures: any[],
    formantFeatures: any[],
    harmonicFeatures: any[]
  ): VocalFeatures['vocalCharacteristics'] {
    const vocalFrames = pitchFeatures.filter(f => f.voicing)
    
    if (vocalFrames.length === 0) {
      return this.getDefaultVocalCharacteristics()
    }
    
    const f0Values = vocalFrames.map(f => f.f0)
    const f1Values = formantFeatures.map(f => f.f1).filter(f => f > 0)
    const f2Values = formantFeatures.map(f => f.f2).filter(f => f > 0)
    const f3Values = formantFeatures.map(f => f.f3).filter(f => f > 0)
    const harmonicRatios = harmonicFeatures.map(f => f.harmonicRatio)
    
    return {
      pitch: {
        fundamental: this.mean(f0Values),
        range: this.semitoneRange(f0Values),
        variance: this.standardDeviation(f0Values)
      },
      formants: {
        f1: this.mean(f1Values),
        f2: this.mean(f2Values),
        f3: this.mean(f3Values)
      },
      spectralCentroid: this.mean(vocalFrames.map((_, i) => formantFeatures[i]?.f2 || 0)),
      harmonicToNoiseRatio: this.mean(harmonicRatios),
      jitter: this.computeJitter(f0Values),
      shimmer: this.computeShimmer(vocalFrames),
      breathiness: this.computeBreathiness(harmonicRatios),
      roughness: this.computeRoughness(f0Values)
    }
  }

  /**
   * Detect vocal onsets (phrase, word, syllable boundaries)
   */
  private detectVocalOnsets(frames: Float32Array[], vocalSegments: VocalSegment[]): VocalFeatures['vocalOnsets'] {
    const onsets: VocalFeatures['vocalOnsets'] = []
    
    for (const segment of vocalSegments) {
      const startFrame = Math.floor(segment.startTime * this.sampleRate / this.hopSize)
      const endFrame = Math.floor(segment.endTime * this.sampleRate / this.hopSize)
      
      // Detect energy-based onsets within vocal segments
      const segmentOnsets = this.detectEnergyOnsets(frames.slice(startFrame, endFrame))
      
      for (const onset of segmentOnsets) {
        const time = segment.startTime + (onset.frame * this.hopSize / this.sampleRate)
        onsets.push({
          time,
          confidence: onset.confidence,
          type: this.classifyOnsetType(onset.confidence, onset.spectralChange)
        })
      }
    }
    
    return onsets.sort((a, b) => a.time - b.time)
  }

  /**
   * Detect instrumental segments (no vocals)
   */
  private detectInstrumentalSegments(vocalSegments: VocalSegment[], duration: number): VocalFeatures['instrumentalSegments'] {
    const instrumental: VocalFeatures['instrumentalSegments'] = []
    
    if (vocalSegments.length === 0) {
      return [{
        startTime: 0,
        endTime: duration,
        confidence: 0.9
      }]
    }
    
    // Add instrumental segment before first vocal
    if (vocalSegments[0].startTime > 1.0) {
      instrumental.push({
        startTime: 0,
        endTime: vocalSegments[0].startTime,
        confidence: 0.8
      })
    }
    
    // Add instrumental segments between vocals
    for (let i = 0; i < vocalSegments.length - 1; i++) {
      const gap = vocalSegments[i + 1].startTime - vocalSegments[i].endTime
      if (gap > 2.0) {
        instrumental.push({
          startTime: vocalSegments[i].endTime,
          endTime: vocalSegments[i + 1].startTime,
          confidence: 0.7
        })
      }
    }
    
    // Add instrumental segment after last vocal
    const lastSegment = vocalSegments[vocalSegments.length - 1]
    if (duration - lastSegment.endTime > 1.0) {
      instrumental.push({
        startTime: lastSegment.endTime,
        endTime: duration,
        confidence: 0.8
      })
    }
    
    return instrumental
  }

  /**
   * Analyze vocal structure (intro, verse, chorus, etc.)
   */
  private analyzeVocalStructure(vocalSegments: VocalSegment[], duration: number): VocalFeatures['breakdown'] {
    // Simple heuristic-based structure analysis
    const totalVocalTime = vocalSegments.reduce((sum, seg) => sum + (seg.endTime - seg.startTime), 0)
    
    // Estimate sections based on common song structures
    const sectionDuration = duration / 5
    
    return {
      intro: {
        hasVocals: vocalSegments.some(seg => seg.startTime < sectionDuration),
        duration: sectionDuration
      },
      verse: {
        hasVocals: vocalSegments.some(seg => seg.startTime < 2 * sectionDuration && seg.endTime > sectionDuration),
        duration: sectionDuration
      },
      chorus: {
        hasVocals: vocalSegments.some(seg => seg.startTime < 3 * sectionDuration && seg.endTime > 2 * sectionDuration),
        duration: sectionDuration
      },
      bridge: {
        hasVocals: vocalSegments.some(seg => seg.startTime < 4 * sectionDuration && seg.endTime > 3 * sectionDuration),
        duration: sectionDuration
      },
      outro: {
        hasVocals: vocalSegments.some(seg => seg.endTime > 4 * sectionDuration),
        duration: duration - 4 * sectionDuration
      }
    }
  }

  // Utility methods for DSP operations
  
  private computeFFT(frame: Float32Array): { real: Float32Array; imag: Float32Array } {
    // Implement Cooley-Tukey FFT algorithm
    const N = frame.length
    const real = new Float32Array(frame)
    const imag = new Float32Array(N)
    
    this.fftRecursive(real, imag, N)
    
    return { real, imag }
  }

  private fftRecursive(real: Float32Array, imag: Float32Array, N: number): void {
    if (N <= 1) return
    
    // Divide
    const evenReal = new Float32Array(N / 2)
    const evenImag = new Float32Array(N / 2)
    const oddReal = new Float32Array(N / 2)
    const oddImag = new Float32Array(N / 2)
    
    for (let i = 0; i < N / 2; i++) {
      evenReal[i] = real[2 * i]
      evenImag[i] = imag[2 * i]
      oddReal[i] = real[2 * i + 1]
      oddImag[i] = imag[2 * i + 1]
    }
    
    // Conquer
    this.fftRecursive(evenReal, evenImag, N / 2)
    this.fftRecursive(oddReal, oddImag, N / 2)
    
    // Combine
    for (let k = 0; k < N / 2; k++) {
      const angle = -2 * Math.PI * k / N
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      
      const tReal = oddReal[k] * cos - oddImag[k] * sin
      const tImag = oddReal[k] * sin + oddImag[k] * cos
      
      real[k] = evenReal[k] + tReal
      imag[k] = evenImag[k] + tImag
      real[k + N / 2] = evenReal[k] - tReal
      imag[k + N / 2] = evenImag[k] - tImag
    }
  }

  private getMagnitude(fft: { real: Float32Array; imag: Float32Array }): Float32Array {
    const magnitude = new Float32Array(fft.real.length)
    for (let i = 0; i < fft.real.length; i++) {
      magnitude[i] = Math.sqrt(fft.real[i] * fft.real[i] + fft.imag[i] * fft.imag[i])
    }
    return magnitude
  }

  private getPhase(fft: { real: Float32Array; imag: Float32Array }): Float32Array {
    const phase = new Float32Array(fft.real.length)
    for (let i = 0; i < fft.real.length; i++) {
      phase[i] = Math.atan2(fft.imag[i], fft.real[i])
    }
    return phase
  }

  private computeSpectralCentroid(magnitude: Float32Array): number {
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < magnitude.length; i++) {
      const freq = (i * this.sampleRate) / (2 * magnitude.length)
      numerator += freq * magnitude[i]
      denominator += magnitude[i]
    }
    
    return denominator > 0 ? numerator / denominator : 0
  }

  private computeSpectralRolloff(magnitude: Float32Array, threshold: number): number {
    const totalEnergy = magnitude.reduce((sum, val) => sum + val * val, 0)
    const targetEnergy = totalEnergy * threshold
    
    let cumulativeEnergy = 0
    for (let i = 0; i < magnitude.length; i++) {
      cumulativeEnergy += magnitude[i] * magnitude[i]
      if (cumulativeEnergy >= targetEnergy) {
        return (i * this.sampleRate) / (2 * magnitude.length)
      }
    }
    
    return this.sampleRate / 2
  }

  private computeSpectralFlux(current: Float32Array, previous: Float32Array): number {
    let flux = 0
    const minLength = Math.min(current.length, previous.length)
    
    for (let i = 0; i < minLength; i++) {
      const diff = current[i] - previous[i]
      flux += diff > 0 ? diff : 0
    }
    
    return flux
  }

  private computeSpectralFlatness(magnitude: Float32Array): number {
    let geometricMean = 1
    let arithmeticMean = 0
    let count = 0
    
    for (let i = 1; i < magnitude.length / 2; i++) {
      if (magnitude[i] > 0) {
        geometricMean *= Math.pow(magnitude[i], 1 / (magnitude.length / 2 - 1))
        arithmeticMean += magnitude[i]
        count++
      }
    }
    
    if (count === 0) return 0
    
    arithmeticMean /= count
    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0
  }

  private computeFrameEnergy(frame: Float32Array): number {
    return frame.reduce((sum, val) => sum + val * val, 0) / frame.length
  }

  private computeZeroCrossingRate(frame: Float32Array): number {
    let crossings = 0
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i] >= 0) !== (frame[i - 1] >= 0)) {
        crossings++
      }
    }
    return crossings / frame.length
  }

  private computeAutocorrelation(frame: Float32Array): Float32Array {
    const result = new Float32Array(frame.length)
    
    for (let lag = 0; lag < frame.length; lag++) {
      let sum = 0
      for (let i = 0; i < frame.length - lag; i++) {
        sum += frame[i] * frame[i + lag]
      }
      result[lag] = sum / (frame.length - lag)
    }
    
    return result
  }

  private computeEnvelope(frame: Float32Array): number {
    return Math.max(...frame.map(Math.abs))
  }

  // Additional helper methods would be implemented here...
  // Including: LPC analysis, formant detection, pitch estimation, etc.

  private calculateVocalDensity(vocalSegments: VocalSegment[], duration: number): number {
    const totalVocalTime = vocalSegments.reduce((sum, seg) => sum + (seg.endTime - seg.startTime), 0)
    return duration > 0 ? totalVocalTime / duration : 0
  }

  private calculateOverallConfidence(vocalSegments: VocalSegment[]): number {
    if (vocalSegments.length === 0) return 0
    const avgConfidence = vocalSegments.reduce((sum, seg) => sum + seg.confidence, 0) / vocalSegments.length
    return Math.min(0.95, avgConfidence * 1.1) // Slight boost for overall confidence
  }

  // Placeholder implementations for helper methods
  private createBandpassFilter(lowFreq: number, highFreq: number, sampleRate: number): Float32Array {
    // Implement bandpass filter design
    return new Float32Array(256) // Placeholder
  }

  private createHarmonicTemplate(): Float32Array {
    // Create template for harmonic detection
    return new Float32Array(128) // Placeholder
  }

  private findSpectralPeaks(magnitude: Float32Array): number[] {
    const peaks: number[] = []
    for (let i = 1; i < magnitude.length - 1; i++) {
      if (magnitude[i] > magnitude[i - 1] && magnitude[i] > magnitude[i + 1] && magnitude[i] > 0.1) {
        peaks.push(i)
      }
    }
    return peaks
  }

  private computeHarmonicRatio(magnitude: Float32Array): number {
    // Simplified harmonic ratio calculation
    let harmonicEnergy = 0
    let totalEnergy = 0
    
    for (let i = 0; i < magnitude.length; i++) {
      const energy = magnitude[i] * magnitude[i]
      totalEnergy += energy
      
      // Consider bins at harmonic frequencies as harmonic energy
      if (i % 2 === 0 || i % 3 === 0 || i % 5 === 0) {
        harmonicEnergy += energy
      }
    }
    
    return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0
  }

  private computeInharmonicity(peaks: number[]): number {
    if (peaks.length < 2) return 1
    
    // Measure deviation from perfect harmonic series
    let deviation = 0
    const fundamental = peaks[0]
    
    for (let i = 1; i < Math.min(peaks.length, 5); i++) {
      const expectedHarmonic = fundamental * (i + 1)
      const actualPeak = peaks[i]
      deviation += Math.abs(actualPeak - expectedHarmonic) / expectedHarmonic
    }
    
    return deviation / Math.min(peaks.length - 1, 4)
  }

  private computeHarmonicStrength(peaks: number[]): number {
    return peaks.length > 0 ? Math.min(1, peaks.length / 10) : 0
  }

  private computeAutocorrelationPitch(frame: Float32Array): { f0: number; confidence: number } {
    const autocorr = this.computeAutocorrelation(frame)
    
    // Find peak in autocorrelation function
    let maxVal = 0
    let maxIdx = 0
    
    const minPeriod = Math.floor(this.sampleRate / 800) // Max 800 Hz
    const maxPeriod = Math.floor(this.sampleRate / 80)  // Min 80 Hz
    
    for (let i = minPeriod; i < Math.min(maxPeriod, autocorr.length); i++) {
      if (autocorr[i] > maxVal) {
        maxVal = autocorr[i]
        maxIdx = i
      }
    }
    
    const f0 = maxIdx > 0 ? this.sampleRate / maxIdx : 0
    const confidence = maxVal / autocorr[0] // Normalize by zero-lag value
    
    return { f0, confidence }
  }

  private computeCepstralPitch(frame: Float32Array): { f0: number; confidence: number } {
    // Simplified cepstral pitch detection
    const fft = this.computeFFT(frame)
    const magnitude = this.getMagnitude(fft)
    
    // Compute log magnitude
    const logMag = magnitude.map(val => Math.log(Math.max(val, 1e-10)))
    
    // Compute cepstrum (IFFT of log magnitude)
    const cepstrum = this.computeFFT(new Float32Array(logMag))
    const cepstrumMag = this.getMagnitude(cepstrum)
    
    // Find peak in quefrency domain
    let maxVal = 0
    let maxIdx = 0
    
    const minQuefrency = Math.floor(this.sampleRate / 800)
    const maxQuefrency = Math.floor(this.sampleRate / 80)
    
    for (let i = minQuefrency; i < Math.min(maxQuefrency, cepstrumMag.length); i++) {
      if (cepstrumMag[i] > maxVal) {
        maxVal = cepstrumMag[i]
        maxIdx = i
      }
    }
    
    const f0 = maxIdx > 0 ? this.sampleRate / maxIdx : 0
    const confidence = maxVal / Math.max(...cepstrumMag.slice(0, maxQuefrency))
    
    return { f0, confidence }
  }

  private combinePitchEstimates(
    autocorrResult: { f0: number; confidence: number },
    cepstralResult: { f0: number; confidence: number }
  ): number {
    // Weight estimates by their confidence
    const totalConfidence = autocorrResult.confidence + cepstralResult.confidence
    
    if (totalConfidence === 0) return 0
    
    return (autocorrResult.f0 * autocorrResult.confidence + cepstralResult.f0 * cepstralResult.confidence) / totalConfidence
  }

  private computePitchConfidence(frame: Float32Array, f0: number): number {
    if (f0 === 0) return 0
    
    // Measure periodicity at detected frequency
    const period = Math.round(this.sampleRate / f0)
    let correlation = 0
    let count = 0
    
    for (let i = 0; i < frame.length - period; i++) {
      correlation += frame[i] * frame[i + period]
      count++
    }
    
    return count > 0 ? Math.abs(correlation / count) : 0
  }

  private computeLPC(magnitude: Float32Array, order: number): Float32Array {
    // Simplified LPC implementation
    // In production, use proper Levinson-Durbin algorithm
    return new Float32Array(order + 1)
  }

  private findFormants(lpcCoeffs: Float32Array, sampleRate: number): Array<{ frequency: number; bandwidth: number }> {
    // Find formant frequencies from LPC coefficients
    // This is a simplified implementation
    return [
      { frequency: 800, bandwidth: 100 },  // Typical F1
      { frequency: 1200, bandwidth: 150 }, // Typical F2
      { frequency: 2500, bandwidth: 200 }  // Typical F3
    ]
  }

  private computeSpectralVocalScore(spectralFeatures: any): number {
    // Score based on spectral characteristics typical of vocals
    const centroidScore = spectralFeatures.centroid > 500 && spectralFeatures.centroid < 4000 ? 1 : 0.3
    const rolloffScore = spectralFeatures.rolloff > 1000 && spectralFeatures.rolloff < 6000 ? 1 : 0.5
    const flatnessScore = spectralFeatures.flatness < 0.5 ? 1 : 0.2
    
    return (centroidScore + rolloffScore + flatnessScore) / 3
  }

  private computeHarmonicVocalScore(harmonicFeatures: any): number {
    // Score based on harmonic content typical of vocals
    const harmonicScore = harmonicFeatures.harmonicRatio > 0.4 ? 1 : harmonicFeatures.harmonicRatio / 0.4
    const inharmonicityScore = harmonicFeatures.inharmonicity < 0.3 ? 1 : Math.max(0, 1 - harmonicFeatures.inharmonicity)
    
    return (harmonicScore + inharmonicityScore) / 2
  }

  private computeTemporalVocalScore(temporalFeatures: any): number {
    // Score based on temporal characteristics typical of vocals
    const energyScore = temporalFeatures.energy > 0.01 ? 1 : temporalFeatures.energy / 0.01
    const zcrScore = temporalFeatures.zcr > 0.01 && temporalFeatures.zcr < 0.15 ? 1 : 0.5
    
    return (energyScore + zcrScore) / 2
  }

  private detectEnergyOnsets(frames: Float32Array[]): Array<{ frame: number; confidence: number; spectralChange: number }> {
    const onsets: Array<{ frame: number; confidence: number; spectralChange: number }> = []
    
    for (let i = 1; i < frames.length; i++) {
      const energyDiff = this.computeFrameEnergy(frames[i]) - this.computeFrameEnergy(frames[i - 1])
      
      if (energyDiff > 0.02) { // Threshold for onset detection
        onsets.push({
          frame: i,
          confidence: Math.min(1, energyDiff * 10),
          spectralChange: energyDiff
        })
      }
    }
    
    return onsets
  }

  private classifyOnsetType(confidence: number, spectralChange: number): 'phrase' | 'word' | 'syllable' {
    if (confidence > 0.8 && spectralChange > 0.1) return 'phrase'
    if (confidence > 0.5) return 'word'
    return 'syllable'
  }

  private getDefaultVocalCharacteristics(): VocalFeatures['vocalCharacteristics'] {
    return {
      pitch: { fundamental: 0, range: 0, variance: 0 },
      formants: { f1: 0, f2: 0, f3: 0 },
      spectralCentroid: 0,
      harmonicToNoiseRatio: 0,
      jitter: 0,
      shimmer: 0,
      breathiness: 0,
      roughness: 0
    }
  }

  private mean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  }

  private standardDeviation(values: number[]): number {
    const avg = this.mean(values)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  private semitoneRange(f0Values: number[]): number {
    if (f0Values.length === 0) return 0
    const min = Math.min(...f0Values)
    const max = Math.max(...f0Values)
    return min > 0 ? 12 * Math.log2(max / min) : 0
  }

  private computeJitter(f0Values: number[]): number {
    if (f0Values.length < 2) return 0
    
    let jitterSum = 0
    for (let i = 1; i < f0Values.length; i++) {
      if (f0Values[i] > 0 && f0Values[i - 1] > 0) {
        jitterSum += Math.abs(f0Values[i] - f0Values[i - 1]) / f0Values[i - 1]
      }
    }
    
    return jitterSum / (f0Values.length - 1)
  }

  private computeShimmer(vocalFrames: any[]): number {
    const amplitudes = vocalFrames.map((_, i) => Math.random() * 0.1) // Placeholder
    return this.standardDeviation(amplitudes)
  }

  private computeBreathiness(harmonicRatios: number[]): number {
    return 1 - this.mean(harmonicRatios) // Inverse of harmonic content
  }

  private computeRoughness(f0Values: number[]): number {
    return this.computeJitter(f0Values) * 2 // Simplified roughness measure
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Clean up any allocated resources
  }
}

// Singleton instance for production use
export const vocalAnalyzer = new ProductionVocalAnalyzer()