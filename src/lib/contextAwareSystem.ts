// Production Context Awareness System
// Provides intelligent recommendations based on time, venue, and audience context

import { EnhancedAnalysisResult } from './enhancedAudioAnalysis'
import { CrowdContext } from './crowdResponsePredictor'

export interface DJContext {
  // Time context
  time: {
    current: Date
    dayOfWeek: number // 0-6
    hour: number // 0-23
    isWeekend: boolean
    isHoliday: boolean
    season: 'spring' | 'summer' | 'fall' | 'winter'
    timezone: string
  }
  
  // Venue context
  venue: {
    type: 'club' | 'festival' | 'warehouse' | 'bar' | 'concert_hall' | 'outdoor' | 'private' | 'virtual'
    name?: string
    capacity?: number
    soundSystem?: 'basic' | 'professional' | 'high_end'
    location?: {
      city?: string
      country?: string
      coordinates?: { lat: number; lng: number }
    }
    acoustics?: 'dry' | 'reverberant' | 'outdoor'
    restrictions?: {
      volumeLimit?: number // dB
      curfew?: string // HH:MM
      genreRestrictions?: string[]
    }
  }
  
  // Audience context
  audience: {
    size: number
    energy: number // 0-1
    demographics: {
      ageRange: { min: number; max: number; peak: number }
      musicTaste: Map<string, number> // genre -> preference
      experienceLevel: 'casual' | 'enthusiast' | 'expert'
    }
    mood: {
      current: 'relaxed' | 'energetic' | 'euphoric' | 'contemplative'
      trajectory: 'building' | 'maintaining' | 'cooling'
    }
    responseHistory: {
      timestamp: number
      energy: number
      engagement: number
    }[]
  }
  
  // Event context
  event?: {
    type: 'regular_night' | 'special_event' | 'festival_set' | 'warm_up' | 'headline' | 'after_party'
    theme?: string
    lineup?: {
      position: number
      totalActs: number
      previousAct?: string
      nextAct?: string
    }
    duration: {
      scheduled: number // minutes
      elapsed: number
      remaining: number
    }
  }
  
  // Environmental context
  environment?: {
    weather?: {
      condition: 'clear' | 'cloudy' | 'rain' | 'snow'
      temperature: number // celsius
      humidity: number // percentage
    }
    lightingSystem?: 'basic' | 'dmx' | 'laser' | 'led_wall'
    videoSystem?: boolean
    specialEffects?: string[] // fog, co2, confetti, etc.
  }
}

export interface ContextualRecommendation {
  confidence: number
  reasoning: string[]
  
  // Track recommendations
  trackCriteria: {
    energy: { min: number; max: number; target: number }
    tempo: { min: number; max: number; preferred: number }
    genres: Map<string, number> // genre -> weight
    mood: string[]
    avoidGenres?: string[]
  }
  
  // Mix recommendations
  mixStrategy: {
    transitionStyle: 'smooth' | 'aggressive' | 'creative'
    mixDuration: number // bars
    effectsIntensity: 'minimal' | 'moderate' | 'heavy'
    harmonicStrictness: number // 0-1
  }
  
  // Performance recommendations
  performance: {
    energyProgression: 'build' | 'maintain' | 'peak' | 'cool_down'
    crowdInteraction: 'minimal' | 'moderate' | 'high'
    riskTolerance: 'conservative' | 'balanced' | 'experimental'
    specialMoments?: {
      time: number // minutes from now
      type: 'drop' | 'breakdown' | 'anthem' | 'surprise'
    }[]
  }
}

export interface TimePattern {
  hourRange: { start: number; end: number }
  dayType: 'weekday' | 'weekend' | 'any'
  seasonalAdjustment?: number
  recommendations: Partial<ContextualRecommendation>
}

export interface VenueProfile {
  venueType: string
  typicalAudience: Partial<DJContext['audience']['demographics']>
  preferredGenres: string[]
  energyProfile: {
    opening: number
    warmup: number
    peak: number
    closing: number
  }
  acousticConsiderations: {
    bassResponse: number // 0-1
    reverb: number // 0-1
    clarity: number // 0-1
  }
}

export class ProductionContextAwareSystem {
  private timePatterns: TimePattern[] = []
  private venueProfiles: Map<string, VenueProfile> = new Map()
  private contextHistory: DJContext[] = []
  private readonly maxHistorySize = 100
  
