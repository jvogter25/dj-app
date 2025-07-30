// Production Adaptive Suggestion Engine
// Combines all AI systems to provide intelligent, context-aware suggestions

import { EnhancedAnalysisResult } from './enhancedAudioAnalysis'
import { TrackAnalysis } from './trackDatabase'
import { contextAwareSystem, DJContext } from './contextAwareSystem'
import { createDJLearningSystem, TrackContext } from './djLearningSystem'
import { transitionSuggestionEngine } from './transitionSuggestionEngine'
import { effectsRecommendationEngine } from './effectsRecommendationEngine'
import { transitionQualityPredictor } from './transitionQualityPredictor'
import { crowdResponsePredictor } from './crowdResponsePredictor'
import { mixPointDetector } from './mixPointDetector'
import { RealtimeAnalysisResult } from './realtimeAudioAnalyzer'

export interface AdaptiveSuggestion {
  id: string
  type: 'track' | 'transition' | 'effect' | 'energy' | 'special'
  confidence: number
  priority: number
  timing: 'immediate' | 'next' | 'upcoming' | 'future'
  
  // Suggestion details
  suggestion: {
    // For track suggestions
    track?: TrackAnalysis & {
      matchScore: number
      matchReasons: string[]
      warnings?: string[]
    }
    
    // For transition suggestions
    transition?: {
      technique: string
      duration: number
      difficulty: number
      automation: any[]
    }
    
    // For effect suggestions
    effects?: {
      type: string
      preset: string
      timing: number
      automation: any[]
    }[]
    
    // For energy suggestions
    energyAdjustment?: {
      target: number
      rate: number
      method: string
    }
    
    // For special moments
    specialMoment?: {
      type: string
      countdown: number
      preparation: string[]
    }
  }
  
  // Reasoning
  reasoning: {
    primary: string
    factors: {
      factor: string
      impact: number
      description: string
    }[]
    alternatives?: string[]
  }
  
  // Metadata
  metadata: {
    generatedAt: number
    expiresAt: number
    context: Partial<DJContext>
    realtimeData?: Partial<RealtimeAnalysisResult>
    learningFactors?: Map<string, number>
  }
}

export interface AdaptiveEngineConfig {
  // Weighting factors
  weights: {
    contextual: number      // 0-1, weight for context-based suggestions
    learning: number        // 0-1, weight for learned preferences
    realtime: number        // 0-1, weight for real-time analysis
    predictive: number      // 0-1, weight for ML predictions
  }
  
  // Behavior settings
  behavior: {
    suggestionCount: number      // Max suggestions to generate
    updateFrequency: number      // Milliseconds between updates
    lookAheadTime: number        // Minutes to look ahead
    riskTolerance: number        // 0-1, willingness to suggest risky options
    noveltyPreference: number    // 0-1, preference for new vs familiar
  }
  
  // Feature toggles
  features: {
    useRealtimeAnalysis: boolean
    useLearning: boolean
    useContext: boolean
    usePredictions: boolean
    generateAlternatives: boolean
  }
}

export class ProductionAdaptiveSuggestionEngine {
  private config: AdaptiveEngineConfig
  private learningSystem: ReturnType<typeof createDJLearningSystem> | null = null
  private suggestionHistory: AdaptiveSuggestion[] = []
  private readonly maxHistorySize = 100
  
  constructor(config?: Partial<AdaptiveEngineConfig>) {
    this.config = {
      weights: {
        contextual: 0.3,
        learning: 0.3,
        realtime: 0.2,
        predictive: 0.2
      },
      behavior: {
        suggestionCount: 5,
        updateFrequency: 5000,
        lookAheadTime: 10,
        riskTolerance: 0.5,
        noveltyPreference: 0.3
      },
      features: {
        useRealtimeAnalysis: true,
        useLearning: true,
        useContext: true,
        usePredictions: true,
        generateAlternatives: true
      },
      ...config
    }
  }
  
  /**
   * Initialize with user learning system
   */
  initializeLearning(userId: string) {
    this.learningSystem = createDJLearningSystem(userId)
  }
  
