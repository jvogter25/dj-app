// Production-ready spectral analysis for audio tracks
// Provides detailed frequency domain analysis for enhanced AI recommendations

export interface SpectralFeatures {
  // Basic spectral characteristics
  spectralCentroid: number[]          // Center of mass of spectrum over time
  spectralRolloff: number[]           // 95% of spectral energy boundary
  spectralFlux: number[]              // Rate of change in spectral content
  spectralSpread: number[]            // Spread of spectrum around centroid
  spectralSkewness: number[]          // Asymmetry of spectral distribution
  spectralKurtosis: number[]          // Peakedness of spectral distribution
  
  // Advanced spectral features
  mfcc: number[][]                    // Mel-frequency cepstral coefficients
  chromaVector: number[][]            // Pitch class profiles
  tonnetz: number[][]                 // Tonal network features
  spectralContrast: number[][]        // Spectral peaks vs valleys
  zeroCrossingRate: number[]          // Time-domain feature
  
  // Energy distribution
  spectralBandEnergy: {
    subBass: number[]                 // 20-60 Hz
    bass: number[]                    // 60-250 Hz
    lowMid: number[]                  // 250-500 Hz
    mid: number[]                     // 500-2000 Hz
    highMid: number[]                 // 2000-4000 Hz
    presence: number[]                // 4000-6000 Hz
    brilliance: number[]              // 6000-20000 Hz
  }
  
  // Temporal features
  onsetStrength: number[]             // Onset detection function
  tempoConfidence: number             // Tempo detection confidence
  beatSpectrum: number[]              // Beat frequency spectrum
  rhythmPatterns: number[][]          // Rhythmic pattern strength
  
  // Harmonic analysis
  harmonicRatio: number[]             // Harmonic vs inharmonic content
  harmonicSpectrum: number[][]        // Harmonic component spectrogram
  percussiveSpectrum: number[][]      // Percussive component spectrogram
  
  // Statistical summaries
  statistics: {
    mean: number[]
    std: number[]
    min: number[]
    max: number[]
    percentiles: {
      p25: number[]
      p50: number[]
      p75: number[]
      p90: number[]
      p95: number[]
    }
  }
}

export interface SpectralAnalysisConfig {
  sampleRate: number
  frameSize: number
  hopSize: number
  windowType: 'hann' | 'hamming' | 'blackman' | 'kaiser'
  melBands: number
  chromaBins: number
  maxFreq: number
  minFreq: number
  enableHarmonicPercussive: boolean
  enableOnsetDetection: boolean
  enableBeatTracking: boolean
}

export class ProductionSpectralAnalyzer {
  private config: SpectralAnalysisConfig
  private windowFunction: Float32Array | null = null
  private melFilterBank: Float32Array[] = []
  private chromaFilterBank: Float32Array[] = []
  private dctMatrix: Float32Array[] = []
  private audioContext: AudioContext | null = null