  constructor() {
    this.initializeTimePatterns()
    this.initializeVenueProfiles()
  }
  
  /**
   * Get contextual recommendations based on current situation
   */
  getRecommendations(context: DJContext): ContextualRecommendation {
    const reasoning: string[] = []
    
    // Analyze time context
    const timeRec = this.analyzeTimeContext(context.time, reasoning)
    
    // Analyze venue context
    const venueRec = this.analyzeVenueContext(context.venue, reasoning)
    
    // Analyze audience context
    const audienceRec = this.analyzeAudienceContext(context.audience, reasoning)
    
    // Analyze event context
    const eventRec = context.event ? this.analyzeEventContext(context.event, reasoning) : null
    
    // Merge recommendations with priorities
    const merged = this.mergeRecommendations(
      timeRec,
      venueRec,
      audienceRec,
      eventRec
    )
    
    // Add contextual adjustments
    this.applyContextualAdjustments(merged, context, reasoning)
    
    // Calculate confidence
    const confidence = this.calculateConfidence(context)
    
    // Update history
    this.updateHistory(context)
    
    return {
      confidence,
      reasoning,
      ...merged
    }
  }
  
  /**
   * Get energy recommendation for current context
   */
  getEnergyRecommendation(context: DJContext): {
    currentTarget: number
    nextTarget: number
    progression: 'build' | 'maintain' | 'peak' | 'cool_down'
    reasoning: string
  } {
    const hour = context.time.hour
    const venueProfile = this.venueProfiles.get(context.venue.type)
    const audienceEnergy = context.audience.energy
    const elapsed = context.event?.duration.elapsed || 0
    const total = context.event?.duration.scheduled || 120
    const progress = elapsed / total
    
    let currentTarget = 0.5
    let nextTarget = 0.5
    let progression: 'build' | 'maintain' | 'peak' | 'cool_down' = 'maintain'
    let reasoning = ''
    
    // Time-based energy curve
    if (hour < 22) {
      currentTarget = 0.3 + progress * 0.3
      progression = 'build'
      reasoning = 'Early hours - gradual energy build'
    } else if (hour >= 22 && hour < 2) {
      currentTarget = 0.6 + progress * 0.3
      progression = progress < 0.7 ? 'build' : 'peak'
      reasoning = 'Peak hours - high energy period'
    } else if (hour >= 2 && hour < 4) {
      currentTarget = 0.8 - (hour - 2) * 0.1
      progression = 'maintain'
      reasoning = 'Late peak - maintain energy'
    } else {
      currentTarget = Math.max(0.3, 0.7 - (hour - 4) * 0.15)
      progression = 'cool_down'
      reasoning = 'Closing hours - gradual cooldown'
    }
    
    // Venue adjustments
    if (venueProfile) {
      if (progress < 0.25) {
        currentTarget = venueProfile.energyProfile.opening
      } else if (progress < 0.5) {
        currentTarget = venueProfile.energyProfile.warmup
      } else if (progress < 0.85) {
        currentTarget = venueProfile.energyProfile.peak
      } else {
        currentTarget = venueProfile.energyProfile.closing
      }
    }
    
    // Audience feedback adjustment
    const energyDiff = audienceEnergy - currentTarget
    if (Math.abs(energyDiff) > 0.2) {
      currentTarget += energyDiff * 0.3 // Partial adjustment
      reasoning += `. Adjusting for audience energy (${Math.round(audienceEnergy * 100)}%)`
    }
    
    // Calculate next target
    switch (progression) {
      case 'build':
        nextTarget = Math.min(1, currentTarget + 0.1)
        break
      case 'peak':
        nextTarget = Math.max(0.8, currentTarget)
        break
      case 'cool_down':
        nextTarget = Math.max(0.2, currentTarget - 0.1)
        break
      default:
        nextTarget = currentTarget
    }
    
    return {
      currentTarget: Math.max(0, Math.min(1, currentTarget)),
      nextTarget: Math.max(0, Math.min(1, nextTarget)),
      progression,
      reasoning
    }
  }
  