  /**
   * Generate adaptive suggestions based on all inputs
   */
  async generateSuggestions(
    currentTrack: TrackAnalysis | null,
    nextTrack: TrackAnalysis | null,
    availableTracks: TrackAnalysis[],
    context: DJContext,
    realtimeData?: RealtimeAnalysisResult
  ): Promise<AdaptiveSuggestion[]> {
    const suggestions: AdaptiveSuggestion[] = []
    
    // Generate track suggestions
    if (availableTracks.length > 0) {
      const trackSuggestions = await this.generateTrackSuggestions(
        currentTrack,
        availableTracks,
        context,
        realtimeData
      )
      suggestions.push(...trackSuggestions)
    }
    
    // Generate transition suggestions
    if (currentTrack && nextTrack) {
      const transitionSuggestions = await this.generateTransitionSuggestions(
        currentTrack,
        nextTrack,
        context,
        realtimeData
      )
      suggestions.push(...transitionSuggestions)
    }
    
    // Generate effect suggestions
    if (currentTrack) {
      const effectSuggestions = await this.generateEffectSuggestions(
        currentTrack,
        context,
        realtimeData
      )
      suggestions.push(...effectSuggestions)
    }
    
    // Generate energy adjustment suggestions
    const energySuggestions = this.generateEnergySuggestions(
      context,
      realtimeData
    )
    suggestions.push(...energySuggestions)
    
    // Generate special moment suggestions
    const specialSuggestions = this.generateSpecialMomentSuggestions(
      context,
      currentTrack
    )
    suggestions.push(...specialSuggestions)
    
    // Sort by priority and confidence
    suggestions.sort((a, b) => {
      const scoreA = a.priority * a.confidence
      const scoreB = b.priority * b.confidence
      return scoreB - scoreA
    })
    
    // Limit to configured count
    const finalSuggestions = suggestions.slice(0, this.config.behavior.suggestionCount)
    
    // Update history
    this.updateHistory(finalSuggestions)
    
    return finalSuggestions
  }
  
