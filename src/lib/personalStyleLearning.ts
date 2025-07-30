// Production Personal DJ Style Learning Model
// Advanced ML system that learns from user behavior and adapts to unique mixing styles

import { TrackAnalysis } from './trackDatabase'
import { DJContext } from './contextAwareSystem'

// Types for learning data
interface UserAction {
  id: string
  userId: string
  timestamp: number
  type: 'track_select' | 'track_reject' | 'transition' | 'effect_use' | 'tempo_change' | 'eq_adjust' | 'loop_create'
  context: {
    currentTrack?: TrackAnalysis
    targetTrack?: TrackAnalysis
    venue?: string
    timeOfDay?: number
    energyLevel?: number
    crowdResponse?: number
  }
  action: {
    // Track selection actions
    selectedFromSuggestions?: boolean
    suggestionRank?: number
    searchQuery?: string
    
    // Transition actions
    transitionType?: string
    mixPoint?: number
    crossfaderCurve?: number[]
    eqChanges?: { low: number, mid: number, high: number }[]
    
    // Effect actions
    effectType?: string
    effectParameters?: { [key: string]: number }
    effectDuration?: number
    
    // General parameters
    confidence?: number
    manual?: boolean
    parameters?: { [key: string]: any }
  }
  outcome: {
    success: boolean
    crowdResponse?: number
    personalSatisfaction?: number
    technicalQuality?: number
    notes?: string
  }
}

interface StylePattern {
  id: string
  type: 'track_preference' | 'transition_style' | 'effect_usage' | 'energy_management' | 'timing_preference'
  description: string
  confidence: number
  frequency: number
  conditions: {
    venue?: string[]
    timeRange?: { start: number, end: number }
    energyRange?: { min: number, max: number }
    genreContext?: string[]
  }
  parameters: {
    [key: string]: {
      value: number
      weight: number
      variance: number
    }
  }
  examples: string[]
  lastUpdated: number
}

interface PersonalityProfile {
  userId: string
  createdAt: number
  lastUpdated: number
  
  // Core characteristics
  preferences: {
    // Musical preferences
    preferredGenres: { [genre: string]: number }
    keyPreferences: { [key: string]: number }
    tempoRanges: { [range: string]: number }
    energyProgression: 'gradual' | 'dramatic' | 'steady' | 'dynamic'
    
    // Technical preferences
    preferredTransitions: { [type: string]: number }
    effectUsage: { [effect: string]: number }
    mixingStyle: 'harmonic' | 'energetic' | 'creative' | 'safe' | 'experimental'
    riskTolerance: number // 0-1
    
    // Contextual preferences
    venueAdaptation: number // How much style changes by venue
    timeAdaptation: number // How much style changes by time
    crowdAdaptation: number // How much style adapts to crowd
  }
  
  // Learned patterns
  patterns: StylePattern[]
  
  // Performance metrics
  statistics: {
    totalActions: number
    successRate: number
    avgCrowdResponse: number
    avgSatisfaction: number
    learningRate: number
    lastImprovement: number
  }
  
  // Adaptation parameters
  adaptation: {
    learningRate: number
    memoryDecay: number
    explorationRate: number
    confidenceThreshold: number
  }
}

class ProductionPersonalStyleLearning {
  private profiles: Map<string, PersonalityProfile> = new Map()
  private actionHistory: Map<string, UserAction[]> = new Map()
  private readonly maxHistorySize = 10000
  private readonly patternUpdateInterval = 24 * 60 * 60 * 1000 // 24 hours
  
  constructor() {
    this.startPeriodicUpdates()
  }
  