  /**
   * Get genre recommendations based on context
   */
  getGenreRecommendations(context: DJContext): Map<string, number> {
    const weights = new Map<string, number>()
    
    // Base weights from venue
    const venueProfile = this.venueProfiles.get(context.venue.type)
    if (venueProfile) {
      venueProfile.preferredGenres.forEach(genre => {
        weights.set(genre, 0.5)
      })
    }
    
    // Time-based adjustments
    const hour = context.time.hour
    if (hour < 23) {
      // Early: more accessible genres
      this.adjustGenreWeight(weights, 'house', 0.3)
      this.adjustGenreWeight(weights, 'disco', 0.2)
      this.adjustGenreWeight(weights, 'funk', 0.2)
    } else if (hour >= 23 && hour < 3) {
      // Peak: energetic genres
      this.adjustGenreWeight(weights, 'techno', 0.4)
      this.adjustGenreWeight(weights, 'progressive', 0.3)
      this.adjustGenreWeight(weights, 'trance', 0.2)
    } else {
      // Late: deeper genres
      this.adjustGenreWeight(weights, 'minimal', 0.3)
      this.adjustGenreWeight(weights, 'deep house', 0.3)
      this.adjustGenreWeight(weights, 'ambient', 0.2)
    }
    
    // Audience preference adjustments
    if (context.audience.demographics.musicTaste.size > 0) {
      context.audience.demographics.musicTaste.forEach((pref, genre) => {
        this.adjustGenreWeight(weights, genre, pref * 0.5)
      })
    }
    
    // Event type adjustments
    if (context.event?.type === 'warm_up') {
      this.adjustGenreWeight(weights, 'minimal', 0.2)
      this.adjustGenreWeight(weights, 'deep house', 0.2)
    } else if (context.event?.type === 'headline') {
      // Boost all weights for variety
      weights.forEach((weight, genre) => {
        weights.set(genre, weight * 1.2)
      })
    }
    
    // Normalize weights
    const total = Array.from(weights.values()).reduce((sum, w) => sum + w, 0)
    if (total > 0) {
      weights.forEach((weight, genre) => {
        weights.set(genre, weight / total)
      })
    }
    
    return weights
  }
  
  /**
   * Get special moment recommendations
   */
  getSpecialMoments(context: DJContext): {
    type: 'drop' | 'breakdown' | 'anthem' | 'surprise'
    timeFromNow: number
    confidence: number
    reasoning: string
  }[] {
    const moments: any[] = []
    const elapsed = context.event?.duration.elapsed || 0
    const remaining = context.event?.duration.remaining || 60
    
    // Peak hour drop moments
    if (context.time.hour >= 23 && context.time.hour < 3) {
      if (context.audience.energy > 0.7 && remaining > 15) {
        moments.push({
          type: 'drop',
          timeFromNow: 8, // 8 minutes
          confidence: 0.8,
          reasoning: 'High crowd energy during peak hours'
        })
      }
    }
    
    // Breakdown for energy management
    if (context.audience.energy > 0.85 && elapsed > 30) {
      moments.push({
        type: 'breakdown',
        timeFromNow: 5,
        confidence: 0.7,
        reasoning: 'Energy reset needed after sustained peak'
      })
    }
    
    // Anthem moment for special events
    if (context.event?.type === 'special_event' && remaining > 30 && remaining < 45) {
      moments.push({
        type: 'anthem',
        timeFromNow: 10,
        confidence: 0.9,
        reasoning: 'Optimal timing for event anthem'
      })
    }
    
    // Surprise element based on audience experience
    if (context.audience.demographics.experienceLevel === 'expert' && 
        context.audience.mood.current === 'energetic' &&
        Math.random() > 0.7) {
      moments.push({
        type: 'surprise',
        timeFromNow: 12,
        confidence: 0.6,
        reasoning: 'Experienced crowd ready for unexpected elements'
      })
    }
    
    return moments
  }
  
