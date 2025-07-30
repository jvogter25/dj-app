// Production Effects Recommendation Engine
// Intelligently suggests effects usage based on track analysis and transition context

import { MixPoint, MixPointAnalysis } from './mixPointDetector'
import { SpectralFeatures } from './spectralAnalysis'
import { MoodFeatures } from './moodAnalysis'
import { VocalFeatures } from './vocalAnalysis'
import { EnhancedAnalysisResult } from './enhancedAudioAnalysis'
import { TransitionSuggestion } from './transitionSuggestionEngine'

export interface EffectPreset {
  id: string
  name: string
  description: string
  category: 'creative' | 'transition' | 'buildup' | 'breakdown' | 'ambient' | 'rhythmic'
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  effects: EffectChain[]
  bestFor: string[] // Track characteristics this preset works well with
  avoidFor: string[] // Track characteristics to avoid
}

export interface EffectChain {
  effectType: 'filter' | 'reverb' | 'delay' | 'flanger' | 'phaser' | 'gate' | 'bitcrusher' | 'distortion' | 'compressor' | 'sidechain'
  order: number // Order in the chain
  parameters: EffectParameters
  automation?: EffectAutomationCurve
  triggerMode: 'manual' | 'beat-sync' | 'phrase' | 'drop' | 'breakdown'
}

export interface EffectParameters {
  // Filter parameters
  filterType?: 'lowpass' | 'highpass' | 'bandpass' | 'notch'
  frequency?: number // Hz
  resonance?: number // 0-1
  
  // Reverb parameters
  roomSize?: number // 0-1
  decay?: number // seconds
  damping?: number // 0-1
  wetness?: number // 0-1
  
  // Delay parameters
  delayTime?: number // milliseconds or beat fraction
  feedback?: number // 0-1
  pingPong?: boolean
  
  // Modulation parameters
  rate?: number // Hz or beat sync
  depth?: number // 0-1
  mix?: number // 0-1
  
  // Dynamics parameters
  threshold?: number // dB
  ratio?: number // compression ratio
  attack?: number // ms
  release?: number // ms
  
  // Common parameters
  enabled: boolean
  bypassWhenSilent?: boolean
}

export interface EffectAutomationCurve {
  parameter: string
  startValue: number
  endValue: number
  duration: number // seconds
  curveType: 'linear' | 'exponential' | 'logarithmic' | 'sine' | 'square'
  beatSync?: boolean
  loopMode?: 'none' | 'forward' | 'backward' | 'pingpong'
}

export interface EffectRecommendation {
  preset: EffectPreset
  confidence: number // 0-1
  timing: {
    idealStartPoint: number // timestamp in seconds
    duration: number
    alignToPhrase: boolean
  }
  reasoning: string[]
  alternatives: EffectPreset[]
  warnings: string[]
  combinesWith: string[] // Other effect preset IDs that work well together
}

export interface EffectAnalysisResult {
  trackId: string
  recommendedEffects: EffectRecommendation[]
  transitionEffects: EffectRecommendation[] // Effects specifically for transitions
  creativeOpportunities: Array<{
    timestamp: number
    type: 'vocal_isolation' | 'rhythmic_gate' | 'filter_sweep' | 'space_creation' | 'tension_builder'
    suggestedEffect: EffectPreset
    confidence: number
  }>
  effectCompatibility: Map<string, number> // Effect type -> compatibility score
}

export class ProductionEffectsRecommendationEngine {
  private effectPresets: Map<string, EffectPreset>
  
  constructor() {
    this.effectPresets = new Map()
    this.initializePresets()
  }