  /**
   * Generate track suggestions
   */
  private async generateTrackSuggestions(
    currentTrack: TrackAnalysis | null,
    availableTracks: TrackAnalysis[],
    context: DJContext,
    realtimeData?: RealtimeAnalysisResult
  ): Promise<AdaptiveSuggestion[]> {
    const suggestions: AdaptiveSuggestion[] = []
    
    // Get context-based recommendations
    const contextRecs = contextAwareSystem.getRecommendations(context)
    const energyRec = contextAwareSystem.getEnergyRecommendation(context)
    const genreWeights = contextAwareSystem.getGenreRecommendations(context)
    
    // Get learning-based preferences
    const learningRecs = this.learningSystem?.getPersonalizedRecommendations({
      venueType: context.venue.type,
      timeOfDay: context.time.hour,
      dayOfWeek: context.time.dayOfWeek,
      crowdEnergy: context.audience.energy
    })
    
    // Score each track
    const scoredTracks = availableTracks.map(track => {
      let score = 0
      const reasons: string[] = []
      const factors: any[] = []
      
      // Base compatibility score
      if (currentTrack) {
        const compatibility = this.calculateTrackCompatibility(currentTrack, track)
        score += compatibility * 0.3
        factors.push({
          factor: 'compatibility',
          impact: compatibility,
          description: `${Math.round(compatibility * 100)}% compatible with current track`
        })
      }
      
      // Context score
      if (this.config.features.useContext && contextRecs) {
        const contextScore = this.scoreTrackForContext(track, contextRecs, energyRec)
        score += contextScore * this.config.weights.contextual
        
        if (contextScore > 0.7) {
          reasons.push('Perfect for current context')
        } else if (contextScore > 0.5) {
          reasons.push('Good contextual fit')
        }
        
        factors.push({
          factor: 'context',
          impact: contextScore,
          description: `Matches ${context.venue.type} at ${context.time.hour}:00`
        })
      }
      
      // Genre preference score
      if (genreWeights.size > 0 && track.analysis?.genreClassification?.primary) {
        const genreScore = genreWeights.get(track.analysis.genreClassification.primary) || 0
        score += genreScore * 0.2
        
        if (genreScore > 0.3) {
          reasons.push(`${track.analysis.genreClassification.primary} is trending now`)
        }
      }
      
      // Learning score
      if (this.config.features.useLearning && learningRecs) {
        const adjusted = this.learningSystem!.adjustRecommendationScores(
          [{ ...track, score: 1 }],
          {
            venueType: context.venue.type,
            timeOfDay: context.time.hour,
            dayOfWeek: context.time.dayOfWeek,
            crowdEnergy: context.audience.energy
          }
        )[0]
        const learningScore = adjusted.score
        score += learningScore * this.config.weights.learning
        
        factors.push({
          factor: 'learning',
          impact: learningScore,
          description: 'Matches your playing style'
        })
      }
      
      // Real-time analysis score
      if (this.config.features.useRealtimeAnalysis && realtimeData) {
        const realtimeScore = this.scoreTrackForRealtimeData(track, realtimeData)
        score += realtimeScore * this.config.weights.realtime
        
        if (realtimeScore > 0.8) {
          reasons.push('Perfect energy match')
        }
        
        factors.push({
          factor: 'realtime',
          impact: realtimeScore,
          description: 'Matches current crowd energy'
        })
      }
      
      // Crowd response prediction
      // Skip for now until we have proper GenreClassificationResult data
      // This will be populated when tracks have full analysis data
      if (this.config.features.usePredictions) {
        // Simple energy-based prediction as fallback
        const energyScore = track.energy || 0.5
        const predictiveScore = energyScore * 0.7 // Simple heuristic
        score += predictiveScore * this.config.weights.predictive
        
        if (predictiveScore > 0.6) {
          reasons.push('Good energy for crowd response')
        }
      }
      
      // Novelty bonus
      if (this.config.behavior.noveltyPreference > 0.5 && !this.wasRecentlyPlayed(track.id)) {
        score *= (1 + this.config.behavior.noveltyPreference * 0.2)
        reasons.push('Fresh selection')
      }
      
      return {
        track,
        score,
        reasons,
        factors
      }
    })
    
    // Sort by score and take top tracks
    scoredTracks.sort((a, b) => b.score - a.score)
    const topTracks = scoredTracks.slice(0, 3)
    
    // Convert to suggestions
    topTracks.forEach((scored, index) => {
      const timing = index === 0 ? 'next' : 'upcoming'
      const priority = 1 - (index * 0.2)
      
      suggestions.push({
        id: `track_${Date.now()}_${index}`,
        type: 'track',
        confidence: Math.min(1, scored.score),
        priority,
        timing,
        suggestion: {
          track: {
            ...scored.track,
            matchScore: scored.score,
            matchReasons: scored.reasons,
            warnings: this.getTrackWarnings(scored.track, context)
          }
        },
        reasoning: {
          primary: scored.reasons[0] || 'Good match for current situation',
          factors: scored.factors,
          alternatives: index === 0 ? [
            'Try a different genre for variety',
            'Consider energy progression'
          ] : undefined
        },
        metadata: {
          generatedAt: Date.now(),
          expiresAt: Date.now() + 60000, // 1 minute
          context: {
            venue: context.venue,
            audience: context.audience
          },
          realtimeData: realtimeData ? {
            tempo: realtimeData.tempo,
            rms: realtimeData.rms
          } : undefined
        }
      })
    })
    
    return suggestions
  }
  
