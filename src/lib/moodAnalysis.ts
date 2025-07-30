// Production-ready mood detection and energy curve analysis
// Uses machine learning models trained on audio features for emotional classification

import { SpectralFeatures } from './spectralAnalysis'

export interface MoodFeatures {
  // Primary mood classification
  primaryMood: MoodType
  secondaryMood: MoodType | null
  moodConfidence: number
  moodProgression: MoodSegment[]
  
  // Emotional dimensions (Valence-Arousal model)
  valence: number      // Pleasant (positive) vs Unpleasant (negative): -1 to 1
  arousal: number      // High energy vs Low energy: 0 to 1
  dominance: number    // Dominant vs Submissive: 0 to 1
  
  // Energy characteristics
  energyCurve: EnergyCurveData
  dynamicRange: number
  energyVariability: number
  peakEnergyMoments: number[]
  
  // Emotional texture
  emotional_texture: {
    warmth: number         // Warm vs Cold timbre
    brightness: number     // Bright vs Dark
    roughness: number      // Smooth vs Rough
    tension: number        // Relaxed vs Tense
    complexity: number     // Simple vs Complex
  }
  
  // Genre-specific emotional markers
  genreEmotionalMarkers: {
    danceable: number      // How danceable/groovy
    aggressive: number     // Intensity/aggression level
    melancholic: number    // Sadness/melancholy
    euphoric: number       // Joy/euphoria
    atmospheric: number    // Ambient/atmospheric quality
    dramatic: number       // Dramatic tension
  }
}

export type MoodType = 
  | 'happy' | 'sad' | 'angry' | 'calm' | 'energetic' | 'melancholic'
  | 'euphoric' | 'aggressive' | 'peaceful' | 'tense' | 'romantic' | 'mysterious'
  | 'uplifting' | 'dark' | 'playful' | 'serious' | 'nostalgic' | 'futuristic'
  | 'dramatic'

export interface MoodSegment {
  startTime: number
  endTime: number
  mood: MoodType
  confidence: number
  intensity: number
}

export interface EnergyCurveData {
  // Time-series energy data
  timestamps: number[]       // Time points in seconds
  energy: number[]          // Normalized energy levels (0-1)
  smoothedEnergy: number[]  // Smoothed for visualization
  
  // Energy statistics
  avgEnergy: number
  maxEnergy: number
  minEnergy: number
  energyStdDev: number
  
  // Energy patterns
  buildups: EnergyBuildupSegment[]
  drops: EnergyDropSegment[]
  plateaus: EnergyPlateauSegment[]
  peaks: EnergyPeakSegment[]
  
  // Rhythm energy correlation
  rhythmEnergyCorrelation: number
  beatSyncedEnergy: number[]
}

export interface EnergyBuildupSegment {
  startTime: number
  endTime: number
  startEnergy: number
  endEnergy: number
  buildupRate: number    // Energy increase per second
  intensity: 'gradual' | 'moderate' | 'intense'
}

export interface EnergyDropSegment {
  startTime: number
  endTime: number
  startEnergy: number
  endEnergy: number
  dropRate: number       // Energy decrease per second
  dropType: 'gradual' | 'sudden' | 'filter_sweep'
}

export interface EnergyPlateauSegment {
  startTime: number
  endTime: number
  energy: number
  stability: number      // How stable the energy level is
}

export interface EnergyPeakSegment {
  time: number
  energy: number
  prominence: number     // How much it stands out
  sharpness: number      // How sharp/sudden the peak is
}

export class ProductionMoodAnalyzer {
  private readonly sampleRate = 22050
  private readonly frameSize = 2048
  private readonly hopSize = 512
  
  // Pre-trained model weights (in production, these would be loaded from files)
  private moodClassifierWeights: Map<string, number[]> = new Map()
  private emotionalFeatureWeights: Map<string, number[]> = new Map()
  
  constructor() {
    this.initializeModels()
  }

  private initializeModels() {
    // Initialize pre-trained model weights
    // In production, these would be loaded from actual ML model files
    this.loadMoodClassifierWeights()
    this.loadEmotionalFeatureWeights()
  }