  private initializePresets() {
    // Initialize built-in effect presets
    const presets: EffectPreset[] = [
      // Transition Effects
      {
        id: 'smooth_filter_sweep',
        name: 'Smooth Filter Sweep',
        description: 'Gradual frequency sweep for smooth transitions',
        category: 'transition',
        difficulty: 'beginner',
        effects: [{
          effectType: 'filter',
          order: 1,
          parameters: {
            filterType: 'lowpass',
            frequency: 20000,
            resonance: 0.3,
            enabled: true
          },
          automation: {
            parameter: 'frequency',
            startValue: 20000,
            endValue: 200,
            duration: 8,
            curveType: 'exponential',
            beatSync: true
          },
          triggerMode: 'manual'
        }],
        bestFor: ['outro', 'breakdown', 'ambient'],
        avoidFor: ['drop', 'vocal_heavy']
      },
      
      // Buildup Effects
      {
        id: 'tension_builder_delay',
        name: 'Tension Builder Delay',
        description: 'Increasing delay feedback for buildup tension',
        category: 'buildup',
        difficulty: 'intermediate',
        effects: [{
          effectType: 'delay',
          order: 1,
          parameters: {
            delayTime: 375, // 1/8 note at 128 BPM
            feedback: 0,
            pingPong: true,
            wetness: 0,
            enabled: true
          },
          automation: {
            parameter: 'feedback',
            startValue: 0,
            endValue: 0.8,
            duration: 4,
            curveType: 'exponential',
            beatSync: true
          },
          triggerMode: 'beat-sync'
        }],
        bestFor: ['buildup', 'pre_drop'],
        avoidFor: ['breakdown', 'ambient']
      },
      
      // Creative Effects
      {
        id: 'vocal_space_creator',
        name: 'Vocal Space Creator',
        description: 'Reverb and delay for creating space around vocals',
        category: 'creative',
        difficulty: 'intermediate',
        effects: [
          {
            effectType: 'reverb',
            order: 1,
            parameters: {
              roomSize: 0.7,
              decay: 2.5,
              damping: 0.4,
              wetness: 0.3,
              enabled: true
            },
            triggerMode: 'manual'
          },
          {
            effectType: 'delay',
            order: 2,
            parameters: {
              delayTime: 500,
              feedback: 0.3,
              pingPong: true,
              wetness: 0.2,
              enabled: true
            },
            triggerMode: 'manual'
          }
        ],
        bestFor: ['vocal_break', 'breakdown'],
        avoidFor: ['drop', 'busy_mix']
      },
      
      // Rhythmic Effects
      {
        id: 'rhythmic_gate',
        name: 'Rhythmic Gate',
        description: 'Beat-synced gate for rhythmic patterns',
        category: 'rhythmic',
        difficulty: 'advanced',
        effects: [{
          effectType: 'gate',
          order: 1,
          parameters: {
            threshold: -20,
            ratio: 100,
            attack: 0.1,
            release: 10,
            enabled: true
          },
          triggerMode: 'beat-sync'
        }],
        bestFor: ['instrumental', 'minimal'],
        avoidFor: ['vocal_heavy', 'complex']
      },
      
      // Breakdown Effects
      {
        id: 'breakdown_wash',
        name: 'Breakdown Wash',
        description: 'Heavy reverb for breakdown atmosphere',
        category: 'breakdown',
        difficulty: 'beginner',
        effects: [{
          effectType: 'reverb',
          order: 1,
          parameters: {
            roomSize: 0.9,
            decay: 4,
            damping: 0.2,
            wetness: 0.6,
            enabled: true
          },
          triggerMode: 'manual'
        }],
        bestFor: ['breakdown', 'ambient_section'],
        avoidFor: ['drop', 'high_energy']
      },
      
      // Advanced Creative
      {
        id: 'glitch_transition',
        name: 'Glitch Transition',
        description: 'Bitcrusher and stutter for glitchy transitions',
        category: 'creative',
        difficulty: 'expert',
        effects: [
          {
            effectType: 'bitcrusher',
            order: 1,
            parameters: {
              enabled: true,
              mix: 0
            },
            automation: {
              parameter: 'mix',
              startValue: 0,
              endValue: 0.8,
              duration: 0.5,
              curveType: 'square',
              beatSync: true
            },
            triggerMode: 'manual'
          },
          {
            effectType: 'delay',
            order: 2,
            parameters: {
              delayTime: 93.75, // 1/32 note at 128 BPM
              feedback: 0.9,
              wetness: 0,
              enabled: true
            },
            automation: {
              parameter: 'wetness',
              startValue: 0,
              endValue: 1,
              duration: 0.25,
              curveType: 'square',
              beatSync: true
            },
            triggerMode: 'beat-sync'
          }
        ],
        bestFor: ['drop_swap', 'high_energy'],
        avoidFor: ['smooth_transition', 'vocal_focus']
      },
      
      // Ambient Effects
      {
        id: 'ambient_texture',
        name: 'Ambient Texture',
        description: 'Phaser and reverb for ambient textures',
        category: 'ambient',
        difficulty: 'intermediate',
        effects: [
          {
            effectType: 'phaser',
            order: 1,
            parameters: {
              rate: 0.2,
              depth: 0.5,
              mix: 0.3,
              enabled: true
            },
            triggerMode: 'manual'
          },
          {
            effectType: 'reverb',
            order: 2,
            parameters: {
              roomSize: 0.8,
              decay: 3,
              damping: 0.3,
              wetness: 0.4,
              enabled: true
            },
            triggerMode: 'manual'
          }
        ],
        bestFor: ['breakdown', 'outro', 'ambient_section'],
        avoidFor: ['drop', 'high_energy', 'vocal_heavy']
      },
      
      // Sidechain Compression
      {
        id: 'pumping_sidechain',
        name: 'Pumping Sidechain',
        description: 'Classic sidechain compression for that pumping effect',
        category: 'rhythmic',
        difficulty: 'intermediate',
        effects: [{
          effectType: 'sidechain',
          order: 1,
          parameters: {
            threshold: -10,
            ratio: 8,
            attack: 0.1,
            release: 100,
            enabled: true
          },
          triggerMode: 'beat-sync'
        }],
        bestFor: ['house', 'techno', 'four_on_floor'],
        avoidFor: ['breakbeat', 'irregular_rhythm']
      }
    ]
    
    // Add all presets to the map
    presets.forEach(preset => {
      this.effectPresets.set(preset.id, preset)
    })
  }