  // Initialize user profile
  async initializeProfile(userId: string): Promise<PersonalityProfile> {
    if (this.profiles.has(userId)) {
      return this.profiles.get(userId)!
    }
    
    const profile: PersonalityProfile = {
      userId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      
      preferences: {
        preferredGenres: {},
        keyPreferences: {},
        tempoRanges: {
          'slow': 0.2,    // 60-100 BPM
          'medium': 0.5,  // 100-130 BPM
          'fast': 0.3     // 130+ BPM
        },
        energyProgression: 'gradual',
        preferredTransitions: {
          'crossfade': 0.4,
          'cut': 0.2,
          'echo_out': 0.15,
          'filter_sweep': 0.15,
          'scratch': 0.1
        },
        effectUsage: {},
        mixingStyle: 'harmonic',
        riskTolerance: 0.5,
        venueAdaptation: 0.3,
        timeAdaptation: 0.4,
        crowdAdaptation: 0.6
      },
      
      patterns: [],
      
      statistics: {
        totalActions: 0,
        successRate: 0.5,
        avgCrowdResponse: 0.5,
        avgSatisfaction: 0.5,
        learningRate: 0.1,
        lastImprovement: Date.now()
      },
      
      adaptation: {
        learningRate: 0.1,
        memoryDecay: 0.01,
        explorationRate: 0.2,
        confidenceThreshold: 0.7
      }
    }
    
    this.profiles.set(userId, profile)
    this.actionHistory.set(userId, [])
    
    return profile
  }
  
  // Record user action for learning
  async recordAction(action: UserAction): Promise<void> {
    const profile = await this.initializeProfile(action.userId)
    
    // Add to action history
    let history = this.actionHistory.get(action.userId) || []
    history.push(action)
    
    // Maintain history size limit
    if (history.length > this.maxHistorySize) {
      history = history.slice(-this.maxHistorySize)
    }
    
    this.actionHistory.set(action.userId, history)
    
    // Update statistics
    profile.statistics.totalActions++
    
    // Update success rate with exponential smoothing
    const alpha = 0.1
    const success = action.outcome.success ? 1 : 0
    profile.statistics.successRate = 
      profile.statistics.successRate * (1 - alpha) + success * alpha
    
    // Update crowd response if available
    if (action.outcome.crowdResponse !== undefined) {
      profile.statistics.avgCrowdResponse = 
        profile.statistics.avgCrowdResponse * (1 - alpha) + 
        action.outcome.crowdResponse * alpha
    }
    
    // Update satisfaction if available
    if (action.outcome.personalSatisfaction !== undefined) {
      profile.statistics.avgSatisfaction = 
        profile.statistics.avgSatisfaction * (1 - alpha) + 
        action.outcome.personalSatisfaction * alpha
    }
    
    // Immediate learning from this action
    await this.updatePreferencesFromAction(profile, action)
    
    profile.lastUpdated = Date.now()
  }
  
  // Update preferences based on a single action
  private async updatePreferencesFromAction(profile: PersonalityProfile, action: UserAction): Promise<void> {
    const learningRate = profile.adaptation.learningRate
    const success = action.outcome.success
    const weight = success ? learningRate : -learningRate * 0.3 // Negative learning from failures
    
    switch (action.type) {
      case 'track_select':
        await this.updateTrackPreferences(profile, action, weight)
        break
        
      case 'track_reject':
        await this.updateTrackPreferences(profile, action, -weight)
        break
        
      case 'transition':
        await this.updateTransitionPreferences(profile, action, weight)
        break
        
      case 'effect_use':
        await this.updateEffectPreferences(profile, action, weight)
        break
        
      case 'tempo_change':
      case 'eq_adjust':
        await this.updateTechnicalPreferences(profile, action, weight)
        break
    }
  }
  
  // Update track selection preferences
  private async updateTrackPreferences(profile: PersonalityProfile, action: UserAction, weight: number): Promise<void> {
    const track = action.context.targetTrack || action.context.currentTrack
    if (!track) return
    
    // Update genre preferences
    if (track.genre) {
      const current = profile.preferences.preferredGenres[track.genre] || 0.5
      profile.preferences.preferredGenres[track.genre] = Math.max(0, Math.min(1, current + weight))
    }
    
    // Update key preferences
    if (track.camelotKey) {
      const current = profile.preferences.keyPreferences[track.camelotKey] || 0.5
      profile.preferences.keyPreferences[track.camelotKey] = Math.max(0, Math.min(1, current + weight))
    }
    
    // Update tempo range preferences
    const tempo = track.tempo || 120
    let tempoRange: string
    if (tempo < 100) tempoRange = 'slow'
    else if (tempo < 130) tempoRange = 'medium'
    else tempoRange = 'fast'
    
    const current = profile.preferences.tempoRanges[tempoRange]
    profile.preferences.tempoRanges[tempoRange] = Math.max(0, Math.min(1, current + weight))
    
    // Normalize tempo ranges
    const total = Object.values(profile.preferences.tempoRanges).reduce((sum, val) => sum + val, 0)
    if (total > 0) {
      Object.keys(profile.preferences.tempoRanges).forEach(range => {
        profile.preferences.tempoRanges[range] /= total
      })
    }
  }
  