  /**
   * Adjust recommendations for specific track
   */
  adjustForTrack(
    track: Partial<EnhancedAnalysisResult>,
    context: DJContext,
    baseScore: number
  ): number {
    let adjustedScore = baseScore
    
    // Time of day adjustments
    if (track.basicFeatures?.tempo) {
      const idealTempo = this.getIdealTempo(context)
      const tempoDiff = Math.abs(track.basicFeatures.tempo - idealTempo)
      adjustedScore *= (1 - tempoDiff / 100) // Penalize large tempo differences
    }
    
    // Venue acoustic adjustments
    const venueProfile = this.venueProfiles.get(context.venue.type)
    if (venueProfile && track.spectralFeatures) {
      // Adjust for bass response
      if (venueProfile.acousticConsiderations.bassResponse < 0.5) {
        // Venue has poor bass response, prefer tracks with less sub-bass
        const subBassEnergy = track.spectralFeatures.spectralBandEnergy?.subBass?.[0] || 0
        if (subBassEnergy > 0.7) {
          adjustedScore *= 0.8
        }
      }
    }
    
    // Audience mood adjustments
    if (track.moodFeatures) {
      const moodMatch = this.calculateMoodMatch(
        track.moodFeatures,
        context.audience.mood.current
      )
      adjustedScore *= (0.7 + moodMatch * 0.3)
    }
    
    // Event timing adjustments
    if (context.event) {
      const progress = context.event.duration.elapsed / context.event.duration.scheduled
      
      // Prefer longer tracks early in the set
      if (progress < 0.3 && track.basicFeatures?.duration) {
        if (track.basicFeatures.duration > 360) { // > 6 minutes
          adjustedScore *= 1.1
        }
      }
      
      // Prefer shorter, high-impact tracks near the end
      if (progress > 0.8 && track.basicFeatures?.duration) {
        if (track.basicFeatures.duration < 300) { // < 5 minutes
          adjustedScore *= 1.1
        }
      }
    }
    
    return Math.max(0, Math.min(1, adjustedScore))
  }
  
  // Private methods
  
  private analyzeTimeContext(
    time: DJContext['time'],
    reasoning: string[]
  ): Partial<ContextualRecommendation> {
    const patterns = this.timePatterns.filter(pattern => {
      const hourMatch = time.hour >= pattern.hourRange.start && 
                       time.hour < pattern.hourRange.end
      const dayMatch = pattern.dayType === 'any' ||
                      (pattern.dayType === 'weekend' && time.isWeekend) ||
                      (pattern.dayType === 'weekday' && !time.isWeekend)
      return hourMatch && dayMatch
    })
    
    if (patterns.length > 0) {
      reasoning.push(`Time context: ${this.getTimeDescription(time)}`)
      return patterns[0].recommendations
    }
    
    return {}
  }
  
  private analyzeVenueContext(
    venue: DJContext['venue'],
    reasoning: string[]
  ): Partial<ContextualRecommendation> {
    const profile = this.venueProfiles.get(venue.type)
    if (!profile) return {}
    
    reasoning.push(`Venue: ${venue.type} with ${venue.soundSystem || 'unknown'} sound system`)
    
    const rec: Partial<ContextualRecommendation> = {
      trackCriteria: {
        energy: { min: 0.3, max: 0.9, target: 0.6 },
        tempo: { min: 120, max: 130, preferred: 125 },
        genres: new Map(profile.preferredGenres.map(g => [g, 1])),
        mood: ['energetic', 'uplifting']
      },
      mixStrategy: {
        transitionStyle: venue.type === 'club' ? 'smooth' : 'creative',
        mixDuration: venue.type === 'festival' ? 16 : 32,
        effectsIntensity: venue.soundSystem === 'high_end' ? 'moderate' : 'minimal',
        harmonicStrictness: 0.7
      }
    }
    
    // Adjust for venue restrictions
    if (venue.restrictions?.volumeLimit) {
      reasoning.push(`Volume limit: ${venue.restrictions.volumeLimit}dB`)
      rec.mixStrategy!.effectsIntensity = 'minimal'
    }
    
    return rec
  }
  
  private analyzeAudienceContext(
    audience: DJContext['audience'],
    reasoning: string[]
  ): Partial<ContextualRecommendation> {
    reasoning.push(`Audience: ${audience.size} people, ${Math.round(audience.energy * 100)}% energy`)
    
    const rec: Partial<ContextualRecommendation> = {
      performance: {
        energyProgression: audience.mood.trajectory === 'building' ? 'build' : 'maintain',
        crowdInteraction: audience.size > 500 ? 'high' : 'moderate',
        riskTolerance: audience.demographics.experienceLevel === 'expert' ? 'experimental' : 'balanced'
      }
    }
    
    // Adjust for audience energy
    if (audience.energy < 0.3) {
      rec.performance!.energyProgression = 'build'
      reasoning.push('Low crowd energy - focus on building momentum')
    } else if (audience.energy > 0.8) {
      rec.performance!.energyProgression = 'peak'
      reasoning.push('High crowd energy - maintain peak experience')
    }
    
    return rec
  }
  