  /**
   * Generate transition suggestions
   */
  private async generateTransitionSuggestions(
    trackA: TrackAnalysis,
    trackB: TrackAnalysis,
    context: DJContext,
    realtimeData?: RealtimeAnalysisResult
  ): Promise<AdaptiveSuggestion[]> {
    const suggestions: AdaptiveSuggestion[] = []
    
    // For now, skip transition suggestions until we have full analysis data
    // This will be populated when tracks have complete EnhancedAnalysisResult data
    if (!trackA.analysis || !trackB.analysis) return suggestions
    
    // Create a simple basic transition suggestion using available data
    const basicTransition = {
      technique: {
        name: 'Classic Blend',
        difficulty: 0.3, // 0-1 scale, beginner level
        description: 'Smooth crossfade with gradual EQ swap'
      },
      timing: {
        totalDuration: 32 // beats
      },
      compatibility: {
        harmonic: this.calculateKeyDistance(trackA.camelotKey || '1A', trackB.camelotKey || '1A') < 2 ? 0.8 : 0.4,
        energy: 1 - Math.abs((trackA.energy || 0.5) - (trackB.energy || 0.5))
      },
      confidence: 0.7,
      crossfader: {
        automation: []
      },
      eqAutomation: []
    }
    
    // Build suggestion with basic transition
    const confidence = basicTransition.confidence
    
    suggestions.push({
      id: `transition_${Date.now()}`,
      type: 'transition',
      confidence,
      priority: 0.9,
      timing: 'upcoming',
      suggestion: {
        transition: {
          technique: basicTransition.technique.name,
          duration: basicTransition.timing.totalDuration,
          difficulty: basicTransition.technique.difficulty,
          automation: []
        }
      },
      reasoning: {
        primary: basicTransition.technique.description,
        factors: [
          {
            factor: 'harmonic',
            impact: basicTransition.compatibility.harmonic,
            description: `Key compatibility: ${Math.round(basicTransition.compatibility.harmonic * 100)}%`
          },
          {
            factor: 'energy',
            impact: basicTransition.compatibility.energy,
            description: `Energy flow: ${Math.round(basicTransition.compatibility.energy * 100)}%`
          },
          {
            factor: 'quality',
            impact: confidence,
            description: 'Basic transition recommendation'
          }
        ]
      },
      metadata: {
        generatedAt: Date.now(),
        expiresAt: Date.now() + 300000, // 5 minutes
        context: {
          venue: context.venue,
          event: context.event
        }
      }
    })
    
    return suggestions
  }
  
  /**
   * Generate effect suggestions
   */
  private async generateEffectSuggestions(
    currentTrack: TrackAnalysis,
    context: DJContext,
    realtimeData?: RealtimeAnalysisResult
  ): Promise<AdaptiveSuggestion[]> {
    const suggestions: AdaptiveSuggestion[] = []
    
    if (!currentTrack.analysis) return suggestions
    
    // For now, provide basic effect suggestions until we have full analysis
    // Create a simple reverb suggestion based on venue type
    const basicEffect = {
      type: context.venue.type === 'club' ? 'reverb' : 'filter',
      preset: 'medium',
      confidence: 0.6,
      timing: {
        optimal: 30 // seconds into track
      },
      reasoning: `Good for ${context.venue.type} atmosphere`,
      automation: []
    }
    
    // Create basic effect suggestion
    suggestions.push({
      id: `effect_${Date.now()}`,
      type: 'effect',
      confidence: basicEffect.confidence,
      priority: 0.7,
      timing: basicEffect.timing.optimal < 30 ? 'immediate' : 'upcoming',
      suggestion: {
        effects: [{
          type: basicEffect.type,
          preset: basicEffect.preset,
          timing: basicEffect.timing.optimal,
          automation: basicEffect.automation
        }]
      },
      reasoning: {
        primary: basicEffect.reasoning,
        factors: [
          {
            factor: 'timing',
            impact: 0.8,
            description: `Best at ${Math.round(basicEffect.timing.optimal)}s`
          },
          {
            factor: 'context',
            impact: 0.7,
            description: `Good for ${context.venue.type} setting`
          }
        ]
      },
      metadata: {
        generatedAt: Date.now(),
        expiresAt: Date.now() + 120000, // 2 minutes
        context: { venue: context.venue }
      }
    })
    
    return suggestions
  }
  