  constructor(config: Partial<SpectralAnalysisConfig> = {}) {
    this.config = {
      sampleRate: 44100,
      frameSize: 2048,
      hopSize: 512,
      windowType: 'hann',
      melBands: 128,
      chromaBins: 12,
      maxFreq: 11025,
      minFreq: 80,
      enableHarmonicPercussive: true,
      enableOnsetDetection: true,
      enableBeatTracking: true,
      ...config
    }

    this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate })
    this.initializeFilterBanks()
    this.initializeWindows()
  }

  private initializeFilterBanks() {
    // Initialize mel filter bank
    this.melFilterBank = this.createMelFilterBank()
    
    // Initialize chroma filter bank
    this.chromaFilterBank = this.createChromaFilterBank()
    
    // Initialize DCT matrix for MFCC computation
    this.dctMatrix = this.createDCTMatrix()
  }

  private initializeWindows() {
    this.windowFunction = new Float32Array(this.config.frameSize)
    
    switch (this.config.windowType) {
      case 'hann':
        for (let i = 0; i < this.config.frameSize; i++) {
          this.windowFunction[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (this.config.frameSize - 1)))
        }
        break
      case 'hamming':
        for (let i = 0; i < this.config.frameSize; i++) {
          this.windowFunction[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (this.config.frameSize - 1))
        }
        break
      case 'blackman':
        for (let i = 0; i < this.config.frameSize; i++) {
          const n = i / (this.config.frameSize - 1)
          this.windowFunction[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * n) + 0.08 * Math.cos(4 * Math.PI * n)
        }
        break
      case 'kaiser':
        const beta = 8.6 // Kaiser window parameter
        const i0Beta = this.modifiedBesselI0(beta)
        for (let i = 0; i < this.config.frameSize; i++) {
          const n = (2 * i / (this.config.frameSize - 1)) - 1
          this.windowFunction[i] = this.modifiedBesselI0(beta * Math.sqrt(1 - n * n)) / i0Beta
        }
        break
    }
  }

  /**
   * Perform comprehensive spectral analysis on audio buffer
   */
  async analyzeSpectrum(audioBuffer: AudioBuffer): Promise<SpectralFeatures> {
    const samples = this.preprocessAudio(audioBuffer)
    const frames = this.extractFrames(samples)
    const spectrograms = this.computeSpectrograms(frames)
    
    // Parallel computation of all spectral features
    const [
      basicFeatures,
      advancedFeatures,
      energyFeatures,
      temporalFeatures,
      harmonicFeatures
    ] = await Promise.all([
      this.computeBasicSpectralFeatures(spectrograms.magnitude),
      this.computeAdvancedSpectralFeatures(spectrograms.magnitude),
      this.computeEnergyDistribution(spectrograms.magnitude),
      this.computeTemporalFeatures(samples, spectrograms.magnitude),
      this.computeHarmonicFeatures(spectrograms.magnitude, spectrograms.phase)
    ])

    // Combine all features
    const features: SpectralFeatures = {
      ...basicFeatures,
      ...advancedFeatures,
      spectralBandEnergy: energyFeatures,
      ...temporalFeatures,
      ...harmonicFeatures,
      statistics: this.computeStatistics([
        ...basicFeatures.spectralCentroid,
        ...basicFeatures.spectralRolloff,
        ...basicFeatures.spectralFlux,
        ...basicFeatures.spectralSpread
      ])
    }

    return features
  }

  private preprocessAudio(audioBuffer: AudioBuffer): Float32Array {
    // Convert to mono if needed
    const samples = audioBuffer.numberOfChannels === 1 
      ? audioBuffer.getChannelData(0)
      : this.convertToMono(audioBuffer)

    // Apply pre-emphasis filter
    const preEmphasized = this.applyPreEmphasis(samples, 0.97)
    
    // Normalize amplitude
    return this.normalizeAudio(preEmphasized)
  }

  private convertToMono(audioBuffer: AudioBuffer): Float32Array {
    const length = audioBuffer.length
    const mono = new Float32Array(length)
    
    for (let i = 0; i < length; i++) {
      let sum = 0
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        sum += audioBuffer.getChannelData(channel)[i]
      }
      mono[i] = sum / audioBuffer.numberOfChannels
    }
    
    return mono
  }

  private applyPreEmphasis(samples: Float32Array, coefficient: number): Float32Array {
    const filtered = new Float32Array(samples.length)
    filtered[0] = samples[0]
    
    for (let i = 1; i < samples.length; i++) {
      filtered[i] = samples[i] - coefficient * samples[i - 1]
    }
    
    return filtered
  }

  private normalizeAudio(samples: Float32Array): Float32Array {
    let maxAbs = 0
    for (let i = 0; i < samples.length; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(samples[i]))
    }
    if (maxAbs === 0) return samples
    
    const normalized = new Float32Array(samples.length)
    for (let i = 0; i < samples.length; i++) {
      normalized[i] = samples[i] / maxAbs
    }
    
    return normalized
  }

  private extractFrames(samples: Float32Array): Float32Array[] {
    const frames: Float32Array[] = []
    const numFrames = Math.floor((samples.length - this.config.frameSize) / this.config.hopSize) + 1
    
    for (let i = 0; i < numFrames; i++) {
      const start = i * this.config.hopSize
      const frame = new Float32Array(this.config.frameSize)
      
      // Extract frame and apply window
      for (let j = 0; j < this.config.frameSize && start + j < samples.length; j++) {
        frame[j] = samples[start + j] * (this.windowFunction?.[j] || 1)
      }
      
      frames.push(frame)
    }
    
    return frames
  }

  private computeSpectrograms(frames: Float32Array[]): {
    magnitude: Float32Array[]
    phase: Float32Array[]
    complex: Complex[][]
  } {
    const magnitude: Float32Array[] = []
    const phase: Float32Array[] = []
    const complex: Complex[][] = []
    
    for (const frame of frames) {
      const fftResult = this.computeFFT(frame)
      const mag = new Float32Array(fftResult.length / 2)
      const ph = new Float32Array(fftResult.length / 2)
      const comp: Complex[] = []
      
      for (let i = 0; i < fftResult.length / 2; i++) {
        const real = fftResult[i * 2]
        const imag = fftResult[i * 2 + 1]
        mag[i] = Math.sqrt(real * real + imag * imag)
        ph[i] = Math.atan2(imag, real)
        comp.push({ real, imag })
      }
      
      magnitude.push(mag)
      phase.push(ph)
      complex.push(comp)
    }
    
    return { magnitude, phase, complex }
  }

  private async computeBasicSpectralFeatures(magnitudeSpectrograms: Float32Array[]): Promise<{
    spectralCentroid: number[]
    spectralRolloff: number[]
    spectralFlux: number[]
    spectralSpread: number[]
    spectralSkewness: number[]
    spectralKurtosis: number[]
    zeroCrossingRate: number[]
  }> {
    const centroid: number[] = []
    const rolloff: number[] = []
    const flux: number[] = []
    const spread: number[] = []
    const skewness: number[] = []
    const kurtosis: number[] = []
    const zcr: number[] = []
    
    let previousSpectrum: Float32Array | null = null
    
    for (let frameIdx = 0; frameIdx < magnitudeSpectrograms.length; frameIdx++) {
      const spectrum = magnitudeSpectrograms[frameIdx]
      
      // Spectral centroid
      let weightedSum = 0
      let magnitudeSum = 0
      for (let i = 0; i < spectrum.length; i++) {
        const freq = (i * this.config.sampleRate) / (2 * spectrum.length)
        weightedSum += freq * spectrum[i]
        magnitudeSum += spectrum[i]
      }
      centroid.push(magnitudeSum > 0 ? weightedSum / magnitudeSum : 0)
      
      // Spectral rolloff (95% energy)
      const totalEnergy = spectrum.reduce((sum, val) => sum + val * val, 0)
      const targetEnergy = totalEnergy * 0.95
      let cumulativeEnergy = 0
      let rolloffBin = spectrum.length - 1
      
      for (let i = 0; i < spectrum.length; i++) {
        cumulativeEnergy += spectrum[i] * spectrum[i]
        if (cumulativeEnergy >= targetEnergy) {
          rolloffBin = i
          break
        }
      }
      rolloff.push((rolloffBin * this.config.sampleRate) / (2 * spectrum.length))
      
      // Spectral flux
      if (previousSpectrum) {
        let fluxValue = 0
        for (let i = 0; i < spectrum.length; i++) {
          const diff = spectrum[i] - previousSpectrum[i]
          fluxValue += diff > 0 ? diff : 0 // Half-wave rectification
        }
        flux.push(fluxValue)
      } else {
        flux.push(0)
      }
      
      // Spectral spread, skewness, kurtosis
      const currentCentroid = centroid[centroid.length - 1]
      let variance = 0
      let skew = 0
      let kurt = 0
      
      for (let i = 0; i < spectrum.length; i++) {
        const freq = (i * this.config.sampleRate) / (2 * spectrum.length)
        const deviation = freq - currentCentroid
        const weight = spectrum[i] / magnitudeSum || 0
        
        variance += weight * deviation * deviation
        skew += weight * Math.pow(deviation, 3)
        kurt += weight * Math.pow(deviation, 4)
      }
      
      spread.push(Math.sqrt(variance))
      const stdDev = Math.sqrt(variance)
      skewness.push(stdDev > 0 ? skew / Math.pow(stdDev, 3) : 0)
      kurtosis.push(stdDev > 0 ? kurt / Math.pow(stdDev, 4) - 3 : 0)
      
      // Zero crossing rate (approximated from spectral content)
      zcr.push(this.estimateZeroCrossingRate(spectrum))
      
      previousSpectrum = spectrum
    }
    
    return {
      spectralCentroid: centroid,
      spectralRolloff: rolloff,
      spectralFlux: flux,
      spectralSpread: spread,
      spectralSkewness: skewness,
      spectralKurtosis: kurtosis,
      zeroCrossingRate: zcr
    }
  }

  private async computeAdvancedSpectralFeatures(magnitudeSpectrograms: Float32Array[]): Promise<{
    mfcc: number[][]
    chromaVector: number[][]
    tonnetz: number[][]
    spectralContrast: number[][]
  }> {
    const mfcc: number[][] = []
    const chromaVector: number[][] = []
    const tonnetz: number[][] = []
    const spectralContrast: number[][] = []
    
    for (const spectrum of magnitudeSpectrograms) {
      // MFCC computation
      const melSpectrum = this.applyMelFilterBank(spectrum)
      const logMelSpectrum = melSpectrum.map(val => Math.log(val + 1e-10))
      const mfccFrame = this.applyDCT(logMelSpectrum).slice(0, 13)
      mfcc.push(mfccFrame)
      
      // Chroma vector computation
      const chromaFrame = this.applyChromaFilterBank(spectrum)
      chromaVector.push(chromaFrame)
      
      // Tonnetz features (tonal network)
      const tonnetzFrame = this.computeTonnetz(chromaFrame)
      tonnetz.push(tonnetzFrame)
      
      // Spectral contrast
      const contrastFrame = this.computeSpectralContrast(spectrum)
      spectralContrast.push(contrastFrame)
    }
    
    return { mfcc, chromaVector, tonnetz, spectralContrast }
  }

  private async computeEnergyDistribution(magnitudeSpectrograms: Float32Array[]): Promise<{
    subBass: number[]
    bass: number[]
    lowMid: number[]
    mid: number[]
    highMid: number[]
    presence: number[]
    brilliance: number[]
  }> {
    const freqBands = {
      subBass: { min: 20, max: 60 },
      bass: { min: 60, max: 250 },
      lowMid: { min: 250, max: 500 },
      mid: { min: 500, max: 2000 },
      highMid: { min: 2000, max: 4000 },
      presence: { min: 4000, max: 6000 },
      brilliance: { min: 6000, max: 20000 }
    }
    
    const energyDistribution: any = {}
    
    for (const [bandName, range] of Object.entries(freqBands)) {
      energyDistribution[bandName] = []
      
      for (const spectrum of magnitudeSpectrograms) {
        const startBin = Math.floor((range.min * 2 * spectrum.length) / this.config.sampleRate)
        const endBin = Math.min(
          Math.ceil((range.max * 2 * spectrum.length) / this.config.sampleRate),
          spectrum.length - 1
        )
        
        let bandEnergy = 0
        for (let i = startBin; i <= endBin; i++) {
          bandEnergy += spectrum[i] * spectrum[i]
        }
        
        energyDistribution[bandName].push(Math.sqrt(bandEnergy))
      }
    }
    
    return energyDistribution
  }

  private async computeTemporalFeatures(samples: Float32Array, magnitudeSpectrograms: Float32Array[]): Promise<{
    onsetStrength: number[]
    tempoConfidence: number
    beatSpectrum: number[]
    rhythmPatterns: number[][]
  }> {
    // Onset detection using spectral flux
    const onsetStrength = this.detectOnsets(magnitudeSpectrograms)
    
    // Tempo estimation using autocorrelation
    const { tempo, confidence } = this.estimateTempo(onsetStrength)
    
    // Beat spectrum analysis
    const beatSpectrum = this.computeBeatSpectrum(onsetStrength)
    
    // Rhythm pattern analysis
    const rhythmPatterns = this.analyzeRhythmPatterns(onsetStrength, tempo)
    
    return {
      onsetStrength,
      tempoConfidence: confidence,
      beatSpectrum,
      rhythmPatterns
    }
  }

  private async computeHarmonicFeatures(magnitudeSpectrograms: Float32Array[], phaseSpectrograms: Float32Array[]): Promise<{
    harmonicRatio: number[]
    harmonicSpectrum: number[][]
    percussiveSpectrum: number[][]
  }> {
    if (!this.config.enableHarmonicPercussive) {
      return {
        harmonicRatio: [],
        harmonicSpectrum: [],
        percussiveSpectrum: []
      }
    }
    
    const harmonicRatio: number[] = []
    const harmonicSpectrum: number[][] = []
    const percussiveSpectrum: number[][] = []
    
    // Harmonic-percussive separation using median filtering
    for (let frameIdx = 0; frameIdx < magnitudeSpectrograms.length; frameIdx++) {
      const spectrum = magnitudeSpectrograms[frameIdx]
      
      // Separate harmonic and percussive components
      const { harmonic, percussive } = this.separateHarmonicPercussive(
        magnitudeSpectrograms,
        frameIdx
      )
      
      harmonicSpectrum.push(Array.from(harmonic))
      percussiveSpectrum.push(Array.from(percussive))
      
      // Compute harmonic ratio
      const harmonicEnergy = harmonic.reduce((sum, val) => sum + val * val, 0)
      const percussiveEnergy = percussive.reduce((sum, val) => sum + val * val, 0)
      const totalEnergy = harmonicEnergy + percussiveEnergy
      
      harmonicRatio.push(totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0)
    }
    
    return { harmonicRatio, harmonicSpectrum, percussiveSpectrum }
  }

  // Additional helper methods for advanced computations

  private createMelFilterBank(): Float32Array[] {
    const numFilters = this.config.melBands
    const fftSize = this.config.frameSize
    const sampleRate = this.config.sampleRate
    
    const melMin = this.hzToMel(this.config.minFreq)
    const melMax = this.hzToMel(this.config.maxFreq)
    const melPoints: number[] = []
    
    for (let i = 0; i <= numFilters + 1; i++) {
      melPoints.push(melMin + (melMax - melMin) * i / (numFilters + 1))
    }
    
    const hzPoints = melPoints.map(mel => this.melToHz(mel))
    const binPoints = hzPoints.map(hz => Math.floor((fftSize + 1) * hz / sampleRate))
    
    const filterBank: Float32Array[] = []
    
    for (let i = 1; i <= numFilters; i++) {
      const filter = new Float32Array(fftSize / 2 + 1)
      
      for (let j = binPoints[i - 1]; j < binPoints[i]; j++) {
        if (j >= 0 && j < filter.length) {
          filter[j] = (j - binPoints[i - 1]) / (binPoints[i] - binPoints[i - 1])
        }
      }
      
      for (let j = binPoints[i]; j < binPoints[i + 1]; j++) {
        if (j >= 0 && j < filter.length) {
          filter[j] = (binPoints[i + 1] - j) / (binPoints[i + 1] - binPoints[i])
        }
      }
      
      filterBank.push(filter)
    }
    
    return filterBank
  }

  private createChromaFilterBank(): Float32Array[] {
    const fftSize = this.config.frameSize
    const sampleRate = this.config.sampleRate
    const chromaBins = this.config.chromaBins
    
    const filterBank: Float32Array[] = []
    
    for (let bin = 0; bin < fftSize / 2 + 1; bin++) {
      const freq = (bin * sampleRate) / fftSize
      const filter = new Float32Array(chromaBins)
      
      if (freq > 0) {
        const pitchClass = this.frequencyToPitchClass(freq)
        if (pitchClass >= 0 && pitchClass < chromaBins) {
          // Apply tuning and normalization
          const tuning = 0 // A4 = 440 Hz tuning
          const normalizedPitch = (pitchClass - tuning) % chromaBins
          const chromaIndex = Math.round(normalizedPitch)
          
          if (chromaIndex >= 0 && chromaIndex < chromaBins) {
            filter[chromaIndex] = 1
          }
        }
      }
      
      filterBank.push(filter)
    }
    
    return filterBank
  }

  private createDCTMatrix(): Float32Array[] {
    const numCoeffs = 13
    const numBands = this.config.melBands
    const dctMatrix: Float32Array[] = []
    
    for (let k = 0; k < numCoeffs; k++) {
      const row = new Float32Array(numBands)
      for (let n = 0; n < numBands; n++) {
        row[n] = Math.cos(Math.PI * k * (2 * n + 1) / (2 * numBands))
      }
      dctMatrix.push(row)
    }
    
    return dctMatrix
  }

  // Mathematical helper functions

  private hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700)
  }

  private melToHz(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1)
  }

  private frequencyToPitchClass(freq: number): number {
    const a4 = 440
    const c0 = a4 * Math.pow(2, -4.75)
    if (freq <= 0) return -1
    const pitchClass = Math.round(12 * Math.log2(freq / c0)) % 12
    return pitchClass >= 0 ? pitchClass : pitchClass + 12
  }

  private modifiedBesselI0(x: number): number {
    let sum = 1
    let term = 1
    for (let i = 1; i < 50; i++) {
      term *= (x / (2 * i)) * (x / (2 * i))
      sum += term
      if (term < 1e-12) break
    }
    return sum
  }

  private computeFFT(signal: Float32Array): Float32Array {
    // Production FFT implementation using Cooley-Tukey algorithm
    const N = signal.length
    if (N <= 1) return signal

    const paddedN = Math.pow(2, Math.ceil(Math.log2(N)))
    const paddedSignal = new Float32Array(paddedN * 2)
    
    for (let i = 0; i < N; i++) {
      paddedSignal[i * 2] = signal[i]
      paddedSignal[i * 2 + 1] = 0
    }

    this.fftInPlace(paddedSignal, paddedN)
    return paddedSignal
  }

  private fftInPlace(data: Float32Array, N: number) {
    // Bit-reversal permutation
    let j = 0
    for (let i = 1; i < N; i++) {
      let bit = N >> 1
      while (j & bit) {
        j ^= bit
        bit >>= 1
      }
      j ^= bit

      if (i < j) {
        const tempReal = data[i * 2]
        const tempImag = data[i * 2 + 1]
        data[i * 2] = data[j * 2]
        data[i * 2 + 1] = data[j * 2 + 1]
        data[j * 2] = tempReal
        data[j * 2 + 1] = tempImag
      }
    }

    // Cooley-Tukey FFT
    for (let length = 2; length <= N; length <<= 1) {
      const angle = -2 * Math.PI / length
      const wlenReal = Math.cos(angle)
      const wlenImag = Math.sin(angle)

      for (let i = 0; i < N; i += length) {
        let wReal = 1
        let wImag = 0

        for (let j = 0; j < length / 2; j++) {
          const u = i + j
          const v = i + j + length / 2

          const uReal = data[u * 2]
          const uImag = data[u * 2 + 1]
          const vReal = data[v * 2]
          const vImag = data[v * 2 + 1]

          const tReal = vReal * wReal - vImag * wImag
          const tImag = vReal * wImag + vImag * wReal

          data[u * 2] = uReal + tReal
          data[u * 2 + 1] = uImag + tImag
          data[v * 2] = uReal - tReal
          data[v * 2 + 1] = uImag - tImag

          const tempReal = wReal * wlenReal - wImag * wlenImag
          wImag = wReal * wlenImag + wImag * wlenReal
          wReal = tempReal
        }
      }
    }
  }

  private applyMelFilterBank(spectrum: Float32Array): number[] {
    const melSpectrum: number[] = []
    
    for (const filter of this.melFilterBank) {
      let filterOutput = 0
      for (let i = 0; i < Math.min(spectrum.length, filter.length); i++) {
        filterOutput += spectrum[i] * filter[i]
      }
      melSpectrum.push(filterOutput)
    }
    
    return melSpectrum
  }

  private applyChromaFilterBank(spectrum: Float32Array): number[] {
    const chromaVector = new Array(this.config.chromaBins).fill(0)
    
    for (let bin = 0; bin < Math.min(spectrum.length, this.chromaFilterBank.length); bin++) {
      const filter = this.chromaFilterBank[bin]
      for (let chroma = 0; chroma < this.config.chromaBins; chroma++) {
        chromaVector[chroma] += spectrum[bin] * filter[chroma]
      }
    }
    
    // Normalize chroma vector
    const sum = chromaVector.reduce((a, b) => a + b, 0)
    return sum > 0 ? chromaVector.map(x => x / sum) : chromaVector
  }

  private applyDCT(input: number[]): number[] {
    const output: number[] = []
    
    for (const dctRow of this.dctMatrix) {
      let sum = 0
      for (let i = 0; i < Math.min(input.length, dctRow.length); i++) {
        sum += input[i] * dctRow[i]
      }
      output.push(sum)
    }
    
    return output
  }

  private computeTonnetz(chromaVector: number[]): number[] {
    // Compute tonnetz features from chroma vector
    const tonnetz: number[] = []
    
    // Major and minor thirds relationships
    const majorThirds = [0, 4, 8] // C, E, G#
    const minorThirds = [3, 7, 11] // Eb, G, B
    const perfectFifths = [0, 7, 2, 9, 4, 11] // Circle of fifths
    
    // Compute tonnetz coordinates
    let majorX = 0, majorY = 0, minorX = 0, minorY = 0, fifthX = 0, fifthY = 0
    
    for (let i = 0; i < chromaVector.length; i++) {
      const angle = 2 * Math.PI * i / 12
      const weight = chromaVector[i]
      
      if (majorThirds.includes(i)) {
        majorX += weight * Math.cos(angle)
        majorY += weight * Math.sin(angle)
      }
      
      if (minorThirds.includes(i)) {
        minorX += weight * Math.cos(angle)
        minorY += weight * Math.sin(angle)
      }
      
      if (perfectFifths.includes(i)) {
        const fifthAngle = 2 * Math.PI * perfectFifths.indexOf(i) / perfectFifths.length
        fifthX += weight * Math.cos(fifthAngle)
        fifthY += weight * Math.sin(fifthAngle)
      }
    }
    
    tonnetz.push(majorX, majorY, minorX, minorY, fifthX, fifthY)
    return tonnetz
  }

  private computeSpectralContrast(spectrum: Float32Array): number[] {
    const numBands = 6
    const contrast: number[] = []
    
    const bandEdges = [0, 200, 400, 800, 1600, 3200, 8000].map(
      freq => Math.floor((freq * 2 * spectrum.length) / this.config.sampleRate)
    )
    
    for (let band = 0; band < numBands; band++) {
      const startBin = bandEdges[band]
      const endBin = Math.min(bandEdges[band + 1], spectrum.length - 1)
      
      if (startBin >= endBin) {
        contrast.push(0)
        continue
      }
      
      const bandSpectrum = spectrum.slice(startBin, endBin + 1)
      bandSpectrum.sort((a, b) => b - a) // Sort descending
      
      const peakEnergy = bandSpectrum.slice(0, Math.floor(bandSpectrum.length * 0.2))
        .reduce((sum, val) => sum + val, 0)
      const valleyEnergy = bandSpectrum.slice(Math.floor(bandSpectrum.length * 0.8))
        .reduce((sum, val) => sum + val, 0)
      
      const contrastValue = valleyEnergy > 0 
        ? Math.log10((peakEnergy + 1e-10) / (valleyEnergy + 1e-10))
        : 0
        
      contrast.push(contrastValue)
    }
    
    return contrast
  }

  private estimateZeroCrossingRate(spectrum: Float32Array): number {
    // Estimate ZCR from spectral centroid (approximation)
    let weightedSum = 0
    let magnitudeSum = 0
    
    for (let i = 1; i < spectrum.length; i++) {
      const freq = (i * this.config.sampleRate) / (2 * spectrum.length)
      weightedSum += freq * spectrum[i]
      magnitudeSum += spectrum[i]
    }
    
    const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0
    return centroid / (this.config.sampleRate / 2) // Normalized ZCR estimate
  }

  private detectOnsets(magnitudeSpectrograms: Float32Array[]): number[] {
    const onsetStrength: number[] = []
    let previousSpectrum: Float32Array | null = null
    
    for (const spectrum of magnitudeSpectrograms) {
      if (previousSpectrum) {
        let flux = 0
        for (let i = 0; i < spectrum.length; i++) {
          const diff = spectrum[i] - previousSpectrum[i]
          flux += Math.max(0, diff) // Positive differences only
        }
        onsetStrength.push(flux)
      } else {
        onsetStrength.push(0)
      }
      previousSpectrum = spectrum
    }
    
    return onsetStrength
  }

  private estimateTempo(onsetStrength: number[]): { tempo: number; confidence: number } {
    if (onsetStrength.length < 10) {
      return { tempo: 120, confidence: 0 }
    }
    
    // Autocorrelation-based tempo estimation
    const maxLag = Math.min(Math.floor(onsetStrength.length / 2), 200)
    const autocorr: number[] = []
    
    for (let lag = 0; lag < maxLag; lag++) {
      let correlation = 0
      for (let i = 0; i < onsetStrength.length - lag; i++) {
        correlation += onsetStrength[i] * onsetStrength[i + lag]
      }
      autocorr.push(correlation)
    }
    
    // Find peaks in autocorrelation
    const peaks: { lag: number; value: number }[] = []
    for (let i = 1; i < autocorr.length - 1; i++) {
      if (autocorr[i] > autocorr[i - 1] && autocorr[i] > autocorr[i + 1]) {
        peaks.push({ lag: i, value: autocorr[i] })
      }
    }
    
    if (peaks.length === 0) {
      return { tempo: 120, confidence: 0 }
    }
    
    // Find the most prominent peak
    peaks.sort((a, b) => b.value - a.value)
    const bestPeak = peaks[0]
    
    // Convert lag to BPM
    const hopTimeSeconds = this.config.hopSize / this.config.sampleRate
    const periodSeconds = bestPeak.lag * hopTimeSeconds
    const bpm = periodSeconds > 0 ? 60 / periodSeconds : 120
    
    // Ensure BPM is in reasonable range
    let adjustedBpm = bpm
    while (adjustedBpm < 60) adjustedBpm *= 2
    while (adjustedBpm > 200) adjustedBpm /= 2
    
    // Calculate confidence based on peak prominence
    const confidence = bestPeak.value / Math.max(...autocorr)
    
    return { tempo: Math.round(adjustedBpm), confidence }
  }

  private computeBeatSpectrum(onsetStrength: number[]): number[] {
    // Compute beat spectrum using FFT of onset strength
    const paddedLength = Math.pow(2, Math.ceil(Math.log2(onsetStrength.length)))
    const paddedOnsets = new Float32Array(paddedLength)
    
    for (let i = 0; i < onsetStrength.length; i++) {
      paddedOnsets[i] = onsetStrength[i]
    }
    
    const fftResult = this.computeFFT(paddedOnsets)
    const beatSpectrum: number[] = []
    
    for (let i = 0; i < fftResult.length / 2; i++) {
      const real = fftResult[i * 2]
      const imag = fftResult[i * 2 + 1]
      beatSpectrum.push(Math.sqrt(real * real + imag * imag))
    }
    
    return beatSpectrum
  }

  private analyzeRhythmPatterns(onsetStrength: number[], tempo: number): number[][] {
    const patterns: number[][] = []
    const beatsPerBar = 4
    const hopTimeSeconds = this.config.hopSize / this.config.sampleRate
    const beatPeriod = 60 / tempo // seconds per beat
    const framesPerBeat = Math.round(beatPeriod / hopTimeSeconds)
    
    if (framesPerBeat <= 0 || framesPerBeat * beatsPerBar > onsetStrength.length) {
      return patterns
    }
    
    // Extract rhythm patterns for each bar
    const barsCount = Math.floor(onsetStrength.length / (framesPerBeat * beatsPerBar))
    
    for (let bar = 0; bar < barsCount; bar++) {
      const barStart = bar * framesPerBeat * beatsPerBar
      const pattern: number[] = []
      
      for (let beat = 0; beat < beatsPerBar; beat++) {
        const beatStart = barStart + beat * framesPerBeat
        const beatEnd = Math.min(beatStart + framesPerBeat, onsetStrength.length)
        
        // Sum onset strength within this beat
        let beatStrength = 0
        for (let i = beatStart; i < beatEnd; i++) {
          beatStrength += onsetStrength[i]
        }
        
        pattern.push(beatStrength / (beatEnd - beatStart))
      }
      
      patterns.push(pattern)
    }
    
    return patterns
  }

  private separateHarmonicPercussive(
    magnitudeSpectrograms: Float32Array[],
    frameIndex: number
  ): { harmonic: Float32Array; percussive: Float32Array } {
    const spectrum = magnitudeSpectrograms[frameIndex]
    const harmonic = new Float32Array(spectrum.length)
    const percussive = new Float32Array(spectrum.length)
    
    // Use median filtering for separation
    const timeWindowSize = 17 // frames
    const freqWindowSize = 17 // bins
    
    for (let bin = 0; bin < spectrum.length; bin++) {
      // Temporal median (for harmonic component)
      const timeWindow: number[] = []
      const startFrame = Math.max(0, frameIndex - Math.floor(timeWindowSize / 2))
      const endFrame = Math.min(magnitudeSpectrograms.length - 1, frameIndex + Math.floor(timeWindowSize / 2))
      
      for (let f = startFrame; f <= endFrame; f++) {
        if (bin < magnitudeSpectrograms[f].length) {
          timeWindow.push(magnitudeSpectrograms[f][bin])
        }
      }
      
      // Frequency median (for percussive component)
      const freqWindow: number[] = []
      const startBin = Math.max(0, bin - Math.floor(freqWindowSize / 2))
      const endBin = Math.min(spectrum.length - 1, bin + Math.floor(freqWindowSize / 2))
      
      for (let b = startBin; b <= endBin; b++) {
        freqWindow.push(spectrum[b])
      }
      
      // Compute medians
      timeWindow.sort((a, b) => a - b)
      freqWindow.sort((a, b) => a - b)
      
      const timeMedian = timeWindow[Math.floor(timeWindow.length / 2)]
      const freqMedian = freqWindow[Math.floor(freqWindow.length / 2)]
      
      // Separate based on which median is closer to original value
      const originalValue = spectrum[bin]
      const timeDistance = Math.abs(originalValue - timeMedian)
      const freqDistance = Math.abs(originalValue - freqMedian)
      
      if (timeDistance < freqDistance) {
        harmonic[bin] = originalValue
        percussive[bin] = 0
      } else {
        harmonic[bin] = 0
        percussive[bin] = originalValue
      }
    }
    
    return { harmonic, percussive }
  }

  private computeStatistics(values: number[]): {
    mean: number[]
    std: number[]
    min: number[]
    max: number[]
    percentiles: {
      p25: number[]
      p50: number[]
      p75: number[]
      p90: number[]
      p95: number[]
    }
  } {
    if (values.length === 0) {
      return {
        mean: [],
        std: [],
        min: [],
        max: [],
        percentiles: { p25: [], p50: [], p75: [], p90: [], p95: [] }
      }
    }
    
    const sorted = [...values].sort((a, b) => a - b)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const std = Math.sqrt(variance)
    
    const percentile = (p: number) => {
      const index = Math.floor((p / 100) * (sorted.length - 1))
      return sorted[index]
    }
    
    return {
      mean: [mean],
      std: [std],
      min: [sorted[0]],
      max: [sorted[sorted.length - 1]],
      percentiles: {
        p25: [percentile(25)],
        p50: [percentile(50)],
        p75: [percentile(75)],
        p90: [percentile(90)],
        p95: [percentile(95)]
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
  }
}

interface Complex {
  real: number
  imag: number
}

// Singleton instance for production use
export const spectralAnalyzer = new ProductionSpectralAnalyzer()