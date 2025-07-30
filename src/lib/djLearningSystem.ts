// Production DJ Learning System
// Captures and learns from user choices to improve recommendations

import { TransitionSuggestion } from './transitionSuggestionEngine'
import { EffectRecommendation } from './effectsRecommendationEngine'
import { EnhancedAnalysisResult } from './enhancedAudioAnalysis'
import { MixPointAnalysis } from './mixPointDetector'

export interface UserAction {
  id: string
  timestamp: number
  type: 'track_selection' | 'transition_choice' | 'effect_application' | 'parameter_adjustment' | 'mix_point_selection'
  
  // Context
  context: {
    venueType?: string
    timeOfDay: number
    dayOfWeek: number
    setPosition?: string // opening, warmup, peak, cooldown, closing
    crowdEnergy?: number
    previousTrack?: TrackContext
    currentTrack?: TrackContext
  }
  
  // Action details
  action: {
    // For track selection
    selectedTrack?: TrackContext
    rejectedSuggestions?: TrackContext[]
    
    // For transitions
    selectedTransition?: TransitionSuggestion
    actualTransitionUsed?: {
      technique: string
      duration: number
      crossfaderCurve: string
      eqAdjustments: any
    }
    
    // For effects
    appliedEffects?: EffectRecommendation[]
    effectParameters?: Map<string, any>
    
    // For mix points
    selectedMixPoint?: {
      outPoint: number
      inPoint: number
      type: string
    }
  }
  
  // Outcome
  outcome?: {
    success: boolean
    crowdResponse?: number
    energyMaintained?: boolean
    technicalQuality?: number
    userSatisfaction?: number
  }
}

export interface TrackContext {
  id: string
  name: string
  artists: string[]
  tempo: number
  key?: string
  energy: number
  valence: number
  genre?: string
  analysisFeatures?: Partial<EnhancedAnalysisResult>
}

export interface LearningProfile {
  userId: string
  createdAt: number
  updatedAt: number
  
  // Preference models
  preferences: {
    // Genre preferences by context
    genrePreferences: Map<string, Map<string, number>> // context -> genre -> weight
    
    // Transition preferences
    transitionPreferences: {
      techniques: Map<string, number> // technique -> preference score
      averageDuration: number
      crossfaderStyle: string // smooth, sharp, creative
      energyProgression: 'gradual' | 'dynamic' | 'maintain'
    }
    
    // Key mixing preferences
    harmonicMixing: {
      strictness: number // 0-1, how closely to follow Camelot
      preferredMoves: Map<string, number> // "same", "+1", "-1", "relative", etc.
    }
    
    // Effect usage patterns
    effectPatterns: {
      frequency: Map<string, number> // effect type -> usage frequency
      timing: Map<string, number[]> // effect type -> typical timing in track
      combinations: Map<string, string[]> // effect -> commonly combined with
    }
    
    // Energy flow preferences
    energyFlow: {
      averageEnergyChange: number
      peakTimeEnergy: number
      warmupRate: number
      cooldownRate: number
    }
  }
  
  // Performance metrics
  performance: {
    totalSessions: number
    totalTransitions: number
    successfulTransitions: number
    averageSessionLength: number
    preferredSessionTime: number // hour of day
    
    // By venue type
    venuePerformance: Map<string, {
      sessions: number
      avgSuccess: number
      preferredGenres: string[]
    }>
  }
  
  // Learning weights (for ML model fine-tuning)
  modelWeights: {
    featureImportance: Map<string, number>
    contextWeights: Map<string, number>
    updateCount: number
  }
}

export interface LearningInsight {
  type: 'preference' | 'pattern' | 'improvement' | 'warning'
  category: string
  confidence: number
  message: string
  data?: any
}

export class ProductionDJLearningSystem {
  private profile: LearningProfile
  private recentActions: UserAction[] = []
  private readonly maxRecentActions = 1000
  private insights: LearningInsight[] = []
  