  /**
   * Analyze track and recommend effects
   */
  async analyzeAndRecommendEffects(
    analysis: EnhancedAnalysisResult,
    mixPoints: MixPointAnalysis,
    transitionContext?: TransitionSuggestion
  ): Promise<EffectAnalysisResult> {
    // Analyze track characteristics
    const trackCharacteristics = this.analyzeTrackCharacteristics(analysis)
    
    // Find compatible effects
    const effectCompatibility = this.calculateEffectCompatibility(
      trackCharacteristics,
      analysis
    )
    
    // Recommend general effects
    const recommendedEffects = this.recommendGeneralEffects(
      trackCharacteristics,
      effectCompatibility,
      mixPoints
    )
    
    // Recommend transition-specific effects
    const transitionEffects = transitionContext ? 
      this.recommendTransitionEffects(
        transitionContext,
        trackCharacteristics,
        effectCompatibility
      ) : []
    
    // Identify creative opportunities
    const creativeOpportunities = this.identifyCreativeOpportunities(
      analysis,
      mixPoints,
      trackCharacteristics
    )
    
    return {
      trackId: analysis.trackId,
      recommendedEffects,
      transitionEffects,
      creativeOpportunities,
      effectCompatibility
    }
  }

  private analyzeTrackCharacteristics(analysis: EnhancedAnalysisResult) {
    const spectral = analysis.spectralFeatures
    const mood = analysis.moodFeatures
    const vocal = analysis.vocalFeatures
    const genre = analysis.genreAnalysis
    
    // Determine track characteristics
    const characteristics: string[] = []
    
    // Energy characteristics
    if (mood.energyCurve.avgEnergy > 0.7) characteristics.push('high_energy')
    else if (mood.energyCurve.avgEnergy < 0.3) characteristics.push('low_energy')
    
    // Structural characteristics
    if (mood.energyCurve.buildups.length > 2) characteristics.push('buildup')
    if (mood.energyCurve.drops.length > 0) characteristics.push('drop')
    if (mood.energyCurve.drops.length > 2) characteristics.push('drop_heavy')
    
    // Vocal characteristics
    if (vocal.hasVocals) {
      characteristics.push('vocal')
      if (vocal.vocalDensity > 0.6) characteristics.push('vocal_heavy')
      if (vocal.vocalSegments.some(s => s.vocalType === 'lead')) {
        characteristics.push('vocal_lead')
      }
    } else {
      characteristics.push('instrumental')
    }
    
    // Rhythm characteristics
    const avgOnsetStrength = spectral.onsetStrength?.reduce((a, b) => a + b, 0) / 
                            (spectral.onsetStrength?.length || 1) || 0
    if (avgOnsetStrength > 0.7) characteristics.push('rhythmic')
    if (spectral.beatSpectrum && this.isFourOnFloor(spectral.beatSpectrum)) {
      characteristics.push('four_on_floor')
    }
    
    // Genre characteristics
    if (genre.primaryGenre) characteristics.push(genre.primaryGenre)
    if (genre.subgenreMarkers) {
      Object.entries(genre.subgenreMarkers).forEach(([marker, confidence]) => {
        if (confidence > 0.6) characteristics.push(marker)
      })
    }
    
    // Complexity
    const complexity = this.calculateComplexity(spectral, mood)
    if (complexity > 0.7) characteristics.push('complex')
    else if (complexity < 0.3) characteristics.push('minimal')
    
    // Mood characteristics
    if (mood.primaryMood === 'dark') characteristics.push('dark')
    if (mood.primaryMood === 'euphoric') characteristics.push('euphoric')
    if (mood.primaryMood === 'melancholic') characteristics.push('ambient')
    
    return characteristics
  }