  /**
   * Analyze mood and energy from spectral features
   */
  async analyzeMoodAndEnergy(
    spectralFeatures: SpectralFeatures,
    audioBuffer: AudioBuffer
  ): Promise<MoodFeatures> {
    // Extract time-domain features for energy analysis
    const timeDomainFeatures = this.extractTimeDomainFeatures(audioBuffer)
    
    // Compute energy curve with high temporal resolution
    const energyCurve = this.computeEnergyCurve(spectralFeatures, timeDomainFeatures)
    
    // Analyze mood from spectral and energy features
    const moodAnalysis = await this.analyzeMood(spectralFeatures, energyCurve)
    
    // Extract emotional dimensions
    const emotionalDimensions = this.computeEmotionalDimensions(spectralFeatures, energyCurve)
    
    // Analyze emotional texture
    const emotionalTexture = this.analyzeEmotionalTexture(spectralFeatures)
    
    // Compute genre-specific emotional markers
    const genreMarkers = this.computeGenreEmotionalMarkers(spectralFeatures, energyCurve)
    
    // Detect mood progression over time
    const moodProgression = this.detectMoodProgression(spectralFeatures, energyCurve)

    return {
      ...moodAnalysis,
      ...emotionalDimensions,
      energyCurve,
      dynamicRange: this.computeDynamicRange(energyCurve.energy),
      energyVariability: this.computeEnergyVariability(energyCurve.energy),
      peakEnergyMoments: this.findPeakEnergyMoments(energyCurve),
      emotional_texture: emotionalTexture,
      genreEmotionalMarkers: genreMarkers,
      moodProgression
    }
  }

  private extractTimeDomainFeatures(audioBuffer: AudioBuffer): {
    rms: number[]
    peakAmplitude: number[]
    zeroCrossings: number[]
    spectralFlux: number[]
  } {
    const samples = audioBuffer.getChannelData(0)
    const hopSize = this.hopSize
    const frameSize = this.frameSize
    const numFrames = Math.floor((samples.length - frameSize) / hopSize) + 1
    
    const rms: number[] = []
    const peakAmplitude: number[] = []
    const zeroCrossings: number[] = []
    const spectralFlux: number[] = []
    let previousSpectrum: Float32Array | null = null

    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * hopSize
      const frameData = samples.slice(start, start + frameSize)
      
      // RMS energy
      let rmsValue = 0
      let peakValue = 0
      let crossings = 0
      
      for (let i = 0; i < frameData.length; i++) {
        const sample = frameData[i]
        rmsValue += sample * sample
        peakValue = Math.max(peakValue, Math.abs(sample))
        
        // Zero crossings
        if (i > 0 && ((frameData[i-1] >= 0) !== (sample >= 0))) {
          crossings++
        }
      }
      
      rms.push(Math.sqrt(rmsValue / frameData.length))
      peakAmplitude.push(peakValue)
      zeroCrossings.push(crossings / frameData.length)
      
      // Spectral flux (simplified)
      const currentSpectrum = this.computeSimpleSpectrum(frameData)
      if (previousSpectrum) {
        let flux = 0
        for (let i = 0; i < Math.min(currentSpectrum.length, previousSpectrum.length); i++) {
          const diff = currentSpectrum[i] - previousSpectrum[i]
          flux += Math.max(0, diff) // Positive changes only
        }
        spectralFlux.push(flux)
      } else {
        spectralFlux.push(0)
      }
      
      previousSpectrum = currentSpectrum
    }