  constructor(userId: string) {
    this.profile = this.loadOrCreateProfile(userId)
  }
  
  /**
   * Record a user action for learning
   */
  recordAction(action: UserAction) {
    // Add to recent actions
    this.recentActions.push(action)
    if (this.recentActions.length > this.maxRecentActions) {
      this.recentActions.shift()
    }
    
    // Update profile based on action type
    switch (action.type) {
      case 'track_selection':
        this.updateTrackPreferences(action)
        break
      case 'transition_choice':
        this.updateTransitionPreferences(action)
        break
      case 'effect_application':
        this.updateEffectPreferences(action)
        break
      case 'mix_point_selection':
        this.updateMixPointPreferences(action)
        break
      case 'parameter_adjustment':
        this.updateParameterPreferences(action)
        break
    }
    
    // Update general metrics
    this.updatePerformanceMetrics(action)
    
    // Generate new insights
    this.generateInsights()
    
    // Save profile
    this.saveProfile()
  }
  
  /**
   * Get personalized recommendations based on learning
   */
  getPersonalizedRecommendations(context: UserAction['context']): {
    genreWeights: Map<string, number>
    transitionStyle: any
    effectSuggestions: string[]
    energyTarget: number
  } {
    const contextKey = this.getContextKey(context)
    
    // Get genre preferences for context
    const genreWeights = this.profile.preferences.genrePreferences.get(contextKey) || new Map()
    
    // Get transition style
    const transitionStyle = {
      preferredTechniques: this.getTopPreferences(this.profile.preferences.transitionPreferences.techniques, 3),
      duration: this.profile.preferences.transitionPreferences.averageDuration,
      crossfaderStyle: this.profile.preferences.transitionPreferences.crossfaderStyle
    }
    
    // Get effect suggestions based on timing
    const trackProgress = context.currentTrack ? 0.5 : 0 // Simplified
    const effectSuggestions = this.getEffectsForTiming(trackProgress)
    
    // Calculate energy target
    const energyTarget = this.calculateEnergyTarget(context)
    
    return {
      genreWeights,
      transitionStyle,
      effectSuggestions,
      energyTarget
    }
  }
  
  /**
   * Adjust recommendation scores based on learned preferences
   */
  adjustRecommendationScores<T extends { score: number; [key: string]: any }>(
    recommendations: T[],
    context: UserAction['context']
  ): T[] {
    return recommendations.map(rec => {
      let adjustedScore = rec.score
      
      // Adjust based on genre preference
      if ('genre' in rec && typeof rec.genre === 'string') {
        const genrePreference = this.getGenrePreference(context, rec.genre)
        adjustedScore *= (1 + genrePreference * 0.3)
      }
      
      // Adjust based on energy progression
      if ('energy' in rec && typeof rec.energy === 'number') {
        const energyTarget = this.calculateEnergyTarget(context)
        const energyDiff = Math.abs(rec.energy - energyTarget)
        adjustedScore *= (1 - energyDiff * 0.2)
      }
      
      // Adjust based on harmonic preference
      if ('key' in rec && context.currentTrack?.key) {
        const harmonicScore = this.getHarmonicPreference(context.currentTrack.key, rec.key as string)
        adjustedScore *= harmonicScore
      }
      
      return {
        ...rec,
        score: adjustedScore,
        learningAdjusted: true
      }
    }).sort((a, b) => b.score - a.score)
  }
  
  /**
   * Get learning insights
   */
  getInsights(): LearningInsight[] {
    return this.insights.slice(0, 10) // Return top 10 insights
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const successRate = this.profile.performance.totalTransitions > 0
      ? this.profile.performance.successfulTransitions / this.profile.performance.totalTransitions
      : 0
    
    return {
      totalSessions: this.profile.performance.totalSessions,
      totalTransitions: this.profile.performance.totalTransitions,
      successRate,
      averageSessionLength: this.profile.performance.averageSessionLength,
      preferredTime: this.profile.performance.preferredSessionTime,
      topGenres: this.getTopGenres(),
      topTransitions: this.getTopPreferences(this.profile.preferences.transitionPreferences.techniques, 5),
      venueStats: Array.from(this.profile.performance.venuePerformance.entries())
    }
  }
  