  private calculateEffectCompatibility(
    characteristics: string[],
    analysis: EnhancedAnalysisResult
  ): Map<string, number> {
    const compatibility = new Map<string, number>()
    
    // Filter compatibility
    compatibility.set('filter', 0.8) // Filters work with almost everything
    
    // Reverb compatibility
    let reverbScore = 0.6
    if (characteristics.includes('vocal_heavy')) reverbScore *= 0.7
    if (characteristics.includes('ambient')) reverbScore *= 1.3
    if (characteristics.includes('minimal')) reverbScore *= 1.2
    compatibility.set('reverb', Math.min(1, reverbScore))
    
    // Delay compatibility
    let delayScore = 0.7
    if (characteristics.includes('rhythmic')) delayScore *= 1.2
    if (characteristics.includes('vocal_lead')) delayScore *= 0.8
    if (characteristics.includes('complex')) delayScore *= 0.7
    compatibility.set('delay', Math.min(1, delayScore))
    
    // Modulation effects
    let modulationScore = 0.5
    if (characteristics.includes('minimal')) modulationScore *= 1.3
    if (characteristics.includes('instrumental')) modulationScore *= 1.2
    if (characteristics.includes('vocal_heavy')) modulationScore *= 0.6
    compatibility.set('flanger', Math.min(1, modulationScore))
    compatibility.set('phaser', Math.min(1, modulationScore * 0.9))
    
    // Gate compatibility
    let gateScore = 0.4
    if (characteristics.includes('rhythmic')) gateScore *= 1.5
    if (characteristics.includes('four_on_floor')) gateScore *= 1.3
    if (characteristics.includes('vocal_heavy')) gateScore *= 0.5
    compatibility.set('gate', Math.min(1, gateScore))
    
    // Bitcrusher/Distortion
    let distortionScore = 0.3
    if (characteristics.includes('high_energy')) distortionScore *= 1.4
    if (characteristics.includes('drop_heavy')) distortionScore *= 1.3
    if (characteristics.includes('ambient')) distortionScore *= 0.4
    compatibility.set('bitcrusher', Math.min(1, distortionScore))
    compatibility.set('distortion', Math.min(1, distortionScore * 0.8))
    
    // Sidechain compression
    let sidechainScore = 0.5
    if (characteristics.includes('house')) sidechainScore *= 1.5
    if (characteristics.includes('techno')) sidechainScore *= 1.4
    if (characteristics.includes('four_on_floor')) sidechainScore *= 1.3
    compatibility.set('sidechain', Math.min(1, sidechainScore))
    
    return compatibility
  }