  // Update transition style preferences
  private async updateTransitionPreferences(profile: PersonalityProfile, action: UserAction, weight: number): Promise<void> {
    const transitionType = action.action.transitionType
    if (!transitionType) return
    
    const current = profile.preferences.preferredTransitions[transitionType] || 0.1
    profile.preferences.preferredTransitions[transitionType] = Math.max(0, Math.min(1, current + weight))
    
    // Normalize transition preferences
    const total = Object.values(profile.preferences.preferredTransitions).reduce((sum, val) => sum + val, 0)
    if (total > 0) {
      Object.keys(profile.preferences.preferredTransitions).forEach(type => {
        profile.preferences.preferredTransitions[type] /= total
      })
    }
  }
  
  // Update effect usage preferences
  private async updateEffectPreferences(profile: PersonalityProfile, action: UserAction, weight: number): Promise<void> {
    const effectType = action.action.effectType
    if (!effectType) return
    
    const current = profile.preferences.effectUsage[effectType] || 0.1
    profile.preferences.effectUsage[effectType] = Math.max(0, Math.min(1, current + weight))
  }
  
  // Update technical mixing preferences
  private async updateTechnicalPreferences(profile: PersonalityProfile, action: UserAction, weight: number): Promise<void> {
    // Update risk tolerance based on action success
    if (action.action.confidence !== undefined) {
      const riskLevel = 1 - action.action.confidence
      const outcome = action.outcome.success ? 1 : 0
      
      // If risky moves succeed, increase risk tolerance slightly
      if (riskLevel > profile.preferences.riskTolerance && outcome > 0.5) {
        profile.preferences.riskTolerance += weight * 0.1
      }
      // If safe moves fail, might need more risk
      else if (riskLevel < profile.preferences.riskTolerance && outcome < 0.5) {
        profile.preferences.riskTolerance += weight * 0.05
      }
      
      profile.preferences.riskTolerance = Math.max(0, Math.min(1, profile.preferences.riskTolerance))
    }
  }
  
  // Generate personalized recommendations
  async generateRecommendations(
    userId: string,
    currentTrack: TrackAnalysis | null,
    availableTracks: TrackAnalysis[],
    context: DJContext
  ): Promise<{
    tracks: Array<TrackAnalysis & { personalityScore: number, reasoning: string }>
    suggestions: {
      transitionStyle: string
      effects: string[]
      energyDirection: 'up' | 'down' | 'maintain'
      confidence: number
    }
  }> {
    const profile = await this.initializeProfile(userId)
    
    // Score tracks based on personal preferences
    const scoredTracks = availableTracks.map(track => {
      const personalityScore = this.calculatePersonalityScore(profile, track, context)
      const reasoning = this.generateReasoning(profile, track, personalityScore)
      
      return {
        ...track,
        personalityScore,
        reasoning
      }
    }).sort((a, b) => b.personalityScore - a.personalityScore)
    
    // Generate style suggestions
    const suggestions = this.generateStyleSuggestions(profile, currentTrack, context)
    
    return {
      tracks: scoredTracks.slice(0, 20),
      suggestions
    }
  }
  