  /**
   * Export learning profile for backup
   */
  exportProfile(): string {
    return JSON.stringify(this.profile, (key, value) => {
      if (value instanceof Map) {
        return {
          _type: 'Map',
          data: Array.from(value.entries())
        }
      }
      return value
    })
  }
  
  /**
   * Import learning profile
   */
  importProfile(data: string) {
    try {
      this.profile = JSON.parse(data, (key, value) => {
        if (value && value._type === 'Map') {
          return new Map(value.data)
        }
        return value
      })
      this.saveProfile()
    } catch (error) {
      console.error('Error importing profile:', error)
    }
  }
  
  // Private methods
  
  private updateTrackPreferences(action: UserAction) {
    if (!action.action.selectedTrack) return
    
    const contextKey = this.getContextKey(action.context)
    const genre = action.action.selectedTrack.genre || 'unknown'
    
    // Update genre preferences
    if (!this.profile.preferences.genrePreferences.has(contextKey)) {
      this.profile.preferences.genrePreferences.set(contextKey, new Map())
    }
    
    const genreMap = this.profile.preferences.genrePreferences.get(contextKey)!
    const currentWeight = genreMap.get(genre) || 0
    genreMap.set(genre, currentWeight + 1)
    
    // Decay rejected suggestions
    if (action.action.rejectedSuggestions) {
      action.action.rejectedSuggestions.forEach(track => {
        const rejectedGenre = track.genre || 'unknown'
        const weight = genreMap.get(rejectedGenre) || 0
        genreMap.set(rejectedGenre, Math.max(0, weight - 0.1))
      })
    }
  }
  
  private updateTransitionPreferences(action: UserAction) {
    if (!action.action.actualTransitionUsed) return
    
    const technique = action.action.actualTransitionUsed.technique
    const currentScore = this.profile.preferences.transitionPreferences.techniques.get(technique) || 0
    
    // Update technique preference based on outcome
    const successMultiplier = action.outcome?.success ? 1.2 : 0.9
    this.profile.preferences.transitionPreferences.techniques.set(
      technique,
      currentScore * 0.9 + successMultiplier
    )
    
    // Update average duration
    const duration = action.action.actualTransitionUsed.duration
    this.profile.preferences.transitionPreferences.averageDuration =
      this.profile.preferences.transitionPreferences.averageDuration * 0.9 + duration * 0.1
    
    // Update crossfader style
    if (action.outcome?.success && action.outcome.technicalQuality && action.outcome.technicalQuality > 0.8) {
      this.profile.preferences.transitionPreferences.crossfaderStyle = 
        action.action.actualTransitionUsed.crossfaderCurve
    }
  }
  
  private updateEffectPreferences(action: UserAction) {
    if (!action.action.appliedEffects) return
    
    action.action.appliedEffects.forEach(effect => {
      // Update frequency using preset category as the effect type identifier
      const effectType = effect.preset?.category || 'unknown'
      const frequency = this.profile.preferences.effectPatterns.frequency.get(effectType) || 0
      this.profile.preferences.effectPatterns.frequency.set(effectType, frequency + 1)
      
      // Update timing (simplified - would need track position)
      const timing = this.profile.preferences.effectPatterns.timing.get(effectType) || []
      timing.push(0.5) // Placeholder
      this.profile.preferences.effectPatterns.timing.set(effectType, timing.slice(-10))
    })
    
    // Update combinations
    if (action.action.appliedEffects.length > 1) {
      const effectTypes = action.action.appliedEffects.map(e => e.preset?.category || 'unknown')
      effectTypes.forEach((type, i) => {
        const combinations = this.profile.preferences.effectPatterns.combinations.get(type) || []
        const otherEffects = effectTypes.filter((_, j) => j !== i)
        combinations.push(...otherEffects)
        this.profile.preferences.effectPatterns.combinations.set(type, combinations.slice(-20))
      })
    }
  }
  