  /**
   * Generate energy adjustment suggestions
   */
  private generateEnergySuggestions(
    context: DJContext,
    realtimeData?: RealtimeAnalysisResult
  ): AdaptiveSuggestion[] {
    const suggestions: AdaptiveSuggestion[] = []
    
    const energyRec = contextAwareSystem.getEnergyRecommendation(context)
    
    // Check if energy adjustment needed
    const currentEnergy = realtimeData?.rms || context.audience.energy
    const energyDiff = Math.abs(currentEnergy - energyRec.currentTarget)
    
    if (energyDiff > 0.15) {
      const direction = currentEnergy < energyRec.currentTarget ? 'increase' : 'decrease'
      const urgency = energyDiff > 0.3 ? 'immediate' : 'next'
      
      suggestions.push({
        id: `energy_${Date.now()}`,
        type: 'energy',
        confidence: 0.8,
        priority: energyDiff > 0.3 ? 1 : 0.6,
        timing: urgency as any,
        suggestion: {
          energyAdjustment: {
            target: energyRec.currentTarget,
            rate: energyDiff > 0.3 ? 0.1 : 0.05,
            method: direction === 'increase' ? 'build_up' : 'cool_down'
          }
        },
        reasoning: {
          primary: energyRec.reasoning,
          factors: [
            {
              factor: 'current',
              impact: currentEnergy,
              description: `Current: ${Math.round(currentEnergy * 100)}%`
            },
            {
              factor: 'target',
              impact: energyRec.currentTarget,
              description: `Target: ${Math.round(energyRec.currentTarget * 100)}%`
            },
            {
              factor: 'progression',
              impact: 0.7,
              description: `Strategy: ${energyRec.progression}`
            }
          ]
        },
        metadata: {
          generatedAt: Date.now(),
          expiresAt: Date.now() + 180000, // 3 minutes
          context: {
            time: context.time,
            audience: context.audience
          }
        }
      })
    }
    
    return suggestions
  }
  
  /**
   * Generate special moment suggestions
   */
  private generateSpecialMomentSuggestions(
    context: DJContext,
    currentTrack: TrackAnalysis | null
  ): AdaptiveSuggestion[] {
    const suggestions: AdaptiveSuggestion[] = []
    
    const specialMoments = contextAwareSystem.getSpecialMoments(context)
    
    specialMoments.forEach(moment => {
      const preparation: string[] = []
      
      // Add preparation steps based on moment type
      switch (moment.type) {
        case 'drop':
          preparation.push('Build energy with rising elements')
          preparation.push('Prepare crowd with MC callout')
          preparation.push('Have backup track ready')
          break
        case 'breakdown':
          preparation.push('Gradually reduce bass energy')
          preparation.push('Add atmospheric effects')
          break
        case 'anthem':
          preparation.push('Clear the mix for maximum impact')
          preparation.push('Prepare lighting cue')
          preparation.push('Check volume headroom')
          break
      }
      
      suggestions.push({
        id: `special_${Date.now()}_${moment.type}`,
        type: 'special',
        confidence: moment.confidence,
        priority: 0.8,
        timing: moment.timeFromNow < 5 ? 'upcoming' : 'future',
        suggestion: {
          specialMoment: {
            type: moment.type,
            countdown: moment.timeFromNow,
            preparation
          }
        },
        reasoning: {
          primary: moment.reasoning,
          factors: [
            {
              factor: 'timing',
              impact: 0.9,
              description: `Optimal in ${moment.timeFromNow} minutes`
            },
            {
              factor: 'context',
              impact: moment.confidence,
              description: 'Based on venue and crowd'
            }
          ]
        },
        metadata: {
          generatedAt: Date.now(),
          expiresAt: Date.now() + moment.timeFromNow * 60000,
          context: {
            venue: context.venue,
            event: context.event
          }
        }
      })
    })
    
    return suggestions
  }
  
  // Helper methods
  
  private calculateTrackCompatibility(trackA: TrackAnalysis, trackB: TrackAnalysis): number {
    let score = 0.5
    
    // Tempo compatibility
    if (trackA.tempo && trackB.tempo) {
      const tempoDiff = Math.abs(trackA.tempo - trackB.tempo)
      score += (1 - tempoDiff / 20) * 0.3
    }
    
    // Key compatibility
    if (trackA.camelotKey && trackB.camelotKey) {
      const keyDistance = this.calculateKeyDistance(trackA.camelotKey, trackB.camelotKey)
      score += (1 - keyDistance / 6) * 0.3
    }
    
    // Energy compatibility
    if (trackA.energy !== undefined && trackB.energy !== undefined) {
      const energyDiff = Math.abs(trackA.energy - trackB.energy)
      score += (1 - energyDiff) * 0.2
    }
    
    // Genre compatibility
    if (trackA.genre === trackB.genre) {
      score += 0.2
    }
    
    return Math.max(0, Math.min(1, score))
  }
  