  // Calculate how well a track matches the user's personality
  private calculatePersonalityScore(profile: PersonalityProfile, track: TrackAnalysis, context: DJContext): number {
    let score = 0.5 // Base score
    let factors = 0
    
    // Genre preference
    if (track.genre && profile.preferences.preferredGenres[track.genre]) {
      score += profile.preferences.preferredGenres[track.genre] * 0.3
      factors++
    }
    
    // Key preference
    if (track.camelotKey && profile.preferences.keyPreferences[track.camelotKey]) {
      score += profile.preferences.keyPreferences[track.camelotKey] * 0.2
      factors++
    }
    
    // Tempo preference
    const tempo = track.tempo || 120
    let tempoRange: string
    if (tempo < 100) tempoRange = 'slow'
    else if (tempo < 130) tempoRange = 'medium'
    else tempoRange = 'fast'
    
    score += profile.preferences.tempoRanges[tempoRange] * 0.25
    factors++
    
    // Energy level appropriateness
    const currentEnergy = context.audience?.energy || 0.5
    const trackEnergy = track.energy || 0.5
    const energyDiff = Math.abs(trackEnergy - currentEnergy)
    
    // Prefer tracks that match energy progression style
    if (profile.preferences.energyProgression === 'gradual' && energyDiff < 0.2) {
      score += 0.15
    } else if (profile.preferences.energyProgression === 'dramatic' && energyDiff > 0.3) {
      score += 0.15
    } else if (profile.preferences.energyProgression === 'steady' && energyDiff < 0.1) {
      score += 0.15
    }
    factors++
    
    // Context adaptation
    const timeOfDay = context.time?.hour || 12
    if (timeOfDay < 22 && trackEnergy < 0.6) {
      score += profile.preferences.timeAdaptation * 0.1
    } else if (timeOfDay >= 22 && trackEnergy > 0.6) {
      score += profile.preferences.timeAdaptation * 0.1
    }
    
    // Venue adaptation
    if (context.venue?.type === 'club' && track.genre === 'techno') {
      score += profile.preferences.venueAdaptation * 0.1
    } else if (context.venue?.type === 'bar' && track.genre === 'house') {
      score += profile.preferences.venueAdaptation * 0.1
    }
    
    // Risk tolerance
    const trackRisk = this.calculateTrackRisk(track)
    const riskFactor = 1 - Math.abs(trackRisk - profile.preferences.riskTolerance)
    score += riskFactor * 0.1
    
    return Math.max(0, Math.min(1, score))
  }
  
  // Calculate how risky a track choice is
  private calculateTrackRisk(track: TrackAnalysis): number {
    let risk = 0.5 // Base risk
    
    // Unknown or rare genres are riskier
    const popularGenres = ['house', 'techno', 'trance', 'progressive']
    if (!track.genre || !popularGenres.includes(track.genre.toLowerCase())) {
      risk += 0.2
    }
    
    // Extreme energy levels are riskier
    const energy = track.energy || 0.5
    if (energy < 0.2 || energy > 0.9) {
      risk += 0.2
    }
    
    // Very slow or very fast tracks are riskier
    const tempo = track.tempo || 120
    if (tempo < 90 || tempo > 150) {
      risk += 0.15
    }
    
    // Low popularity might be risky
    const popularity = track.popularity || 50
    if (popularity < 30) {
      risk += 0.1
    }
    
    return Math.max(0, Math.min(1, risk))
  }
  