  private updateMixPointPreferences(action: UserAction) {
    // Implementation for mix point learning
  }
  
  private updateParameterPreferences(action: UserAction) {
    // Implementation for parameter adjustment learning
  }
  
  private updatePerformanceMetrics(action: UserAction) {
    // Update session metrics
    if (action.type === 'track_selection' && !action.context.previousTrack) {
      this.profile.performance.totalSessions++
    }
    
    if (action.type === 'transition_choice') {
      this.profile.performance.totalTransitions++
      if (action.outcome?.success) {
        this.profile.performance.successfulTransitions++
      }
    }
    
    // Update venue performance
    if (action.context.venueType) {
      const venueStats = this.profile.performance.venuePerformance.get(action.context.venueType) || {
        sessions: 0,
        avgSuccess: 0,
        preferredGenres: []
      }
      
      if (action.type === 'track_selection') {
        venueStats.sessions++
      }
      
      this.profile.performance.venuePerformance.set(action.context.venueType, venueStats)
    }
    
    // Update preferred time
    const hour = action.context.timeOfDay
    this.profile.performance.preferredSessionTime = 
      this.profile.performance.preferredSessionTime * 0.95 + hour * 0.05
  }
  
  private generateInsights() {
    this.insights = []
    
    // Genre trend insights
    const topGenres = this.getTopGenres()
    if (topGenres.length > 0) {
      this.insights.push({
        type: 'preference',
        category: 'genre',
        confidence: 0.8,
        message: `Your top genres are ${topGenres.slice(0, 3).join(', ')}`,
        data: { genres: topGenres }
      })
    }
    
    // Transition success insights
    const successRate = this.profile.performance.successfulTransitions / 
      (this.profile.performance.totalTransitions || 1)
    
    if (successRate < 0.6 && this.profile.performance.totalTransitions > 10) {
      this.insights.push({
        type: 'improvement',
        category: 'transitions',
        confidence: 0.9,
        message: 'Consider practicing smoother transitions',
        data: { successRate }
      })
    }
    
    // Effect usage patterns
    const topEffects = this.getTopPreferences(this.profile.preferences.effectPatterns.frequency, 3)
    if (topEffects.length > 0) {
      this.insights.push({
        type: 'pattern',
        category: 'effects',
        confidence: 0.7,
        message: `You frequently use ${topEffects.map(e => e.key).join(', ')} effects`,
        data: { effects: topEffects }
      })
    }
    
    // Sort by confidence
    this.insights.sort((a, b) => b.confidence - a.confidence)
  }
  
  private getContextKey(context: UserAction['context']): string {
    const venue = context.venueType || 'general'
    const timeBlock = Math.floor(context.timeOfDay / 6) // 4 time blocks
    const position = context.setPosition || 'main'
    return `${venue}-${timeBlock}-${position}`
  }
  
  private getGenrePreference(context: UserAction['context'], genre: string): number {
    const contextKey = this.getContextKey(context)
    const genreMap = this.profile.preferences.genrePreferences.get(contextKey)
    if (!genreMap) return 0
    
    const weight = genreMap.get(genre) || 0
    const total = Array.from(genreMap.values()).reduce((sum, w) => sum + w, 0)
    
    return total > 0 ? weight / total : 0
  }
  
  private getHarmonicPreference(fromKey: string, toKey: string): number {
    // Simplified harmonic scoring
    const strictness = this.profile.preferences.harmonicMixing.strictness
    const baseScore = 0.5
    
    // Would implement proper Camelot wheel logic here
    return baseScore + (1 - baseScore) * strictness
  }
  