  private scoreTrackForContext(
    track: TrackAnalysis,
    contextRecs: any,
    energyRec: any
  ): number {
    let score = 0.5
    
    // Energy match
    if (track.energy !== undefined && energyRec) {
      const energyDiff = Math.abs(track.energy - energyRec.currentTarget)
      score += (1 - energyDiff) * 0.4
    }
    
    // Tempo match
    if (track.tempo && contextRecs.trackCriteria?.tempo) {
      const { min, max, preferred } = contextRecs.trackCriteria.tempo
      if (track.tempo >= min && track.tempo <= max) {
        const tempoDiff = Math.abs(track.tempo - preferred)
        score += (1 - tempoDiff / (max - min)) * 0.3
      } else {
        score -= 0.2
      }
    }
    
    // Genre match
    if (track.analysis?.genreClassification?.primary && contextRecs.trackCriteria?.genres) {
      const genreWeight = contextRecs.trackCriteria.genres.get(track.analysis.genreClassification.primary) || 0
      score += genreWeight * 0.3
    }
    
    return Math.max(0, Math.min(1, score))
  }
  
  private scoreTrackForRealtimeData(
    track: TrackAnalysis,
    realtimeData: RealtimeAnalysisResult
  ): number {
    let score = 0.5
    
    // Tempo match
    if (track.tempo && realtimeData.tempo > 0) {
      const tempoDiff = Math.abs(track.tempo - realtimeData.tempo)
      score += (1 - tempoDiff / 10) * 0.5
    }
    
    // Energy match
    if (track.energy !== undefined) {
      const energyDiff = Math.abs(track.energy - realtimeData.rms)
      score += (1 - energyDiff) * 0.5
    }
    
    return Math.max(0, Math.min(1, score))
  }
  
  private getTrackWarnings(track: TrackAnalysis, context: DJContext): string[] {
    const warnings: string[] = []
    
    // Venue-specific warnings
    const trackGenre = track.analysis?.genreClassification?.primary
    if (trackGenre && context.venue.restrictions?.genreRestrictions?.includes(trackGenre)) {
      warnings.push(`${trackGenre} may not be suitable for this venue`)
    }
    
    // Time-based warnings
    if (context.time.hour < 22 && track.energy && track.energy > 0.8) {
      warnings.push('Very high energy for early hours')
    }
    
    // Tempo warnings
    if (track.tempo && (track.tempo < 120 || track.tempo > 135)) {
      warnings.push('Tempo outside typical range')
    }
    
    return warnings
  }
  
  private calculateKeyDistance(keyA: string, keyB: string): number {
    // Simplified Camelot distance
    const parseKey = (key: string) => {
      const match = key.match(/(\d+)([AB])/)
      if (!match) return null
      return { number: parseInt(match[1]), letter: match[2] }
    }
    
    const a = parseKey(keyA)
    const b = parseKey(keyB)
    
    if (!a || !b) return 6
    
    if (a.number === b.number && a.letter === b.letter) return 0
    if (a.number === b.number) return 3
    
    let distance = Math.abs(a.number - b.number)
    if (distance > 6) distance = 12 - distance
    
    return distance
  }
  
  private wasRecentlyPlayed(trackId: string): boolean {
    // Check if track was suggested recently
    return this.suggestionHistory.some(s => 
      s.suggestion.track?.id === trackId &&
      Date.now() - s.metadata.generatedAt < 600000 // 10 minutes
    )
  }
  
  private updateHistory(suggestions: AdaptiveSuggestion[]) {
    this.suggestionHistory.push(...suggestions)
    
    // Maintain max size
    if (this.suggestionHistory.length > this.maxHistorySize) {
      this.suggestionHistory = this.suggestionHistory.slice(-this.maxHistorySize)
    }
  }
}

// Export singleton instance with default config
export const adaptiveSuggestionEngine = new ProductionAdaptiveSuggestionEngine()