  private recommendGeneralEffects(
    characteristics: string[],
    compatibility: Map<string, number>,
    mixPoints: MixPointAnalysis
  ): EffectRecommendation[] {
    const recommendations: EffectRecommendation[] = []
    
    // Check each preset for compatibility
    this.effectPresets.forEach((preset, presetId) => {
      // Calculate match score
      let matchScore = 0
      let matchCount = 0
      
      // Check positive matches
      preset.bestFor.forEach(trait => {
        if (characteristics.includes(trait)) {
          matchScore += 1
          matchCount++
        }
      })
      
      // Check negative matches
      preset.avoidFor.forEach(trait => {
        if (characteristics.includes(trait)) {
          matchScore -= 0.5
        }
      })
      
      // Check effect type compatibility
      let effectCompatScore = 0
      preset.effects.forEach(effect => {
        effectCompatScore += compatibility.get(effect.effectType) || 0.5
      })
      effectCompatScore /= preset.effects.length
      
      // Calculate overall confidence
      const confidence = Math.max(0, Math.min(1, 
        (matchScore / Math.max(1, preset.bestFor.length)) * 0.6 +
        effectCompatScore * 0.4
      ))
      
      if (confidence > 0.4) {
        // Find ideal timing
        const timing = this.findIdealTiming(preset, mixPoints, characteristics)
        
        // Generate reasoning
        const reasoning = this.generateReasoning(preset, characteristics, matchCount)
        
        // Find alternatives
        const alternatives = this.findAlternativePresets(preset, characteristics)
        
        // Generate warnings
        const warnings = this.generateWarnings(preset, characteristics)
        
        // Find combinations
        const combinesWith = this.findCombinations(preset, characteristics)
        
        recommendations.push({
          preset,
          confidence,
          timing,
          reasoning,
          alternatives,
          warnings,
          combinesWith
        })
      }
    })
    
    // Sort by confidence and return top recommendations
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
  }

  private recommendTransitionEffects(
    transition: TransitionSuggestion,
    characteristics: string[],
    compatibility: Map<string, number>
  ): EffectRecommendation[] {
    const recommendations: EffectRecommendation[] = []
    
    // Recommend effects based on transition type
    switch (transition.technique.name) {
      case 'Echo Out':
        const echoPreset = this.effectPresets.get('tension_builder_delay')
        if (echoPreset) {
          recommendations.push({
            preset: echoPreset,
            confidence: 0.9,
            timing: {
              idealStartPoint: transition.timing.startBeat * 60 / 128, // Convert to seconds
              duration: transition.timing.totalDuration,
              alignToPhrase: true
            },
            reasoning: ['Perfect for echo out transition', 'Builds tension effectively'],
            alternatives: [],
            warnings: [],
            combinesWith: ['smooth_filter_sweep']
          })
        }
        break
        
      case 'Filter Sweep':
        const filterPreset = this.effectPresets.get('smooth_filter_sweep')
        if (filterPreset) {
          recommendations.push({
            preset: filterPreset,
            confidence: 0.95,
            timing: {
              idealStartPoint: transition.timing.startBeat * 60 / 128,
              duration: transition.timing.totalDuration,
              alignToPhrase: true
            },
            reasoning: ['Essential for filter sweep transition', 'Smooth frequency transition'],
            alternatives: [],
            warnings: [],
            combinesWith: ['breakdown_wash']
          })
        }
        break
        
      case 'Drop Swap':
        const glitchPreset = this.effectPresets.get('glitch_transition')
        if (glitchPreset && compatibility.get('bitcrusher')! > 0.5) {
          recommendations.push({
            preset: glitchPreset,
            confidence: 0.7,
            timing: {
              idealStartPoint: transition.timing.startBeat * 60 / 128 - 0.5, // Start slightly before
              duration: 1,
              alignToPhrase: false
            },
            reasoning: ['Adds impact to drop swap', 'Creates unique transition moment'],
            alternatives: [],
            warnings: ['Use sparingly for maximum impact', 'May not work with all genres'],
            combinesWith: []
          })
        }
        break
    }
    
    return recommendations
  }