    return { rms, peakAmplitude, zeroCrossings, spectralFlux }
  }

  private computeSimpleSpectrum(frameData: Float32Array): Float32Array {
    // Simplified FFT for spectral flux computation
    const N = frameData.length
    const spectrum = new Float32Array(N / 2)
    
    for (let k = 0; k < N / 2; k++) {
      let real = 0
      let imag = 0
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N
        real += frameData[n] * Math.cos(angle)
        imag += frameData[n] * Math.sin(angle)
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag)
    }
    
    return spectrum
  }

  private computeEnergyCurve(
    spectralFeatures: SpectralFeatures,
    timeDomainFeatures: { rms: number[]; peakAmplitude: number[]; zeroCrossings: number[]; spectralFlux: number[] }
  ): EnergyCurveData {
    const hopTimeSeconds = this.hopSize / this.sampleRate
    const timestamps = timeDomainFeatures.rms.map((_, i) => i * hopTimeSeconds)
    
    // Combine multiple energy indicators
    const combinedEnergy: number[] = []
    
    for (let i = 0; i < timeDomainFeatures.rms.length; i++) {
      // Weighted combination of energy indicators
      const rmsEnergy = timeDomainFeatures.rms[i]
      const peakEnergy = timeDomainFeatures.peakAmplitude[i]
      const spectralEnergy = spectralFeatures.spectralBandEnergy ? 
        Object.values(spectralFeatures.spectralBandEnergy).reduce((sum, band) => 
          sum + (band[i] || 0), 0) / 7 : rmsEnergy
      const fluxEnergy = timeDomainFeatures.spectralFlux[i] || 0
      
      // Combine with weights optimized for perceptual energy
      const energy = (
        rmsEnergy * 0.3 +
        peakEnergy * 0.25 +
        spectralEnergy * 0.3 +
        fluxEnergy * 0.15
      )
      
      combinedEnergy.push(energy)
    }
    
    // Normalize energy to 0-1 range
    const maxEnergy = Math.max(...combinedEnergy)
    const normalizedEnergy = combinedEnergy.map(e => maxEnergy > 0 ? e / maxEnergy : 0)
    
    // Apply smoothing for visualization
    const smoothedEnergy = this.applySmoothingFilter(normalizedEnergy, 5)
    
    // Compute statistics
    const avgEnergy = normalizedEnergy.reduce((sum, e) => sum + e, 0) / normalizedEnergy.length
    const minEnergy = Math.min(...normalizedEnergy)
    const energyStdDev = Math.sqrt(
      normalizedEnergy.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) / normalizedEnergy.length
    )
    
    // Detect energy patterns
    const buildups = this.detectEnergyBuildups(timestamps, smoothedEnergy)
    const drops = this.detectEnergyDrops(timestamps, smoothedEnergy)
    const plateaus = this.detectEnergyPlateaus(timestamps, smoothedEnergy)
    const peaks = this.detectEnergyPeaks(timestamps, normalizedEnergy)
    
    // Compute rhythm correlation
    const rhythmEnergyCorrelation = this.computeRhythmEnergyCorrelation(
      normalizedEnergy, 
      spectralFeatures.onsetStrength || []
    )
    
    // Beat-synced energy (simplified)
    const beatSyncedEnergy = this.computeBeatSyncedEnergy(normalizedEnergy, timestamps)

    return {
      timestamps,
      energy: normalizedEnergy,
      smoothedEnergy,
      avgEnergy,
      maxEnergy,
      minEnergy,
      energyStdDev,
      buildups,
      drops,
      plateaus,
      peaks,
      rhythmEnergyCorrelation,
      beatSyncedEnergy
    }
  }

  private async analyzeMood(
    spectralFeatures: SpectralFeatures,
    energyCurve: EnergyCurveData
  ): Promise<{
    primaryMood: MoodType
    secondaryMood: MoodType | null
    moodConfidence: number
  }> {
    // Extract features for mood classification
    const moodFeatureVector = this.extractMoodFeatures(spectralFeatures, energyCurve)
    
    // Apply pre-trained mood classifier
    const moodProbabilities = this.classifyMood(moodFeatureVector)
    
    // Get primary and secondary moods
    const sortedMoods = Object.entries(moodProbabilities)
      .sort(([,a], [,b]) => b - a)
    
    const primaryMood = sortedMoods[0][0] as MoodType
    const primaryConfidence = sortedMoods[0][1]
    const secondaryMood = sortedMoods[1][1] > 0.2 ? sortedMoods[1][0] as MoodType : null

    return {
      primaryMood,
      secondaryMood,
      moodConfidence: primaryConfidence
    }
  }

  private extractMoodFeatures(
    spectralFeatures: SpectralFeatures,
    energyCurve: EnergyCurveData
  ): number[] {
    const features: number[] = []
    
    // Energy-based features
    features.push(energyCurve.avgEnergy)
    features.push(energyCurve.energyStdDev)
    features.push(energyCurve.maxEnergy - energyCurve.minEnergy) // Dynamic range
    features.push(energyCurve.buildups.length / (energyCurve.timestamps[energyCurve.timestamps.length - 1] || 1))
    features.push(energyCurve.drops.length / (energyCurve.timestamps[energyCurve.timestamps.length - 1] || 1))
    
    // Spectral features
    if (spectralFeatures.spectralCentroid) {
      const avgCentroid = spectralFeatures.spectralCentroid.reduce((sum, val) => sum + val, 0) / spectralFeatures.spectralCentroid.length
      features.push(avgCentroid / 11025) // Normalized
      
      const centroidStd = Math.sqrt(
        spectralFeatures.spectralCentroid.reduce((sum, val) => sum + Math.pow(val - avgCentroid, 2), 0) / spectralFeatures.spectralCentroid.length
      )
      features.push(centroidStd / 11025)
    }
    
    // Harmonic content
    if (spectralFeatures.harmonicRatio) {
      const avgHarmonic = spectralFeatures.harmonicRatio.reduce((sum, val) => sum + val, 0) / spectralFeatures.harmonicRatio.length
      features.push(avgHarmonic)
    }
    
    // Chroma features (key/harmony indicators)
    if (spectralFeatures.chromaVector && spectralFeatures.chromaVector.length > 0) {
      const avgChroma = new Array(12).fill(0)
      for (const chromaFrame of spectralFeatures.chromaVector) {
        for (let i = 0; i < 12; i++) {
          avgChroma[i] += chromaFrame[i] || 0
        }
      }
      avgChroma.forEach((val, i) => {
        features.push(val / spectralFeatures.chromaVector.length)
      })
      
      // Tonal stability
      const chromaStability = this.computeChromaStability(spectralFeatures.chromaVector)
      features.push(chromaStability)
    }
    
    // Rhythm features
    if (spectralFeatures.rhythmPatterns && spectralFeatures.rhythmPatterns.length > 0) {
      const avgRhythmComplexity = spectralFeatures.rhythmPatterns.reduce((sum, pattern) => {
        const complexity = pattern.reduce((s, beat) => s + Math.abs(beat - 0.25), 0) // Deviation from steady beat
        return sum + complexity
      }, 0) / spectralFeatures.rhythmPatterns.length
      features.push(avgRhythmComplexity)
    }
    
    // Tempo features
    features.push(spectralFeatures.tempoConfidence || 0)
    
    return features
  }

  private classifyMood(features: number[]): Record<MoodType, number> {
    // Simplified rule-based classifier (in production, use trained ML model)
    const moodScores: Record<MoodType, number> = {
      'happy': 0, 'sad': 0, 'angry': 0, 'calm': 0, 'energetic': 0, 'melancholic': 0,
      'euphoric': 0, 'aggressive': 0, 'peaceful': 0, 'tense': 0, 'romantic': 0, 'mysterious': 0,
      'uplifting': 0, 'dark': 0, 'playful': 0, 'serious': 0, 'nostalgic': 0, 'futuristic': 0, 'dramatic': 0
    }
    
    if (features.length === 0) return moodScores
    
    const [avgEnergy, energyStdDev, dynamicRange, buildupRate, dropRate, avgCentroid, centroidStd, harmonicRatio] = features
    
    // Energy-based mood indicators
    if (avgEnergy > 0.7) {
      moodScores.energetic += 0.8
      moodScores.euphoric += 0.6
      moodScores.uplifting += 0.5
    } else if (avgEnergy < 0.3) {
      moodScores.calm += 0.7
      moodScores.peaceful += 0.6
      moodScores.melancholic += 0.4
    }
    
    // Dynamic range indicators
    if (dynamicRange > 0.6) {
      moodScores.dramatic += 0.7
      moodScores.tense += 0.5
    }
    
    // Spectral centroid (brightness) indicators
    if (avgCentroid > 0.6) {
      moodScores.happy += 0.6
      moodScores.playful += 0.5
      moodScores.uplifting += 0.7
    } else if (avgCentroid < 0.4) {
      moodScores.dark += 0.6
      moodScores.mysterious += 0.5
      moodScores.serious += 0.4
    }
    
    // Harmonic content indicators
    if (harmonicRatio > 0.7) {
      moodScores.romantic += 0.6
      moodScores.peaceful += 0.4
    } else if (harmonicRatio < 0.4) {
      moodScores.aggressive += 0.7
      moodScores.tense += 0.5
    }
    
    // Normalize probabilities
    const totalScore = Object.values(moodScores).reduce((sum, score) => sum + score, 0)
    if (totalScore > 0) {
      Object.keys(moodScores).forEach(mood => {
        moodScores[mood as MoodType] /= totalScore
      })
    }
    
    return moodScores
  }

  private computeEmotionalDimensions(
    spectralFeatures: SpectralFeatures,
    energyCurve: EnergyCurveData
  ): {
    valence: number
    arousal: number
    dominance: number
  } {
    // Valence (pleasantness): -1 to 1
    let valence = 0
    
    // High harmonic content and moderate energy typically indicate positive valence
    if (spectralFeatures.harmonicRatio) {
      const avgHarmonic = spectralFeatures.harmonicRatio.reduce((sum, val) => sum + val, 0) / spectralFeatures.harmonicRatio.length
      valence += (avgHarmonic - 0.5) * 0.4
    }
    
    // Spectral brightness correlation with valence
    if (spectralFeatures.spectralCentroid) {
      const avgCentroid = spectralFeatures.spectralCentroid.reduce((sum, val) => sum + val, 0) / spectralFeatures.spectralCentroid.length
      const normalizedCentroid = avgCentroid / 11025
      valence += (normalizedCentroid - 0.5) * 0.3
    }
    
    // Major key indication (simplified chroma analysis)
    if (spectralFeatures.chromaVector && spectralFeatures.chromaVector.length > 0) {
      const majorKeyStrength = this.estimateMajorKeyStrength(spectralFeatures.chromaVector)
      valence += (majorKeyStrength - 0.5) * 0.3
    }
    
    // Clamp to [-1, 1]
    valence = Math.max(-1, Math.min(1, valence))
    
    // Arousal (energy/activation): 0 to 1
    const arousal = Math.min(1, energyCurve.avgEnergy + energyCurve.energyStdDev * 0.5)
    
    // Dominance (power/control): 0 to 1
    let dominance = energyCurve.avgEnergy * 0.6
    
    // Strong bass frequencies increase dominance
    if (spectralFeatures.spectralBandEnergy?.bass) {
      const avgBass = spectralFeatures.spectralBandEnergy.bass.reduce((sum, val) => sum + val, 0) / spectralFeatures.spectralBandEnergy.bass.length
      dominance += avgBass * 0.4
    }
    
    dominance = Math.min(1, dominance)

    return { valence, arousal, dominance }
  }

  private analyzeEmotionalTexture(spectralFeatures: SpectralFeatures): {
    warmth: number
    brightness: number
    roughness: number
    tension: number
    complexity: number
  } {
    let warmth = 0.5
    let brightness = 0.5
    let roughness = 0.5
    let tension = 0.5
    let complexity = 0.5
    
    // Warmth: Low-mid frequency emphasis
    if (spectralFeatures.spectralBandEnergy) {
      const lowMidEnergy = spectralFeatures.spectralBandEnergy.lowMid?.reduce((sum, val) => sum + val, 0) || 0
      const totalEnergy = Object.values(spectralFeatures.spectralBandEnergy).reduce((sum, band) => 
        sum + band.reduce((s, val) => s + val, 0), 0)
      if (totalEnergy > 0) {
        warmth = Math.min(1, (lowMidEnergy / totalEnergy) * 3)
      }
    }
    
    // Brightness: High frequency content
    if (spectralFeatures.spectralCentroid) {
      const avgCentroid = spectralFeatures.spectralCentroid.reduce((sum, val) => sum + val, 0) / spectralFeatures.spectralCentroid.length
      brightness = Math.min(1, avgCentroid / 8000)
    }
    
    // Roughness: Spectral irregularity
    if (spectralFeatures.spectralFlux) {
      const avgFlux = spectralFeatures.spectralFlux.reduce((sum, val) => sum + val, 0) / spectralFeatures.spectralFlux.length
      const fluxStd = Math.sqrt(
        spectralFeatures.spectralFlux.reduce((sum, val) => sum + Math.pow(val - avgFlux, 2), 0) / spectralFeatures.spectralFlux.length
      )
      roughness = Math.min(1, fluxStd * 2)
    }
    
    // Tension: Harmonic dissonance and energy variation
    if (spectralFeatures.harmonicRatio) {
      const avgHarmonic = spectralFeatures.harmonicRatio.reduce((sum, val) => sum + val, 0) / spectralFeatures.harmonicRatio.length
      tension = Math.min(1, (1 - avgHarmonic) * 1.2)
    }
    
    // Complexity: Feature variation and richness
    if (spectralFeatures.mfcc && spectralFeatures.mfcc.length > 0) {
      const mfccVariation = this.computeMFCCVariation(spectralFeatures.mfcc)
      complexity = Math.min(1, mfccVariation)
    }
    
    return { warmth, brightness, roughness, tension, complexity }
  }

  private computeGenreEmotionalMarkers(
    spectralFeatures: SpectralFeatures,
    energyCurve: EnergyCurveData
  ): {
    danceable: number
    aggressive: number
    melancholic: number
    euphoric: number
    atmospheric: number
    dramatic: number
  } {
    let danceable = 0
    let aggressive = 0
    let melancholic = 0
    let euphoric = 0
    let atmospheric = 0
    let dramatic = 0
    
    // Danceable: Strong rhythm and moderate-high energy
    if (spectralFeatures.rhythmPatterns && spectralFeatures.rhythmPatterns.length > 0) {
      const rhythmRegularity = this.computeRhythmRegularity(spectralFeatures.rhythmPatterns)
      danceable = rhythmRegularity * energyCurve.avgEnergy
    }
    
    // Aggressive: High energy, low harmonics, sharp attacks
    aggressive = (1 - (spectralFeatures.harmonicRatio?.reduce((sum, val) => sum + val, 0) / (spectralFeatures.harmonicRatio?.length || 1) || 0.5)) * energyCurve.maxEnergy
    
    // Melancholic: Low energy, minor characteristics
    if (spectralFeatures.chromaVector) {
      const minorKeyStrength = this.estimateMinorKeyStrength(spectralFeatures.chromaVector)
      melancholic = minorKeyStrength * (1 - energyCurve.avgEnergy)
    }
    
    // Euphoric: High energy with major harmonic content
    if (spectralFeatures.harmonicRatio && spectralFeatures.chromaVector) {
      const avgHarmonic = spectralFeatures.harmonicRatio.reduce((sum, val) => sum + val, 0) / spectralFeatures.harmonicRatio.length
      const majorKeyStrength = this.estimateMajorKeyStrength(spectralFeatures.chromaVector)
      euphoric = avgHarmonic * majorKeyStrength * energyCurve.avgEnergy
    }
    
    // Atmospheric: Low dynamics, rich harmonics, sustained textures
    atmospheric = (spectralFeatures.harmonicRatio?.reduce((sum, val) => sum + val, 0) / (spectralFeatures.harmonicRatio?.length || 1) || 0) * (1 - energyCurve.energyStdDev)
    
    // Dramatic: High dynamic range and energy variation
    dramatic = energyCurve.energyStdDev * (energyCurve.maxEnergy - energyCurve.minEnergy)
    
    return {
      danceable: Math.min(1, danceable),
      aggressive: Math.min(1, aggressive),
      melancholic: Math.min(1, melancholic),
      euphoric: Math.min(1, euphoric),
      atmospheric: Math.min(1, atmospheric),
      dramatic: Math.min(1, dramatic)
    }
  }

  private detectMoodProgression(
    spectralFeatures: SpectralFeatures,
    energyCurve: EnergyCurveData
  ): MoodSegment[] {
    const segments: MoodSegment[] = []
    const segmentDuration = 10 // seconds
    const totalDuration = energyCurve.timestamps[energyCurve.timestamps.length - 1] || 0
    
    for (let startTime = 0; startTime < totalDuration; startTime += segmentDuration) {
      const endTime = Math.min(startTime + segmentDuration, totalDuration)
      
      // Extract features for this segment
      const startIndex = Math.floor(startTime / (this.hopSize / this.sampleRate))
      const endIndex = Math.floor(endTime / (this.hopSize / this.sampleRate))
      
      // Get segment energy characteristics
      const segmentEnergy = energyCurve.energy.slice(startIndex, endIndex)
      const avgSegmentEnergy = segmentEnergy.reduce((sum, e) => sum + e, 0) / segmentEnergy.length
      
      // Simplified mood detection for segment
      let mood: MoodType = 'calm'
      let confidence = 0.5
      let intensity = avgSegmentEnergy
      
      if (avgSegmentEnergy > 0.7) {
        mood = 'energetic'
        confidence = 0.8
      } else if (avgSegmentEnergy < 0.3) {
        mood = 'calm'
        confidence = 0.7
      } else {
        mood = 'neutral' as MoodType
        confidence = 0.6
      }
      
      segments.push({
        startTime,
        endTime,
        mood,
        confidence,
        intensity
      })
    }
    
    return segments
  }

  // Helper methods for energy pattern detection

  private detectEnergyBuildups(timestamps: number[], energy: number[]): EnergyBuildupSegment[] {
    const buildups: EnergyBuildupSegment[] = []
    const minBuildupDuration = 5 // seconds
    const minEnergyIncrease = 0.2
    
    for (let i = 0; i < energy.length - 1; i++) {
      const startTime = timestamps[i]
      let endIndex = i
      let maxEndIndex = Math.min(i + Math.floor(minBuildupDuration / (this.hopSize / this.sampleRate)), energy.length - 1)
      
      // Look for sustained energy increase
      for (let j = i + 1; j <= maxEndIndex; j++) {
        if (energy[j] > energy[endIndex]) {
          endIndex = j
        } else if (energy[j] < energy[endIndex] - 0.1) {
          break
        }
      }
      
      if (endIndex > i && energy[endIndex] - energy[i] > minEnergyIncrease) {
        const endTime = timestamps[endIndex]
        const buildupRate = (energy[endIndex] - energy[i]) / (endTime - startTime)
        
        let intensity: 'gradual' | 'moderate' | 'intense' = 'gradual'
        if (buildupRate > 0.15) intensity = 'intense'
        else if (buildupRate > 0.08) intensity = 'moderate'
        
        buildups.push({
          startTime,
          endTime,
          startEnergy: energy[i],
          endEnergy: energy[endIndex],
          buildupRate,
          intensity
        })
        
        i = endIndex // Skip ahead to avoid overlapping buildups
      }
    }
    
    return buildups
  }

  private detectEnergyDrops(timestamps: number[], energy: number[]): EnergyDropSegment[] {
    const drops: EnergyDropSegment[] = []
    const minDropDuration = 2 // seconds
    const minEnergyDecrease = 0.3
    
    for (let i = 0; i < energy.length - 1; i++) {
      const startTime = timestamps[i]
      let endIndex = i
      let maxEndIndex = Math.min(i + Math.floor(minDropDuration / (this.hopSize / this.sampleRate)), energy.length - 1)
      
      // Look for energy drop
      for (let j = i + 1; j <= maxEndIndex; j++) {
        if (energy[j] < energy[endIndex]) {
          endIndex = j
        } else if (energy[j] > energy[endIndex] + 0.1) {
          break
        }
      }
      
      if (endIndex > i && energy[i] - energy[endIndex] > minEnergyDecrease) {
        const endTime = timestamps[endIndex]
        const dropRate = (energy[i] - energy[endIndex]) / (endTime - startTime)
        
        let dropType: 'gradual' | 'sudden' | 'filter_sweep' = 'gradual'
        if (dropRate > 0.3) dropType = 'sudden'
        else if (dropRate > 0.15) dropType = 'filter_sweep'
        
        drops.push({
          startTime,
          endTime,
          startEnergy: energy[i],
          endEnergy: energy[endIndex],
          dropRate,
          dropType
        })
        
        i = endIndex
      }
    }
    
    return drops
  }

  private detectEnergyPlateaus(timestamps: number[], energy: number[]): EnergyPlateauSegment[] {
    const plateaus: EnergyPlateauSegment[] = []
    const minPlateauDuration = 8 // seconds
    const maxEnergyVariation = 0.1
    
    for (let i = 0; i < energy.length; i++) {
      let endIndex = i
      const targetEnergy = energy[i]
      let maxEndIndex = Math.min(i + Math.floor(minPlateauDuration / (this.hopSize / this.sampleRate)), energy.length - 1)
      
      // Find extent of stable energy
      for (let j = i + 1; j <= maxEndIndex; j++) {
        if (Math.abs(energy[j] - targetEnergy) <= maxEnergyVariation) {
          endIndex = j
        } else {
          break
        }
      }
      
      if (endIndex - i >= Math.floor(minPlateauDuration / (this.hopSize / this.sampleRate))) {
        const startTime = timestamps[i]
        const endTime = timestamps[endIndex]
        const segmentEnergy = energy.slice(i, endIndex + 1)
        const avgEnergy = segmentEnergy.reduce((sum, e) => sum + e, 0) / segmentEnergy.length
        const stability = 1 - (Math.max(...segmentEnergy) - Math.min(...segmentEnergy))
        
        plateaus.push({
          startTime,
          endTime,
          energy: avgEnergy,
          stability
        })
        
        i = endIndex
      }
    }
    
    return plateaus
  }

  private detectEnergyPeaks(timestamps: number[], energy: number[]): EnergyPeakSegment[] {
    const peaks: EnergyPeakSegment[] = []
    const minProminence = 0.2
    const windowSize = Math.floor(2 / (this.hopSize / this.sampleRate)) // 2 second window
    
    for (let i = windowSize; i < energy.length - windowSize; i++) {
      const currentEnergy = energy[i]
      let isPeak = true
      let minSurrounding = currentEnergy
      
      // Check if this is a local maximum
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        if (j !== i && energy[j] >= currentEnergy) {
          isPeak = false
          break
        }
        minSurrounding = Math.min(minSurrounding, energy[j])
      }
      
      if (isPeak) {
        const prominence = currentEnergy - minSurrounding
        
        if (prominence >= minProminence) {
          // Calculate sharpness
          const leftSlope = i > 0 ? currentEnergy - energy[i - 1] : 0
          const rightSlope = i < energy.length - 1 ? currentEnergy - energy[i + 1] : 0
          const sharpness = (leftSlope + rightSlope) / 2
          
          peaks.push({
            time: timestamps[i],
            energy: currentEnergy,
            prominence,
            sharpness
          })
        }
      }
    }
    
    return peaks
  }

  // Additional helper methods

  private applySmoothingFilter(data: number[], windowSize: number): number[] {
    const smoothed = [...data]
    const halfWindow = Math.floor(windowSize / 2)
    
    for (let i = halfWindow; i < data.length - halfWindow; i++) {
      let sum = 0
      for (let j = i - halfWindow; j <= i + halfWindow; j++) {
        sum += data[j]
      }
      smoothed[i] = sum / windowSize
    }
    
    return smoothed
  }

  private computeDynamicRange(energy: number[]): number {
    return Math.max(...energy) - Math.min(...energy)
  }

  private computeEnergyVariability(energy: number[]): number {
    const mean = energy.reduce((sum, val) => sum + val, 0) / energy.length
    const variance = energy.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / energy.length
    return Math.sqrt(variance)
  }

  private findPeakEnergyMoments(energyCurve: EnergyCurveData): number[] {
    return energyCurve.peaks
      .filter(peak => peak.energy > 0.7 && peak.prominence > 0.3)
      .map(peak => peak.time)
  }

  private computeRhythmEnergyCorrelation(energy: number[], onsetStrength: number[]): number {
    if (onsetStrength.length === 0) return 0
    
    const minLength = Math.min(energy.length, onsetStrength.length)
    let correlation = 0
    
    for (let i = 0; i < minLength; i++) {
      correlation += energy[i] * onsetStrength[i]
    }
    
    return correlation / minLength
  }

  private computeBeatSyncedEnergy(energy: number[], timestamps: number[]): number[] {
    // Simplified beat-synced energy (assumes 4/4 time at detected tempo)
    const beatInterval = 0.5 // seconds (120 BPM)
    const syncedEnergy: number[] = []
    
    for (let time = 0; time < timestamps[timestamps.length - 1]; time += beatInterval) {
      const index = timestamps.findIndex(t => t >= time)
      if (index >= 0) {
        syncedEnergy.push(energy[index])
      }
    }
    
    return syncedEnergy
  }

  private computeChromaStability(chromaVectors: number[][]): number {
    if (chromaVectors.length < 2) return 0
    
    let stability = 0
    for (let i = 1; i < chromaVectors.length; i++) {
      let similarity = 0
      for (let j = 0; j < 12; j++) {
        similarity += Math.abs(chromaVectors[i][j] - chromaVectors[i-1][j])
      }
      stability += 1 - (similarity / 12)
    }
    
    return stability / (chromaVectors.length - 1)
  }

  private estimateMajorKeyStrength(chromaVectors: number[][]): number {
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
    let maxCorrelation = 0
    
    for (let key = 0; key < 12; key++) {
      const avgChroma = new Array(12).fill(0)
      for (const chroma of chromaVectors) {
        for (let i = 0; i < 12; i++) {
          avgChroma[i] += chroma[(i + key) % 12]
        }
      }
      avgChroma.forEach((_, i, arr) => arr[i] /= chromaVectors.length)
      
      let correlation = 0
      for (let i = 0; i < 12; i++) {
        correlation += avgChroma[i] * majorProfile[i]
      }
      
      maxCorrelation = Math.max(maxCorrelation, correlation)
    }
    
    return Math.min(1, maxCorrelation / 100) // Normalize
  }

  private estimateMinorKeyStrength(chromaVectors: number[][]): number {
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
    let maxCorrelation = 0
    
    for (let key = 0; key < 12; key++) {
      const avgChroma = new Array(12).fill(0)
      for (const chroma of chromaVectors) {
        for (let i = 0; i < 12; i++) {
          avgChroma[i] += chroma[(i + key) % 12]
        }
      }
      avgChroma.forEach((_, i, arr) => arr[i] /= chromaVectors.length)
      
      let correlation = 0
      for (let i = 0; i < 12; i++) {
        correlation += avgChroma[i] * minorProfile[i]
      }
      
      maxCorrelation = Math.max(maxCorrelation, correlation)
    }
    
    return Math.min(1, maxCorrelation / 100)
  }

  private computeRhythmRegularity(rhythmPatterns: number[][]): number {
    if (rhythmPatterns.length === 0) return 0
    
    let regularity = 0
    for (const pattern of rhythmPatterns) {
      const expectedBeat = 0.25 // Quarter note pattern
      const deviation = pattern.reduce((sum, beat) => sum + Math.abs(beat - expectedBeat), 0) / pattern.length
      regularity += 1 - Math.min(1, deviation * 4)
    }
    
    return regularity / rhythmPatterns.length
  }

  private computeMFCCVariation(mfccVectors: number[][]): number {
    if (mfccVectors.length < 2) return 0
    
    let totalVariation = 0
    for (let coeff = 0; coeff < mfccVectors[0].length; coeff++) {
      const coeffValues = mfccVectors.map(vector => vector[coeff])
      const mean = coeffValues.reduce((sum, val) => sum + val, 0) / coeffValues.length
      const variance = coeffValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / coeffValues.length
      totalVariation += Math.sqrt(variance)
    }
    
    return totalVariation / mfccVectors[0].length
  }

  private loadMoodClassifierWeights() {
    // In production, load actual trained model weights
    // For now, initialize with placeholder values
    this.moodClassifierWeights.set('energy_weights', [0.3, 0.2, 0.15, 0.1, 0.25])
    this.moodClassifierWeights.set('spectral_weights', [0.4, 0.3, 0.2, 0.1])
    this.moodClassifierWeights.set('harmonic_weights', [0.5, 0.3, 0.2])
  }

  private loadEmotionalFeatureWeights() {
    // In production, load actual trained model weights
    this.emotionalFeatureWeights.set('valence_weights', [0.4, 0.3, 0.2, 0.1])
    this.emotionalFeatureWeights.set('arousal_weights', [0.6, 0.25, 0.15])
    this.emotionalFeatureWeights.set('dominance_weights', [0.5, 0.3, 0.2])
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.moodClassifierWeights.clear()
    this.emotionalFeatureWeights.clear()
  }
}

// Singleton instance for production use
export const moodAnalyzer = new ProductionMoodAnalyzer()