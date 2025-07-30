// Production Transition Suggestion Engine
// Provides specific crossfader and EQ automation suggestions for track transitions

import { MixPoint, MixPointAnalysis } from './mixPointDetector'
import { SpectralFeatures } from './spectralAnalysis'
import { MoodFeatures } from './moodAnalysis'
import { EnhancedAnalysisResult } from './enhancedAudioAnalysis'

export interface CrossfaderCurve {
  type: 'linear' | 'exponential' | 's-curve' | 'sharp' | 'logarithmic'
  startPosition: number // -1 to 1 (-1 = full A, 1 = full B)
  endPosition: number // -1 to 1
  duration: number // seconds
  keyPoints: Array<{
    time: number // 0-1 normalized time
    position: number // -1 to 1
    curve: 'ease-in' | 'ease-out' | 'linear' | 'hold'
  }>
}

export interface EQAutomation {
  band: 'low' | 'mid' | 'high'
  track: 'A' | 'B'
  startValue: number // 0-1 (0 = -inf dB, 0.5 = 0dB, 1 = +12dB)
  endValue: number
  duration: number // seconds
  curve: 'linear' | 'exponential' | 'logarithmic'
  keyPoints: Array<{
    time: number // 0-1 normalized
    value: number // 0-1
  }>
}

export interface EffectAutomation {
  effect: 'filter' | 'reverb' | 'delay' | 'flanger' | 'phaser' | 'gate'
  track: 'A' | 'B' | 'both'
  parameter: string // effect-specific parameter name
  startValue: number // 0-1 normalized
  endValue: number
  duration: number
  trigger: 'manual' | 'beat-sync' | 'phrase'
}

export interface TransitionSuggestion {
  id: string
  trackA: {
    trackId: string
    outPoint: MixPoint
  }
  trackB: {
    trackId: string
    inPoint: MixPoint
  }
  compatibility: {
    overall: number // 0-1
    harmonic: number
    rhythmic: number
    energy: number
    mood: number
  }
  crossfader: CrossfaderCurve
  eqAutomation: EQAutomation[]
  effectAutomation: EffectAutomation[]
  timing: {
    startBeat: number // beat number in track A
    endBeat: number // beat number in track B
    totalDuration: number // seconds
    phraseLocked: boolean
  }
  technique: {
    name: string
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    description: string
    tips: string[]
  }
  confidence: number // 0-1
  alternativeSuggestions: Array<{
    technique: string
    confidence: number
  }>
}

export class ProductionTransitionSuggestionEngine {
  private readonly sampleRate = 44100
  
  // Transition technique profiles
  private readonly techniques = {
    classic_blend: {
      name: 'Classic Blend',
      difficulty: 'beginner',
      description: 'Smooth crossfade with gradual EQ swap',
      preferredDuration: 32, // beats
      crossfaderType: 'linear',
      eqStrategy: 'gradual_swap'
    },
    bass_swap: {
      name: 'Bass Swap',
      difficulty: 'intermediate',
      description: 'Quick low-frequency exchange at breakdown',
      preferredDuration: 8,
      crossfaderType: 'hold',
      eqStrategy: 'instant_bass_swap'
    },
    echo_out: {
      name: 'Echo Out',
      difficulty: 'intermediate',
      description: 'Use delay/reverb to fade outgoing track',
      preferredDuration: 16,
      crossfaderType: 'exponential',
      eqStrategy: 'high_pass_fade'
    },
    drop_swap: {
      name: 'Drop Swap',
      difficulty: 'advanced',
      description: 'Precise drop-to-drop transition',
      preferredDuration: 4,
      crossfaderType: 'sharp',
      eqStrategy: 'frequency_cut'
    },
    filter_sweep: {
      name: 'Filter Sweep',
      difficulty: 'intermediate',
      description: 'Use filter automation for smooth blend',
      preferredDuration: 24,
      crossfaderType: 's-curve',
      eqStrategy: 'filter_transition'
    },
    loop_layer: {
      name: 'Loop & Layer',
      difficulty: 'advanced',
      description: 'Loop section of track A while bringing in B',
      preferredDuration: 16,
      crossfaderType: 'logarithmic',
      eqStrategy: 'frequency_layer'
    },
    scratch_cut: {
      name: 'Scratch Cut',
      difficulty: 'expert',
      description: 'Use scratch techniques for creative transition',
      preferredDuration: 2,
      crossfaderType: 'sharp',
      eqStrategy: 'full_kill'
    }
  }