  private calculateEnergyTarget(context: UserAction['context']): number {
    const position = context.setPosition || 'main'
    const baseEnergy = context.currentTrack?.energy || 0.5
    
    switch (position) {
      case 'opening':
        return Math.min(0.4, baseEnergy + 0.1)
      case 'warmup':
        return Math.min(0.6, baseEnergy + this.profile.preferences.energyFlow.warmupRate)
      case 'peak':
        return this.profile.preferences.energyFlow.peakTimeEnergy
      case 'cooldown':
        return Math.max(0.3, baseEnergy - this.profile.preferences.energyFlow.cooldownRate)
      case 'closing':
        return Math.max(0.2, baseEnergy - 0.1)
      default:
        return baseEnergy + this.profile.preferences.energyFlow.averageEnergyChange
    }
  }
  
  private getEffectsForTiming(progress: number): string[] {
    const suggestions: string[] = []
    
    this.profile.preferences.effectPatterns.timing.forEach((timings, effect) => {
      const avgTiming = timings.reduce((sum, t) => sum + t, 0) / timings.length
      if (Math.abs(avgTiming - progress) < 0.1) {
        suggestions.push(effect)
      }
    })
    
    return suggestions
  }
  
  private getTopGenres(): string[] {
    const allGenres = new Map<string, number>()
    
    this.profile.preferences.genrePreferences.forEach(contextGenres => {
      contextGenres.forEach((weight, genre) => {
        allGenres.set(genre, (allGenres.get(genre) || 0) + weight)
      })
    })
    
    return Array.from(allGenres.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
  }
  
  private getTopPreferences(map: Map<string, number>, limit: number): { key: string; value: number }[] {
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, value]) => ({ key, value }))
  }
  
  private loadOrCreateProfile(userId: string): LearningProfile {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem(`djLearningProfile_${userId}`)
      if (saved) {
        return JSON.parse(saved, (key, value) => {
          if (value && value._type === 'Map') {
            return new Map(value.data)
          }
          return value
        })
      }
    } catch (error) {
      console.error('Error loading learning profile:', error)
    }
    
    // Create new profile
    return {
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      preferences: {
        genrePreferences: new Map(),
        transitionPreferences: {
          techniques: new Map(),
          averageDuration: 16,
          crossfaderStyle: 'smooth',
          energyProgression: 'gradual'
        },
        harmonicMixing: {
          strictness: 0.7,
          preferredMoves: new Map([
            ['same', 0.3],
            ['+1', 0.25],
            ['-1', 0.25],
            ['relative', 0.2]
          ])
        },
        effectPatterns: {
          frequency: new Map(),
          timing: new Map(),
          combinations: new Map()
        },
        energyFlow: {
          averageEnergyChange: 0.05,
          peakTimeEnergy: 0.85,
          warmupRate: 0.1,
          cooldownRate: 0.15
        }
      },
      performance: {
        totalSessions: 0,
        totalTransitions: 0,
        successfulTransitions: 0,
        averageSessionLength: 60,
        preferredSessionTime: 22,
        venuePerformance: new Map()
      },
      modelWeights: {
        featureImportance: new Map(),
        contextWeights: new Map(),
        updateCount: 0
      }
    }
  }
  
  private saveProfile() {
    this.profile.updatedAt = Date.now()
    
    try {
      const serialized = JSON.stringify(this.profile, (key, value) => {
        if (value instanceof Map) {
          return {
            _type: 'Map',
            data: Array.from(value.entries())
          }
        }
        return value
      })
      
      localStorage.setItem(`djLearningProfile_${this.profile.userId}`, serialized)
    } catch (error) {
      console.error('Error saving learning profile:', error)
    }
  }
}

// Export singleton factory
export const createDJLearningSystem = (userId: string) => new ProductionDJLearningSystem(userId)