  private identifyCreativeOpportunities(
    analysis: EnhancedAnalysisResult,
    mixPoints: MixPointAnalysis,
    characteristics: string[]
  ): Array<{
    timestamp: number
    type: 'vocal_isolation' | 'rhythmic_gate' | 'filter_sweep' | 'space_creation' | 'tension_builder'
    suggestedEffect: EffectPreset
    confidence: number
  }> {
    const opportunities: Array<any> = []
    
    // Check for vocal isolation opportunities
    if (analysis.vocalFeatures.hasVocals && analysis.vocalFeatures.instrumentalSegments) {
      analysis.vocalFeatures.instrumentalSegments.forEach(segment => {
        if (segment.confidence > 0.7 && segment.endTime - segment.startTime > 4) {
          const preset = this.effectPresets.get('vocal_space_creator')
          if (preset) {
            opportunities.push({
              timestamp: segment.startTime,
              type: 'vocal_isolation',
              suggestedEffect: preset,
              confidence: segment.confidence * 0.8
            })
          }
        }
      })
    }
    
    // Check for rhythmic gate opportunities
    if (characteristics.includes('minimal') && characteristics.includes('rhythmic')) {
      mixPoints.mixPoints
        .filter(point => point.type === 'instrumental')
        .forEach(point => {
          const preset = this.effectPresets.get('rhythmic_gate')
          if (preset) {
            opportunities.push({
              timestamp: point.timestamp,
              type: 'rhythmic_gate',
              suggestedEffect: preset,
              confidence: point.confidence * 0.7
            })
          }
        })
    }
    
    // Check for filter sweep opportunities
    mixPoints.transitionWindows.forEach(window => {
      if (window.type === 'smooth' || window.type === 'energy_shift') {
        const preset = this.effectPresets.get('smooth_filter_sweep')
        if (preset) {
          opportunities.push({
            timestamp: window.startTime,
            type: 'filter_sweep',
            suggestedEffect: preset,
            confidence: window.confidence * 0.8
          })
        }
      }
    })
    
    // Check for space creation opportunities
    mixPoints.structure.breakdowns.forEach(breakdown => {
      const preset = this.effectPresets.get('breakdown_wash')
      if (preset) {
        opportunities.push({
          timestamp: breakdown.start,
          type: 'space_creation',
          suggestedEffect: preset,
          confidence: 0.85
        })
      }
    })
    
    // Check for tension building opportunities
    if (mixPoints.structure.drops.length > 0) {
      mixPoints.structure.drops.forEach(drop => {
        const buildupStart = drop.timestamp - 8 // 8 seconds before drop
        if (buildupStart > 0) {
          const preset = this.effectPresets.get('tension_builder_delay')
          if (preset) {
            opportunities.push({
              timestamp: buildupStart,
              type: 'tension_builder',
              suggestedEffect: preset,
              confidence: drop.impact * 0.9
            })
          }
        }
      })
    }
    
    return opportunities
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10) // Top 10 opportunities
  }

  // Helper methods

  private isFourOnFloor(beatSpectrum: number[]): boolean {
    // Simple check for 4/4 kick pattern
    // In production, this would be more sophisticated
    const avgStrength = beatSpectrum.reduce((a, b) => a + b, 0) / beatSpectrum.length
    const kickPattern = beatSpectrum.filter((v, i) => i % 4 === 0)
    const kickAvg = kickPattern.reduce((a, b) => a + b, 0) / kickPattern.length
    return kickAvg > avgStrength * 1.5
  }

  private calculateComplexity(
    spectral: SpectralFeatures,
    mood: MoodFeatures
  ): number {
    let complexity = 0
    
    // Spectral complexity
    if (spectral.spectralBandEnergy) {
      const bands = Object.values(spectral.spectralBandEnergy)
      const activeOBands = bands.filter(band => {
        const avg = band.reduce((a, b) => a + b, 0) / band.length
        return avg > 0.3
      }).length
      complexity += activeOBands / bands.length * 0.5
    }
    
    // Energy variance
    complexity += Math.min(mood.energyVariability * 2, 1) * 0.3
    
    // Mood changes
    if (mood.moodProgression.length > 3) {
      complexity += 0.2
    }
    
    return Math.min(1, complexity)
  }

  private findIdealTiming(
    preset: EffectPreset,
    mixPoints: MixPointAnalysis,
    characteristics: string[]
  ): EffectRecommendation['timing'] {
    // Find the best timing based on preset category
    let idealStartPoint = 0
    let duration = 8 // Default 8 seconds
    let alignToPhrase = true
    
    switch (preset.category) {
      case 'buildup':
        // Find next drop and start effect before it
        const nextDrop = mixPoints.structure.drops.find(d => d.timestamp > 0)
        if (nextDrop) {
          idealStartPoint = Math.max(0, nextDrop.timestamp - 8)
          duration = 8
        }
        break
        
      case 'breakdown':
        // Use during breakdown sections
        const breakdown = mixPoints.structure.breakdowns[0]
        if (breakdown) {
          idealStartPoint = breakdown.start
          duration = breakdown.end - breakdown.start
        }
        break
        
      case 'transition':
        // Use at transition points
        const transitionPoint = mixPoints.optimalOutPoints[0]
        if (transitionPoint) {
          idealStartPoint = transitionPoint.timestamp - 8
          duration = 16
        }
        break
        
      case 'creative':
      case 'rhythmic':
        // More flexible timing
        alignToPhrase = preset.category === 'rhythmic'
        break
    }
    
    return { idealStartPoint, duration, alignToPhrase }
  }

  private generateReasoning(
    preset: EffectPreset,
    characteristics: string[],
    matchCount: number
  ): string[] {
    const reasoning: string[] = []
    
    if (matchCount > 0) {
      reasoning.push(`Matches ${matchCount} track characteristics`)
    }
    
    // Category-specific reasoning
    switch (preset.category) {
      case 'buildup':
        reasoning.push('Effective for building tension before drops')
        break
      case 'breakdown':
        reasoning.push('Creates space and atmosphere during breakdowns')
        break
      case 'transition':
        reasoning.push('Smooths transitions between tracks')
        break
      case 'creative':
        reasoning.push('Adds unique character and interest')
        break
      case 'rhythmic':
        reasoning.push('Enhances rhythmic elements')
        break
    }
    
    // Specific trait reasoning
    if (characteristics.includes('minimal') && preset.bestFor.includes('minimal')) {
      reasoning.push('Works well with minimal arrangement')
    }
    if (characteristics.includes('vocal') && !preset.avoidFor.includes('vocal_heavy')) {
      reasoning.push('Compatible with vocal elements')
    }
    
    return reasoning
  }

  private generateWarnings(
    preset: EffectPreset,
    characteristics: string[]
  ): string[] {
    const warnings: string[] = []
    
    // Check for conflicts
    preset.avoidFor.forEach(avoid => {
      if (characteristics.includes(avoid)) {
        switch (avoid) {
          case 'vocal_heavy':
            warnings.push('May interfere with vocal clarity')
            break
          case 'complex':
            warnings.push('Could make busy mix too cluttered')
            break
          case 'drop':
            warnings.push('Might reduce drop impact')
            break
          case 'high_energy':
            warnings.push('Could disrupt energy flow')
            break
        }
      }
    })
    
    // Difficulty warnings
    if (preset.difficulty === 'expert') {
      warnings.push('Requires precise timing and practice')
    }
    
    // Effect-specific warnings
    if (preset.effects.some(e => e.effectType === 'bitcrusher')) {
      warnings.push('Use sparingly to avoid ear fatigue')
    }
    if (preset.effects.some(e => e.effectType === 'gate')) {
      warnings.push('Ensure proper beat alignment')
    }
    
    return warnings
  }

  private findAlternativePresets(
    mainPreset: EffectPreset,
    characteristics: string[]
  ): EffectPreset[] {
    const alternatives: EffectPreset[] = []
    
    this.effectPresets.forEach((preset, id) => {
      if (id !== mainPreset.id && preset.category === mainPreset.category) {
        // Check if it's a viable alternative
        let viability = 0
        preset.bestFor.forEach(trait => {
          if (characteristics.includes(trait)) viability++
        })
        preset.avoidFor.forEach(trait => {
          if (characteristics.includes(trait)) viability--
        })
        
        if (viability > 0) {
          alternatives.push(preset)
        }
      }
    })
    
    return alternatives.slice(0, 2) // Top 2 alternatives
  }

  private findCombinations(
    preset: EffectPreset,
    characteristics: string[]
  ): string[] {
    const combinations: string[] = []
    
    // Logic for finding complementary effects
    if (preset.category === 'transition') {
      if (characteristics.includes('breakdown')) {
        combinations.push('breakdown_wash')
      }
      if (characteristics.includes('buildup')) {
        combinations.push('tension_builder_delay')
      }
    }
    
    if (preset.category === 'creative' && !preset.effects.some(e => e.effectType === 'reverb')) {
      combinations.push('ambient_texture')
    }
    
    if (preset.category === 'rhythmic' && characteristics.includes('house')) {
      combinations.push('pumping_sidechain')
    }
    
    return combinations.filter(id => this.effectPresets.has(id))
  }

  /**
   * Generate effect automation for real-time application
   */
  generateAutomationScript(
    recommendation: EffectRecommendation,
    bpm: number = 128
  ): Array<{
    time: number
    action: string
    parameters: any
  }> {
    const script: Array<any> = []
    const startTime = recommendation.timing.idealStartPoint
    
    recommendation.preset.effects.forEach(effect => {
      // Enable effect
      script.push({
        time: startTime,
        action: `enable_${effect.effectType}`,
        parameters: effect.parameters
      })
      
      // Add automation points
      if (effect.automation) {
        const auto = effect.automation
        const duration = auto.beatSync ? 
          (auto.duration * 60 / bpm) : auto.duration
        
        // Generate automation curve points
        const numPoints = Math.ceil(duration * 10) // 10 points per second
        for (let i = 0; i <= numPoints; i++) {
          const progress = i / numPoints
          const time = startTime + (progress * duration)
          const value = this.interpolateValue(
            auto.startValue,
            auto.endValue,
            progress,
            auto.curveType
          )
          
          script.push({
            time,
            action: `automate_${effect.effectType}_${auto.parameter}`,
            parameters: { value }
          })
        }
      }
      
      // Disable effect after duration
      script.push({
        time: startTime + recommendation.timing.duration,
        action: `disable_${effect.effectType}`,
        parameters: {}
      })
    })
    
    return script.sort((a, b) => a.time - b.time)
  }

  private interpolateValue(
    start: number,
    end: number,
    progress: number,
    curveType: string
  ): number {
    switch (curveType) {
      case 'linear':
        return start + (end - start) * progress
      
      case 'exponential':
        return start + (end - start) * Math.pow(progress, 2)
      
      case 'logarithmic':
        return start + (end - start) * Math.log10(1 + progress * 9) / Math.log10(10)
      
      case 'sine':
        return start + (end - start) * Math.sin(progress * Math.PI / 2)
      
      case 'square':
        return progress < 0.5 ? start : end
      
      default:
        return start + (end - start) * progress
    }
  }
}

// Export singleton instance
export const effectsRecommendationEngine = new ProductionEffectsRecommendationEngine()