  /**
   * Generate transition suggestion between two tracks
   */
  async generateTransitionSuggestion(
    trackAAnalysis: EnhancedAnalysisResult,
    trackBAnalysis: EnhancedAnalysisResult,
    mixPointA: MixPointAnalysis,
    mixPointB: MixPointAnalysis,
    outPoint: MixPoint,
    inPoint: MixPoint
  ): Promise<TransitionSuggestion> {
    // Calculate compatibility scores
    const compatibility = this.calculateDetailedCompatibility(
      trackAAnalysis,
      trackBAnalysis,
      outPoint,
      inPoint
    )

    // Select best technique
    const technique = this.selectOptimalTechnique(
      outPoint,
      inPoint,
      compatibility,
      trackAAnalysis.basicFeatures.tempo || 128,
      trackBAnalysis.basicFeatures.tempo || 128
    )

    // Generate crossfader curve
    const crossfader = this.generateCrossfaderCurve(
      technique,
      compatibility,
      outPoint,
      inPoint
    )

    // Generate EQ automation
    const eqAutomation = this.generateEQAutomation(
      technique,
      trackAAnalysis.spectralFeatures,
      trackBAnalysis.spectralFeatures,
      compatibility
    )

    // Generate effect automation if needed
    const effectAutomation = this.generateEffectAutomation(
      technique,
      compatibility,
      outPoint,
      inPoint
    )

    // Calculate timing
    const timing = this.calculateTransitionTiming(
      outPoint,
      inPoint,
      crossfader.duration,
      trackAAnalysis.basicFeatures.tempo || 128,
      trackBAnalysis.basicFeatures.tempo || 128
    )

    // Generate tips
    const tips = this.generateTransitionTips(
      technique,
      compatibility,
      effectAutomation.length > 0
    )

    // Calculate overall confidence
    const confidence = this.calculateConfidence(
      compatibility,
      technique,
      outPoint,
      inPoint
    )

    // Get alternative suggestions
    const alternatives = this.getAlternativeTechniques(
      technique,
      compatibility,
      outPoint.type,
      inPoint.type
    )

    return {
      id: `${trackAAnalysis.trackId}-${trackBAnalysis.trackId}-${Date.now()}`,
      trackA: {
        trackId: trackAAnalysis.trackId,
        outPoint
      },
      trackB: {
        trackId: trackBAnalysis.trackId,
        inPoint
      },
      compatibility,
      crossfader,
      eqAutomation,
      effectAutomation,
      timing,
      technique: {
        name: this.techniques[technique as keyof typeof this.techniques].name,
        difficulty: this.techniques[technique as keyof typeof this.techniques].difficulty as 'beginner' | 'intermediate' | 'advanced' | 'expert',
        description: this.techniques[technique as keyof typeof this.techniques].description,
        tips
      },
      confidence,
      alternativeSuggestions: alternatives
    }
  }