  private analyzeEventContext(
    event: NonNullable<DJContext['event']>,
    reasoning: string[]
  ): Partial<ContextualRecommendation> {
    reasoning.push(`Event: ${event.type}, ${event.duration.elapsed}/${event.duration.scheduled} minutes`)
    
    const progress = event.duration.elapsed / event.duration.scheduled
    
    const rec: Partial<ContextualRecommendation> = {}
    
    if (event.type === 'warm_up') {
      rec.trackCriteria = {
        energy: { min: 0.2, max: 0.5, target: 0.3 + progress * 0.2 },
        tempo: { min: 118, max: 124, preferred: 122 },
        genres: new Map([['deep house', 1], ['minimal', 0.8]]),
        mood: ['relaxed', 'groovy']
      }
    } else if (event.type === 'headline') {
      rec.performance = {
        energyProgression: progress < 0.7 ? 'build' : 'peak',
        crowdInteraction: 'high',
        riskTolerance: 'experimental'
      }
    }
    
    return rec
  }
  
  private mergeRecommendations(
    ...recs: (Partial<ContextualRecommendation> | null)[]
  ): Omit<ContextualRecommendation, 'confidence' | 'reasoning'> {
    // Simple merge strategy - later recommendations override earlier ones
    // In production, use weighted merging based on importance
    const merged: any = {
      trackCriteria: {
        energy: { min: 0.2, max: 0.9, target: 0.5 },
        tempo: { min: 120, max: 130, preferred: 125 },
        genres: new Map(),
        mood: []
      },
      mixStrategy: {
        transitionStyle: 'smooth',
        mixDuration: 32,
        effectsIntensity: 'moderate',
        harmonicStrictness: 0.7
      },
      performance: {
        energyProgression: 'maintain',
        crowdInteraction: 'moderate',
        riskTolerance: 'balanced'
      }
    }
    
    recs.filter(r => r !== null).forEach(rec => {
      Object.assign(merged, rec)
    })
    
    return merged
  }
  
  private applyContextualAdjustments(
    rec: any,
    context: DJContext,
    reasoning: string[]
  ) {
    // Weather adjustments for outdoor venues
    if (context.venue.type === 'outdoor' && context.environment?.weather) {
      if (context.environment.weather.condition === 'rain') {
        rec.trackCriteria.mood.push('uplifting')
        reasoning.push('Rainy weather - adding uplifting tracks')
      }
      
      if (context.environment.weather.temperature < 15) {
        rec.trackCriteria.energy.target += 0.1
        reasoning.push('Cold weather - increasing energy target')
      }
    }
    
    // Holiday adjustments
    if (context.time.isHoliday) {
      rec.performance.crowdInteraction = 'high'
      rec.mixStrategy.effectsIntensity = 'heavy'
      reasoning.push('Holiday event - increased interaction and effects')
    }
  }
  
  private calculateConfidence(context: DJContext): number {
    let confidence = 0.5
    
    // More data = higher confidence
    if (context.audience.responseHistory.length > 10) confidence += 0.1
    if (context.venue.soundSystem) confidence += 0.1
    if (context.event) confidence += 0.1
    if (context.audience.demographics.musicTaste.size > 0) confidence += 0.1
    if (this.contextHistory.length > 20) confidence += 0.1
    
    return Math.min(1, confidence)
  }
  
  private updateHistory(context: DJContext) {
    this.contextHistory.push(context)
    if (this.contextHistory.length > this.maxHistorySize) {
      this.contextHistory.shift()
    }
  }
  
  private getTimeDescription(time: DJContext['time']): string {
    const hour = time.hour
    if (hour < 6) return 'Late night/Early morning'
    if (hour < 12) return 'Morning'
    if (hour < 18) return 'Afternoon'
    if (hour < 22) return 'Evening'
    return 'Night'
  }
  
  private getIdealTempo(context: DJContext): number {
    const hour = context.time.hour
    const venueProfile = this.venueProfiles.get(context.venue.type)
    
    let baseTempo = 125
    
    // Time-based tempo
    if (hour < 22) baseTempo = 122
    else if (hour >= 22 && hour < 1) baseTempo = 126
    else if (hour >= 1 && hour < 3) baseTempo = 128
    else baseTempo = 124
    
    // Venue adjustments
    if (venueProfile) {
      if (context.venue.type === 'bar') baseTempo -= 2
      if (context.venue.type === 'festival') baseTempo += 2
    }
    
    // Audience energy adjustment
    baseTempo += (context.audience.energy - 0.5) * 4
    
    return Math.round(baseTempo)
  }
  