  // Generate reasoning for track recommendation
  private generateReasoning(profile: PersonalityProfile, track: TrackAnalysis, score: number): string {
    const reasons: string[] = []
    
    if (track.genre && profile.preferences.preferredGenres[track.genre] > 0.6) {
      reasons.push(`matches your ${track.genre} preference`)
    }
    
    if (track.camelotKey && profile.preferences.keyPreferences[track.camelotKey] > 0.6) {
      reasons.push(`fits your ${track.camelotKey} key preference`)
    }
    
    const tempo = track.tempo || 120
    if (tempo >= 100 && tempo < 130 && profile.preferences.tempoRanges.medium > 0.4) {
      reasons.push('matches your medium tempo preference')
    }
    
    if (score > 0.7) {
      reasons.push('strong match for your style')
    } else if (score > 0.5) {
      reasons.push('good fit for your preferences')
    } else {
      reasons.push('might expand your style')
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'based on your mixing history'
  }
  
  // Generate style suggestions
  private generateStyleSuggestions(profile: PersonalityProfile, currentTrack: TrackAnalysis | null, context: DJContext) {
    // Suggest transition style
    const transitionTypes = Object.keys(profile.preferences.preferredTransitions)
    const transitionStyle = transitionTypes.reduce((best, type) => 
      profile.preferences.preferredTransitions[type] > profile.preferences.preferredTransitions[best] ? type : best
    )
    
    // Suggest effects
    const effects = Object.entries(profile.preferences.effectUsage)
      .filter(([_, usage]) => usage > 0.3)
      .map(([effect, _]) => effect)
      .slice(0, 3)
    
    // Determine energy direction
    let energyDirection: 'up' | 'down' | 'maintain' = 'maintain'
    const currentEnergy = context.audience?.energy || 0.5
    
    if (profile.preferences.energyProgression === 'gradual') {
      energyDirection = currentEnergy < 0.7 ? 'up' : 'maintain'
    } else if (profile.preferences.energyProgression === 'dramatic') {
      energyDirection = Math.random() > 0.5 ? 'up' : 'down'
    }
    
    const confidence = Math.min(profile.statistics.successRate + 0.2, 0.95)
    
    return {
      transitionStyle,
      effects,
      energyDirection,
      confidence
    }
  }
  
  // Analyze learning progress
  async analyzeLearningProgress(userId: string): Promise<{
    improvement: number
    strengths: string[]
    growthAreas: string[]
    recommendations: string[]
    confidence: number
  }> {
    const profile = this.profiles.get(userId)
    if (!profile) {
      return {
        improvement: 0,
        strengths: [],
        growthAreas: [],
        recommendations: ['Start DJing to build your personal profile'],
        confidence: 0
      }
    }
    
    const history = this.actionHistory.get(userId) || []
    if (history.length < 10) {
      return {
        improvement: 0,
        strengths: ['Learning your preferences'],
        growthAreas: ['Need more data to analyze'],
        recommendations: ['Continue mixing to improve recommendations'],
        confidence: 0.1
      }
    }
    
    // Calculate improvement over time
    const recentActions = history.slice(-50)
    const olderActions = history.slice(-100, -50)
    
    const recentSuccess = recentActions.reduce((sum, a) => sum + (a.outcome.success ? 1 : 0), 0) / recentActions.length
    const olderSuccess = olderActions.length > 0 
      ? olderActions.reduce((sum, a) => sum + (a.outcome.success ? 1 : 0), 0) / olderActions.length
      : 0.5
    
    const improvement = recentSuccess - olderSuccess
    
    // Identify strengths
    const strengths: string[] = []
    if (profile.statistics.successRate > 0.7) strengths.push('Consistent mixing success')
    if (profile.statistics.avgCrowdResponse > 0.7) strengths.push('Great crowd engagement')
    if (profile.preferences.riskTolerance > 0.6) strengths.push('Confident with creative choices')
    
    // Identify growth areas
    const growthAreas: string[] = []
    if (profile.statistics.successRate < 0.5) growthAreas.push('Technical execution')
    if (profile.statistics.avgCrowdResponse < 0.5) growthAreas.push('Reading the crowd')
    if (Object.keys(profile.preferences.preferredGenres).length < 3) growthAreas.push('Genre diversity')
    
    // Generate recommendations
    const recommendations: string[] = []
    if (improvement < 0) recommendations.push('Consider experimenting with different techniques')
    if (profile.preferences.riskTolerance < 0.3) recommendations.push('Try some more adventurous track selections')
    if (Object.keys(profile.preferences.effectUsage).length < 2) recommendations.push('Explore different effects to enhance your mixes')
    
    return {
      improvement,
      strengths,
      growthAreas,
      recommendations,
      confidence: Math.min(profile.statistics.totalActions / 100, 1)
    }
  }
  
  // Start periodic pattern updates
  private startPeriodicUpdates(): void {
    setInterval(() => {
      this.updatePatterns()
    }, this.patternUpdateInterval)
  }
  
  // Update patterns for all users
  private async updatePatterns(): Promise<void> {
    for (const [userId, profile] of Array.from(this.profiles.entries())) {
      const history = this.actionHistory.get(userId) || []
      if (history.length < 20) continue // Need minimum data
      
      await this.extractPatterns(profile, history)
    }
  }
  
  // Extract behavioral patterns from user history
  private async extractPatterns(profile: PersonalityProfile, history: UserAction[]): Promise<void> {
    // Clear old patterns
    profile.patterns = []
    
    // Analyze track selection patterns
    await this.extractTrackPatterns(profile, history)
    
    // Analyze transition patterns
    await this.extractTransitionPatterns(profile, history)
    
    // Analyze timing patterns
    await this.extractTimingPatterns(profile, history)
    
    profile.lastUpdated = Date.now()
  }
  
  // Extract track selection patterns
  private async extractTrackPatterns(profile: PersonalityProfile, history: UserAction[]): Promise<void> {
    const trackActions = history.filter(a => a.type === 'track_select' && a.outcome.success)
    
    // Group by genre
    const genrePatterns = new Map<string, UserAction[]>()
    trackActions.forEach(action => {
      const genre = action.context.targetTrack?.genre
      if (genre) {
        if (!genrePatterns.has(genre)) genrePatterns.set(genre, [])
        genrePatterns.get(genre)!.push(action)
      }
    })
    
    // Create patterns for frequent genres
    genrePatterns.forEach((actions, genre) => {
      if (actions.length >= 5) {
        const avgSatisfaction = actions.reduce((sum, a) => sum + (a.outcome.personalSatisfaction || 0.5), 0) / actions.length
        
        profile.patterns.push({
          id: `genre_${genre}`,
          type: 'track_preference',
          description: `Prefers ${genre} tracks`,
          confidence: Math.min(actions.length / 20, 1),
          frequency: actions.length / trackActions.length,
          conditions: {},
          parameters: {
            satisfaction: { value: avgSatisfaction, weight: 1, variance: 0.1 }
          },
          examples: actions.slice(0, 3).map(a => a.context.targetTrack?.name || 'Unknown'),
          lastUpdated: Date.now()
        })
      }
    })
  }
  
  // Extract transition patterns
  private async extractTransitionPatterns(profile: PersonalityProfile, history: UserAction[]): Promise<void> {
    const transitionActions = history.filter(a => a.type === 'transition' && a.outcome.success)
    
    if (transitionActions.length >= 5) {
      const avgQuality = transitionActions.reduce((sum, a) => sum + (a.outcome.technicalQuality || 0.5), 0) / transitionActions.length
      
      profile.patterns.push({
        id: 'transition_style',
        type: 'transition_style',
        description: 'Consistent transition execution',
        confidence: Math.min(transitionActions.length / 30, 1),
        frequency: transitionActions.length / history.length,
        conditions: {},
        parameters: {
          quality: { value: avgQuality, weight: 1, variance: 0.15 }
        },
        examples: transitionActions.slice(0, 3).map(a => a.action.transitionType || 'Unknown'),
        lastUpdated: Date.now()
      })
    }
  }
  
  // Extract timing patterns
  private async extractTimingPatterns(profile: PersonalityProfile, history: UserAction[]): Promise<void> {
    // Group actions by hour of day
    const hourlyActions = new Map<number, UserAction[]>()
    
    history.forEach(action => {
      const hour = new Date(action.timestamp).getHours()
      if (!hourlyActions.has(hour)) hourlyActions.set(hour, [])
      hourlyActions.get(hour)!.push(action)
    })
    
    // Find peak activity hours
    const peakHours = Array.from(hourlyActions.entries())
      .filter(([_, actions]) => actions.length >= 5)
      .sort(([_, a], [__, b]) => b.length - a.length)
      .slice(0, 3)
    
    if (peakHours.length > 0) {
      profile.patterns.push({
        id: 'timing_preference',
        type: 'timing_preference',
        description: `Most active during ${peakHours.map(([h, _]) => `${h}:00`).join(', ')}`,
        confidence: 0.8,
        frequency: peakHours.reduce((sum, [_, actions]) => sum + actions.length, 0) / history.length,
        conditions: {
          timeRange: { start: peakHours[0][0], end: peakHours[peakHours.length - 1][0] }
        },
        parameters: {
          activity: { value: 1, weight: 1, variance: 0.2 }
        },
        examples: [`Active ${peakHours.length} peak hours`],
        lastUpdated: Date.now()
      })
    }
  }
  
  // Get user profile
  getProfile(userId: string): PersonalityProfile | null {
    return this.profiles.get(userId) || null
  }
  
  // Get learning statistics
  getLearningStats(): {
    totalUsers: number
    totalActions: number
    avgSuccessRate: number
    mostActiveUser: string | null
  } {
    const users = Array.from(this.profiles.values())
    const totalActions = users.reduce((sum, p) => sum + p.statistics.totalActions, 0)
    const avgSuccessRate = users.length > 0 
      ? users.reduce((sum, p) => sum + p.statistics.successRate, 0) / users.length
      : 0
    
    const mostActiveUser = users.length > 0 
      ? users.reduce((most, current) => 
          current.statistics.totalActions > most.statistics.totalActions ? current : most
        ).userId
      : null
    
    return {
      totalUsers: users.length,
      totalActions,
      avgSuccessRate,
      mostActiveUser
    }
  }
}

// Export singleton instance
export const personalStyleLearning = new ProductionPersonalStyleLearning()

// Export types
export type { UserAction, StylePattern, PersonalityProfile }