  /**
   * Generate multiple transition options ranked by confidence
   */
  async generateMultipleOptions(
    trackAAnalysis: EnhancedAnalysisResult,
    trackBAnalysis: EnhancedAnalysisResult,
    mixPointA: MixPointAnalysis,
    mixPointB: MixPointAnalysis
  ): Promise<TransitionSuggestion[]> {
    const suggestions: TransitionSuggestion[] = []

    // Try different out/in point combinations
    for (const outPoint of mixPointA.optimalOutPoints.slice(0, 2)) {
      for (const inPoint of mixPointB.optimalInPoints.slice(0, 2)) {
        const suggestion = await this.generateTransitionSuggestion(
          trackAAnalysis,
          trackBAnalysis,
          mixPointA,
          mixPointB,
          outPoint,
          inPoint
        )
        suggestions.push(suggestion)
      }
    }

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  private calculateDetailedCompatibility(
    trackA: EnhancedAnalysisResult,
    trackB: EnhancedAnalysisResult,
    outPoint: MixPoint,
    inPoint: MixPoint
  ) {
    // Harmonic compatibility
    const harmonic = this.calculateHarmonicCompatibility(
      trackA.basicFeatures,
      trackB.basicFeatures,
      trackA.spectralFeatures,
      trackB.spectralFeatures
    )

    // Rhythmic compatibility
    const rhythmic = this.calculateRhythmicCompatibility(
      trackA.spectralFeatures,
      trackB.spectralFeatures,
      outPoint,
      inPoint,
      trackA.basicFeatures.tempo || 128,
      trackB.basicFeatures.tempo || 128
    )

    // Energy compatibility
    const energy = this.calculateEnergyCompatibility(
      trackA.moodFeatures,
      trackB.moodFeatures,
      outPoint,
      inPoint
    )

    // Mood compatibility
    const mood = this.calculateMoodCompatibility(
      trackA.moodFeatures,
      trackB.moodFeatures
    )

    // Overall weighted average
    const overall = (
      harmonic * 0.3 +
      rhythmic * 0.3 +
      energy * 0.25 +
      mood * 0.15
    )

    return {
      overall,
      harmonic,
      rhythmic,
      energy,
      mood
    }
  }

  private calculateHarmonicCompatibility(
    basicA: any,
    basicB: any,
    spectralA: SpectralFeatures,
    spectralB: SpectralFeatures
  ): number {
    let compatibility = 0.5 // default

    // Check Camelot compatibility if available
    if (basicA.musicalKey && basicB.musicalKey) {
      const keyDistance = this.getCamelotDistance(
        basicA.musicalKey,
        basicB.musicalKey
      )
      
      if (keyDistance === 0) compatibility = 1.0 // Same key
      else if (keyDistance === 1) compatibility = 0.9 // Adjacent
      else if (keyDistance === 2) compatibility = 0.7 // 2 steps
      else if (keyDistance === 7) compatibility = 0.8 // Relative major/minor
      else compatibility = 0.4 - (keyDistance * 0.05)
    }

    // Use chroma vectors if available
    if (spectralA.chromaVector && spectralB.chromaVector) {
      const chromaSim = this.compareChromaVectors(
        spectralA.chromaVector,
        spectralB.chromaVector
      )
      compatibility = compatibility * 0.6 + chromaSim * 0.4
    }

    return Math.max(0, Math.min(1, compatibility))
  }

  private calculateRhythmicCompatibility(
    spectralA: SpectralFeatures,
    spectralB: SpectralFeatures,
    outPoint: MixPoint,
    inPoint: MixPoint,
    tempoA: number = 128,
    tempoB: number = 128
  ): number {
    let compatibility = 0.5

    // Tempo compatibility
    const tempoDiff = Math.abs(tempoA - tempoB)
    const tempoRatio = Math.max(tempoA, tempoB) / 
                      Math.min(tempoA, tempoB)
      
    if (tempoDiff < 1) compatibility = 1.0 // Perfect match
    else if (tempoDiff < 3) compatibility = 0.9
    else if (tempoDiff < 5) compatibility = 0.8
    else if (tempoRatio === 2 || tempoRatio === 0.5) compatibility = 0.7 // Double/half time
    else if (tempoDiff < 10) compatibility = 0.6
    else compatibility = 0.3

    // Rhythmic stability at mix points
    const stabilityScore = (outPoint.rhythmicStability + inPoint.rhythmicStability) / 2
    compatibility = compatibility * 0.7 + stabilityScore * 0.3

    return compatibility
  }

  private calculateEnergyCompatibility(
    moodA: MoodFeatures,
    moodB: MoodFeatures,
    outPoint: MixPoint,
    inPoint: MixPoint
  ): number {
    // Point energy difference
    const pointEnergyDiff = Math.abs(outPoint.energy - inPoint.energy)
    let compatibility = 1 - pointEnergyDiff

    // Overall track energy
    if (moodA.energyCurve && moodB.energyCurve) {
      const avgEnergyA = moodA.energyCurve.avgEnergy
      const avgEnergyB = moodB.energyCurve.avgEnergy
      const overallDiff = Math.abs(avgEnergyA - avgEnergyB)
      
      compatibility = compatibility * 0.6 + (1 - overallDiff) * 0.4
    }

    return compatibility
  }

  private calculateMoodCompatibility(
    moodA: MoodFeatures,
    moodB: MoodFeatures
  ): number {
    const valenceDiff = Math.abs(
      (moodA.valence || 0.5) - (moodB.valence || 0.5)
    )
    const arousalDiff = Math.abs(
      (moodA.arousal || 0.5) - (moodB.arousal || 0.5)
    )
    const dominanceDiff = Math.abs(
      (moodA.dominance || 0.5) - (moodB.dominance || 0.5)
    )

    const avgDiff = (valenceDiff + arousalDiff + dominanceDiff) / 3
    return 1 - avgDiff
  }

  private selectOptimalTechnique(
    outPoint: MixPoint,
    inPoint: MixPoint,
    compatibility: any,
    tempoA: number,
    tempoB: number
  ): string {
    const candidates: Array<{ technique: string; score: number }> = []

    // Classic blend for high compatibility
    if (compatibility.overall > 0.8) {
      candidates.push({ technique: 'classic_blend', score: 0.9 })
    }

    // Bass swap for breakdowns
    if (outPoint.type === 'breakdown' || inPoint.type === 'breakdown') {
      candidates.push({ technique: 'bass_swap', score: 0.85 })
    }

    // Echo out for outros
    if (outPoint.type === 'outro') {
      candidates.push({ technique: 'echo_out', score: 0.8 })
    }

    // Drop swap for aligned drops
    if (outPoint.type === 'drop' && inPoint.type === 'drop' && 
        compatibility.rhythmic > 0.8) {
      candidates.push({ technique: 'drop_swap', score: 0.95 })
    }

    // Filter sweep for energy transitions
    if (Math.abs(outPoint.energy - inPoint.energy) > 0.3) {
      candidates.push({ technique: 'filter_sweep', score: 0.75 })
    }

    // Loop layer for complex sections
    if (outPoint.characteristics.complexity === 'minimal' && 
        inPoint.characteristics.complexity === 'complex') {
      candidates.push({ technique: 'loop_layer', score: 0.7 })
    }

    // Default to classic blend
    if (candidates.length === 0) {
      candidates.push({ technique: 'classic_blend', score: 0.5 })
    }

    // Select highest scoring technique
    return candidates.sort((a, b) => b.score - a.score)[0].technique
  }

  private generateCrossfaderCurve(
    technique: string,
    compatibility: any,
    outPoint: MixPoint,
    inPoint: MixPoint
  ): CrossfaderCurve {
    const techProfile = this.techniques[technique as keyof typeof this.techniques]
    const duration = techProfile.preferredDuration * 60 / 128 // Convert beats to seconds at 128 BPM

    switch (techProfile.crossfaderType) {
      case 'linear':
        return this.generateLinearCurve(duration)
      
      case 'exponential':
        return this.generateExponentialCurve(duration, outPoint.energy > inPoint.energy)
      
      case 's-curve':
        return this.generateSCurve(duration)
      
      case 'sharp':
        return this.generateSharpCurve(duration, technique === 'drop_swap' ? 0.1 : 0.2)
      
      case 'logarithmic':
        return this.generateLogarithmicCurve(duration)
      
      default:
        return this.generateLinearCurve(duration)
    }
  }

  private generateLinearCurve(duration: number): CrossfaderCurve {
    return {
      type: 'linear',
      startPosition: -1,
      endPosition: 1,
      duration,
      keyPoints: [
        { time: 0, position: -1, curve: 'linear' },
        { time: 0.5, position: 0, curve: 'linear' },
        { time: 1, position: 1, curve: 'linear' }
      ]
    }
  }

  private generateExponentialCurve(
    duration: number,
    fadeOutFaster: boolean
  ): CrossfaderCurve {
    if (fadeOutFaster) {
      return {
        type: 'exponential',
        startPosition: -1,
        endPosition: 1,
        duration,
        keyPoints: [
          { time: 0, position: -1, curve: 'ease-out' },
          { time: 0.3, position: -0.2, curve: 'ease-out' },
          { time: 0.6, position: 0.5, curve: 'ease-in' },
          { time: 1, position: 1, curve: 'ease-in' }
        ]
      }
    } else {
      return {
        type: 'exponential',
        startPosition: -1,
        endPosition: 1,
        duration,
        keyPoints: [
          { time: 0, position: -1, curve: 'ease-in' },
          { time: 0.4, position: -0.5, curve: 'ease-in' },
          { time: 0.7, position: 0.2, curve: 'ease-out' },
          { time: 1, position: 1, curve: 'ease-out' }
        ]
      }
    }
  }

  private generateSCurve(duration: number): CrossfaderCurve {
    return {
      type: 's-curve',
      startPosition: -1,
      endPosition: 1,
      duration,
      keyPoints: [
        { time: 0, position: -1, curve: 'ease-in' },
        { time: 0.25, position: -0.8, curve: 'ease-out' },
        { time: 0.5, position: 0, curve: 'linear' },
        { time: 0.75, position: 0.8, curve: 'ease-in' },
        { time: 1, position: 1, curve: 'ease-out' }
      ]
    }
  }

  private generateSharpCurve(duration: number, holdRatio: number): CrossfaderCurve {
    return {
      type: 'sharp',
      startPosition: -1,
      endPosition: 1,
      duration,
      keyPoints: [
        { time: 0, position: -1, curve: 'hold' },
        { time: 0.5 - holdRatio, position: -1, curve: 'linear' },
        { time: 0.5 + holdRatio, position: 1, curve: 'hold' },
        { time: 1, position: 1, curve: 'hold' }
      ]
    }
  }

  private generateLogarithmicCurve(duration: number): CrossfaderCurve {
    return {
      type: 'logarithmic',
      startPosition: -1,
      endPosition: 1,
      duration,
      keyPoints: [
        { time: 0, position: -1, curve: 'ease-in' },
        { time: 0.2, position: -0.6, curve: 'ease-in' },
        { time: 0.5, position: 0, curve: 'ease-out' },
        { time: 0.8, position: 0.9, curve: 'ease-out' },
        { time: 1, position: 1, curve: 'linear' }
      ]
    }
  }

  private generateEQAutomation(
    technique: string,
    spectralA: SpectralFeatures,
    spectralB: SpectralFeatures,
    compatibility: any
  ): EQAutomation[] {
    const automations: EQAutomation[] = []
    const techProfile = this.techniques[technique as keyof typeof this.techniques]
    const duration = techProfile.preferredDuration * 60 / 128

    switch (techProfile.eqStrategy) {
      case 'gradual_swap':
        // Gradual frequency swap
        automations.push(
          // Track A - gradual low cut
          {
            band: 'low',
            track: 'A',
            startValue: 0.5,
            endValue: 0,
            duration,
            curve: 'logarithmic',
            keyPoints: [
              { time: 0, value: 0.5 },
              { time: 0.5, value: 0.3 },
              { time: 0.8, value: 0.1 },
              { time: 1, value: 0 }
            ]
          },
          // Track B - gradual low boost
          {
            band: 'low',
            track: 'B',
            startValue: 0,
            endValue: 0.5,
            duration,
            curve: 'logarithmic',
            keyPoints: [
              { time: 0, value: 0 },
              { time: 0.2, value: 0.1 },
              { time: 0.5, value: 0.3 },
              { time: 1, value: 0.5 }
            ]
          }
        )
        break

      case 'instant_bass_swap':
        // Quick bass exchange
        const swapTime = 0.1 // 10% of duration for swap
        automations.push(
          {
            band: 'low',
            track: 'A',
            startValue: 0.5,
            endValue: 0,
            duration: duration * swapTime,
            curve: 'linear',
            keyPoints: [
              { time: 0, value: 0.5 },
              { time: 1, value: 0 }
            ]
          },
          {
            band: 'low',
            track: 'B',
            startValue: 0,
            endValue: 0.5,
            duration: duration * swapTime,
            curve: 'linear',
            keyPoints: [
              { time: 0, value: 0 },
              { time: 1, value: 0.5 }
            ]
          }
        )
        break

      case 'high_pass_fade':
        // High-pass filter on outgoing
        automations.push(
          {
            band: 'low',
            track: 'A',
            startValue: 0.5,
            endValue: 0,
            duration: duration * 0.6,
            curve: 'exponential',
            keyPoints: [
              { time: 0, value: 0.5 },
              { time: 0.5, value: 0.2 },
              { time: 1, value: 0 }
            ]
          },
          {
            band: 'mid',
            track: 'A',
            startValue: 0.5,
            endValue: 0.2,
            duration: duration * 0.8,
            curve: 'linear',
            keyPoints: [
              { time: 0, value: 0.5 },
              { time: 1, value: 0.2 }
            ]
          }
        )
        break

      case 'frequency_cut':
        // Aggressive frequency cutting
        automations.push(
          {
            band: 'low',
            track: 'A',
            startValue: 0.5,
            endValue: 0,
            duration: duration * 0.2,
            curve: 'linear',
            keyPoints: [
              { time: 0, value: 0.5 },
              { time: 1, value: 0 }
            ]
          },
          {
            band: 'high',
            track: 'A',
            startValue: 0.5,
            endValue: 0,
            duration: duration * 0.3,
            curve: 'linear',
            keyPoints: [
              { time: 0, value: 0.5 },
              { time: 1, value: 0 }
            ]
          }
        )
        break

      case 'filter_transition':
        // Use mid-range filtering
        automations.push(
          {
            band: 'mid',
            track: 'A',
            startValue: 0.5,
            endValue: 0.7,
            duration: duration * 0.5,
            curve: 'linear',
            keyPoints: [
              { time: 0, value: 0.5 },
              { time: 1, value: 0.7 }
            ]
          },
          {
            band: 'mid',
            track: 'B',
            startValue: 0.3,
            endValue: 0.5,
            duration: duration * 0.5,
            curve: 'linear',
            keyPoints: [
              { time: 0, value: 0.3 },
              { time: 1, value: 0.5 }
            ]
          }
        )
        break

      case 'frequency_layer':
        // Keep frequencies separated
        automations.push(
          {
            band: 'low',
            track: 'A',
            startValue: 0.5,
            endValue: 0.5,
            duration,
            curve: 'linear',
            keyPoints: [
              { time: 0, value: 0.5 },
              { time: 1, value: 0.5 }
            ]
          },
          {
            band: 'low',
            track: 'B',
            startValue: 0,
            endValue: 0,
            duration: duration * 0.7,
            curve: 'linear',
            keyPoints: [
              { time: 0, value: 0 },
              { time: 1, value: 0 }
            ]
          },
          {
            band: 'high',
            track: 'B',
            startValue: 0.3,
            endValue: 0.5,
            duration,
            curve: 'exponential',
            keyPoints: [
              { time: 0, value: 0.3 },
              { time: 0.5, value: 0.4 },
              { time: 1, value: 0.5 }
            ]
          }
        )
        break
    }

    return automations
  }

  private generateEffectAutomation(
    technique: string,
    compatibility: any,
    outPoint: MixPoint,
    inPoint: MixPoint
  ): EffectAutomation[] {
    const automations: EffectAutomation[] = []

    // Echo out technique
    if (technique === 'echo_out') {
      automations.push({
        effect: 'delay',
        track: 'A',
        parameter: 'feedback',
        startValue: 0,
        endValue: 0.7,
        duration: 2, // seconds
        trigger: 'manual'
      })
      automations.push({
        effect: 'reverb',
        track: 'A',
        parameter: 'wetness',
        startValue: 0,
        endValue: 0.5,
        duration: 3,
        trigger: 'manual'
      })
    }

    // Filter sweep technique
    if (technique === 'filter_sweep') {
      automations.push({
        effect: 'filter',
        track: 'A',
        parameter: 'frequency',
        startValue: 1,
        endValue: 0.2,
        duration: 4,
        trigger: 'beat-sync'
      })
    }

    // Add flanger for complex transitions
    if (compatibility.overall < 0.6 && outPoint.characteristics.complexity === 'complex') {
      automations.push({
        effect: 'flanger',
        track: 'both',
        parameter: 'depth',
        startValue: 0,
        endValue: 0.3,
        duration: 2,
        trigger: 'phrase'
      })
    }

    return automations
  }

  private calculateTransitionTiming(
    outPoint: MixPoint,
    inPoint: MixPoint,
    duration: number,
    tempoA: number,
    tempoB: number
  ) {
    // Calculate beat positions
    const beatsPerSecondA = tempoA / 60
    const beatsPerSecondB = tempoB / 60
    
    const startBeat = Math.round(outPoint.timestamp * beatsPerSecondA)
    const endBeat = Math.round((inPoint.timestamp + duration) * beatsPerSecondB)
    
    // Check if we can lock to phrase boundaries (16 or 32 beats)
    const phraseLocked = startBeat % 16 === 0 && endBeat % 16 === 0

    return {
      startBeat,
      endBeat,
      totalDuration: duration,
      phraseLocked
    }
  }

  private generateTransitionTips(
    technique: string,
    compatibility: any,
    hasEffects: boolean
  ): string[] {
    const tips: string[] = []

    // General tips based on technique
    switch (technique) {
      case 'classic_blend':
        tips.push('Keep the crossfader movement smooth and consistent')
        tips.push('Match the bass swap to the musical phrase')
        break
      case 'bass_swap':
        tips.push('Execute the bass cut precisely on the downbeat')
        tips.push('Consider using the low-EQ kill switch for cleaner swap')
        break
      case 'echo_out':
        tips.push('Start the echo effect 1-2 bars before the transition')
        tips.push('Gradually increase the feedback while cutting the low end')
        break
      case 'drop_swap':
        tips.push('Count beats carefully - timing is critical')
        tips.push('Use the crossfader curve to create impact')
        break
    }

    // Compatibility-based tips
    if (compatibility.harmonic < 0.5) {
      tips.push('Key clash detected - use EQ aggressively to separate frequencies')
    }
    if (compatibility.rhythmic < 0.6) {
      tips.push('Consider using loop mode to align the beats before transitioning')
    }
    if (compatibility.energy < 0.4) {
      tips.push('Large energy gap - build up track B gradually before the mix')
    }

    // Effect tips
    if (hasEffects) {
      tips.push('Prepare effects in advance and practice the timing')
    }

    return tips
  }

  private calculateConfidence(
    compatibility: any,
    technique: string,
    outPoint: MixPoint,
    inPoint: MixPoint
  ): number {
    let confidence = compatibility.overall

    // Boost confidence for optimal point types
    if (outPoint.type === 'outro' && inPoint.type === 'intro') {
      confidence *= 1.2
    }

    // Reduce confidence for risky transitions
    if (technique === 'drop_swap' || technique === 'scratch_cut') {
      confidence *= 0.9
    }

    // Factor in point suitability
    confidence *= (outPoint.transitionSuitability + inPoint.transitionSuitability) / 2

    return Math.min(1, Math.max(0, confidence))
  }

  private getAlternativeTechniques(
    primaryTechnique: string,
    compatibility: any,
    outType: string,
    inType: string
  ): Array<{ technique: string; confidence: number }> {
    const alternatives: Array<{ technique: string; confidence: number }> = []

    // Always suggest classic blend as fallback
    if (primaryTechnique !== 'classic_blend') {
      alternatives.push({
        technique: 'Classic Blend',
        confidence: 0.7
      })
    }

    // Suggest bass swap for compatible tracks
    if (primaryTechnique !== 'bass_swap' && compatibility.rhythmic > 0.7) {
      alternatives.push({
        technique: 'Bass Swap',
        confidence: 0.75
      })
    }

    // Echo out for outros
    if (primaryTechnique !== 'echo_out' && outType === 'outro') {
      alternatives.push({
        technique: 'Echo Out',
        confidence: 0.65
      })
    }

    // Filter sweep for energy transitions
    if (primaryTechnique !== 'filter_sweep' && compatibility.energy < 0.6) {
      alternatives.push({
        technique: 'Filter Sweep',
        confidence: 0.6
      })
    }

    return alternatives.slice(0, 2) // Return top 2 alternatives
  }

  // Helper methods

  private getCamelotDistance(keyA: string, keyB: string): number {
    // Extract Camelot codes (e.g., "8A" -> 8, "A")
    const parseKey = (key: string) => {
      const match = key.match(/(\d+)([AB])/)
      if (!match) return null
      return {
        number: parseInt(match[1]),
        letter: match[2]
      }
    }

    const a = parseKey(keyA)
    const b = parseKey(keyB)
    
    if (!a || !b) return 12 // Maximum distance if parsing fails

    // Same key
    if (a.number === b.number && a.letter === b.letter) return 0

    // Relative major/minor (same number, different letter)
    if (a.number === b.number) return 7

    // Calculate circular distance
    let distance = Math.abs(a.number - b.number)
    if (distance > 6) distance = 12 - distance

    // Add penalty for different modes (major/minor)
    if (a.letter !== b.letter) distance += 1

    return distance
  }

  private compareChromaVectors(chromaA: number[][], chromaB: number[][]): number {
    if (!chromaA || !chromaB || chromaA.length === 0 || chromaB.length === 0) {
      return 0.5
    }

    // Average chroma vectors over time
    const avgChromaA = new Array(12).fill(0)
    const avgChromaB = new Array(12).fill(0)
    
    const framesA = chromaA.length
    const framesB = chromaB.length

    for (let i = 0; i < framesA; i++) {
      for (let j = 0; j < 12 && j < chromaA[i].length; j++) {
        avgChromaA[j] += chromaA[i][j] / framesA
      }
    }

    for (let i = 0; i < framesB; i++) {
      for (let j = 0; j < 12 && j < chromaB[i].length; j++) {
        avgChromaB[j] += chromaB[i][j] / framesB
      }
    }

    // Calculate cosine similarity
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < 12; i++) {
      dotProduct += avgChromaA[i] * avgChromaB[i]
      normA += avgChromaA[i] * avgChromaA[i]
      normB += avgChromaB[i] * avgChromaB[i]
    }

    if (normA === 0 || normB === 0) return 0

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}

// Export singleton instance
export const transitionSuggestionEngine = new ProductionTransitionSuggestionEngine()