  private calculateMoodMatch(
    trackMood: any,
    audienceMood: string
  ): number {
    // Simplified mood matching
    const moodMap: Record<string, number> = {
      'relaxed': trackMood.valence * 0.5 + (1 - trackMood.arousal) * 0.5,
      'energetic': trackMood.arousal * 0.7 + trackMood.valence * 0.3,
      'euphoric': trackMood.valence * 0.6 + trackMood.arousal * 0.4,
      'contemplative': (1 - trackMood.arousal) * 0.6 + trackMood.dominance * 0.4
    }
    
    return moodMap[audienceMood] || 0.5
  }
  
  private adjustGenreWeight(
    weights: Map<string, number>,
    genre: string,
    adjustment: number
  ) {
    const current = weights.get(genre) || 0
    weights.set(genre, current + adjustment)
  }
  
  private initializeTimePatterns() {
    this.timePatterns = [
      // Opening hours
      {
        hourRange: { start: 21, end: 23 },
        dayType: 'any',
        recommendations: {
          trackCriteria: {
            energy: { min: 0.2, max: 0.5, target: 0.35 },
            tempo: { min: 120, max: 124, preferred: 122 },
            genres: new Map([['deep house', 1], ['tech house', 0.8]]),
            mood: ['groovy', 'uplifting']
          }
        }
      },
      // Peak hours
      {
        hourRange: { start: 23, end: 3 },
        dayType: 'weekend',
        recommendations: {
          trackCriteria: {
            energy: { min: 0.6, max: 0.95, target: 0.8 },
            tempo: { min: 125, max: 132, preferred: 128 },
            genres: new Map([['techno', 1], ['progressive', 0.9]]),
            mood: ['energetic', 'driving']
          }
        }
      },
      // Closing hours
      {
        hourRange: { start: 4, end: 6 },
        dayType: 'any',
        recommendations: {
          trackCriteria: {
            energy: { min: 0.2, max: 0.6, target: 0.4 },
            tempo: { min: 118, max: 125, preferred: 122 },
            genres: new Map([['minimal', 1], ['ambient', 0.7]]),
            mood: ['hypnotic', 'deep']
          }
        }
      }
    ]
  }
  
  private initializeVenueProfiles() {
    // Club profile
    this.venueProfiles.set('club', {
      venueType: 'club',
      typicalAudience: {
        ageRange: { min: 21, max: 35, peak: 27 },
        experienceLevel: 'enthusiast'
      },
      preferredGenres: ['techno', 'house', 'tech house'],
      energyProfile: {
        opening: 0.3,
        warmup: 0.5,
        peak: 0.85,
        closing: 0.4
      },
      acousticConsiderations: {
        bassResponse: 0.9,
        reverb: 0.3,
        clarity: 0.8
      }
    })
    
    // Festival profile
    this.venueProfiles.set('festival', {
      venueType: 'festival',
      typicalAudience: {
        ageRange: { min: 18, max: 30, peak: 24 },
        experienceLevel: 'casual'
      },
      preferredGenres: ['progressive', 'trance', 'big room'],
      energyProfile: {
        opening: 0.5,
        warmup: 0.6,
        peak: 0.95,
        closing: 0.7
      },
      acousticConsiderations: {
        bassResponse: 0.7,
        reverb: 0.1,
        clarity: 0.6
      }
    })
    
    // Bar profile
    this.venueProfiles.set('bar', {
      venueType: 'bar',
      typicalAudience: {
        ageRange: { min: 25, max: 40, peak: 32 },
        experienceLevel: 'casual'
      },
      preferredGenres: ['disco', 'funk', 'commercial house'],
      energyProfile: {
        opening: 0.2,
        warmup: 0.3,
        peak: 0.6,
        closing: 0.3
      },
      acousticConsiderations: {
        bassResponse: 0.5,
        reverb: 0.5,
        clarity: 0.7
      }
    })
  }
}

// Export singleton instance
export const contextAwareSystem = new ProductionContextAwareSystem()