// Production Context Awareness Hook
// Manages context-aware recommendations and integrations

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  contextAwareSystem,
  DJContext,
  ContextualRecommendation
} from '../lib/contextAwareSystem'
import { EnhancedAnalysisResult } from '../lib/enhancedAudioAnalysis'

interface UseContextAwarenessProps {
  enabled?: boolean
  autoUpdate?: boolean
  updateInterval?: number // milliseconds
  initialContext?: Partial<DJContext>
}

export const useContextAwareness = ({
  enabled = true,
  autoUpdate = true,
  updateInterval = 60000, // 1 minute
  initialContext
}: UseContextAwarenessProps = {}) => {
  // Context state
  const [context, setContext] = useState<DJContext>(() => 
    createDefaultContext(initialContext)
  )
  
  // Recommendations state
  const [recommendations, setRecommendations] = useState<ContextualRecommendation | null>(null)
  const [energyRecommendation, setEnergyRecommendation] = useState<any>(null)
  const [genreRecommendations, setGenreRecommendations] = useState<Map<string, number>>(new Map())
  const [specialMoments, setSpecialMoments] = useState<any[]>([])
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false)
  
  // Auto-update interval
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  // Update context
  const updateContext = useCallback((updates: Partial<DJContext>) => {
    setContext(prev => mergeContext(prev, updates))
  }, [])
  
  // Update time context
  const updateTimeContext = useCallback(() => {
    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay()
    
    updateContext({
      time: {
        current: now,
        hour,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isHoliday: checkIfHoliday(now),
        season: getSeason(now),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    })
  }, [updateContext])
  
  // Update venue context
  const setVenue = useCallback((
    venueType: DJContext['venue']['type'],
    additionalInfo?: Partial<DJContext['venue']>
  ) => {
    updateContext({
      venue: {
        type: venueType,
        ...additionalInfo
      }
    })
  }, [updateContext])
  
  // Update audience context
  const updateAudience = useCallback((updates: Partial<DJContext['audience']>) => {
    setContext(prev => ({
      ...prev,
      audience: {
        ...prev.audience,
        ...updates,
        responseHistory: updates.responseHistory || prev.audience.responseHistory
      }
    }))
  }, [])
  
  // Track audience response
  const trackAudienceResponse = useCallback((energy: number, engagement: number) => {
    setContext(prev => {
      const history = [...prev.audience.responseHistory, {
        timestamp: Date.now(),
        energy,
        engagement
      }].slice(-50) // Keep last 50 responses
      
      // Calculate average energy
      const avgEnergy = history.reduce((sum, h) => sum + h.energy, 0) / history.length
      
      return {
        ...prev,
        audience: {
          ...prev.audience,
          energy: avgEnergy,
          responseHistory: history,
          mood: {
            ...prev.audience.mood,
            trajectory: calculateTrajectory(history)
          }
        }
      }
    })
  }, [])
  
  // Set event context
  const setEvent = useCallback((
    eventType: NonNullable<DJContext['event']>['type'],
    duration: number,
    additionalInfo?: Partial<DJContext['event']>
  ) => {
    const startTime = Date.now()
    
    updateContext({
      event: {
        type: eventType,
        duration: {
          scheduled: duration,
          elapsed: 0,
          remaining: duration
        },
        ...additionalInfo
      }
    })
    
    // Start tracking elapsed time
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(() => {
      setContext(prev => {
        if (!prev.event) return prev
        
        const elapsed = Math.floor((Date.now() - startTime) / 60000) // minutes
        const remaining = Math.max(0, duration - elapsed)
        
        return {
          ...prev,
          event: {
            ...prev.event,
            duration: {
              ...prev.event.duration,
              elapsed,
              remaining
            }
          }
        }
      })
    }, 60000) // Update every minute
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [updateContext])
  
  // Get recommendations
  const getRecommendations = useCallback(() => {
    if (!enabled) return null
    
    setIsLoading(true)
    
    try {
      // Get main recommendations
      const recs = contextAwareSystem.getRecommendations(context)
      setRecommendations(recs)
      
      // Get energy recommendation
      const energyRec = contextAwareSystem.getEnergyRecommendation(context)
      setEnergyRecommendation(energyRec)
      
      // Get genre recommendations
      const genreRecs = contextAwareSystem.getGenreRecommendations(context)
      setGenreRecommendations(genreRecs)
      
      // Get special moments
      const moments = contextAwareSystem.getSpecialMoments(context)
      setSpecialMoments(moments)
      
      return recs
    } finally {
      setIsLoading(false)
    }
  }, [enabled, context])
  
  // Adjust track score based on context
  const adjustTrackScore = useCallback((
    track: Partial<EnhancedAnalysisResult>,
    baseScore: number
  ): number => {
    if (!enabled) return baseScore
    
    return contextAwareSystem.adjustForTrack(track, context, baseScore)
  }, [enabled, context])
  
  // Check if track matches context
  const checkTrackMatch = useCallback((
    track: Partial<EnhancedAnalysisResult>
  ): {
    matches: boolean
    score: number
    reasons: string[]
  } => {
    if (!enabled || !recommendations) {
      return { matches: true, score: 1, reasons: [] }
    }
    
    const reasons: string[] = []
    let score = 1
    
    // Check energy match
    if (track.moodFeatures?.energyCurve?.avgEnergy !== undefined) {
      const energy = track.moodFeatures.energyCurve.avgEnergy
      const { min, max, target } = recommendations.trackCriteria.energy
      
      if (energy < min || energy > max) {
        score *= 0.5
        reasons.push(`Energy outside range (${Math.round(energy * 100)}%)`)
      } else {
        const energyScore = 1 - Math.abs(energy - target) / (max - min)
        score *= energyScore
      }
    }
    
    // Check tempo match
    if (track.basicFeatures?.tempo) {
      const tempo = track.basicFeatures.tempo
      const { min, max, preferred } = recommendations.trackCriteria.tempo
      
      if (tempo < min || tempo > max) {
        score *= 0.5
        reasons.push(`Tempo outside range (${Math.round(tempo)} BPM)`)
      } else {
        const tempoScore = 1 - Math.abs(tempo - preferred) / (max - min)
        score *= tempoScore
      }
    }
    
    // Check genre match
    const genreClassification = (track as any).genreClassification
    if (genreClassification?.primary?.genre && genreRecommendations.size > 0) {
      const genre = genreClassification.primary.genre
      const genreWeight = genreRecommendations.get(genre) || 0
      
      if (genreWeight < 0.1) {
        score *= 0.7
        reasons.push(`Genre not recommended for context (${genre})`)
      } else {
        score *= (0.5 + genreWeight * 0.5)
      }
    }
    
    return {
      matches: score > 0.5,
      score,
      reasons
    }
  }, [enabled, recommendations, genreRecommendations])
  
  // Get contextual hints
  const getContextualHints = useCallback((): string[] => {
    const hints: string[] = []
    
    if (!recommendations) return hints
    
    // Energy hints
    if (energyRecommendation) {
      hints.push(energyRecommendation.reasoning)
      
      if (energyRecommendation.progression === 'build') {
        hints.push('Focus on building energy gradually')
      } else if (energyRecommendation.progression === 'peak') {
        hints.push('Maintain peak energy with high-impact tracks')
      } else if (energyRecommendation.progression === 'cool_down') {
        hints.push('Start reducing energy for cooldown')
      }
    }
    
    // Venue hints
    if (context.venue.restrictions?.curfew) {
      const curfew = context.venue.restrictions.curfew
      hints.push(`Venue curfew at ${curfew} - plan accordingly`)
    }
    
    // Special moment hints
    if (specialMoments.length > 0) {
      const nextMoment = specialMoments[0]
      hints.push(`Prepare for ${nextMoment.type} in ${nextMoment.timeFromNow} minutes`)
    }
    
    // Audience hints
    if (context.audience.energy < 0.3) {
      hints.push('Low crowd energy - use tracks that build momentum')
    } else if (context.audience.energy > 0.8) {
      hints.push('High crowd energy - maintain the vibe with peak-time tracks')
    }
    
    return hints
  }, [recommendations, energyRecommendation, context, specialMoments])
  
  // Auto-update recommendations
  useEffect(() => {
    if (!enabled || !autoUpdate) return
    
    // Initial update
    updateTimeContext()
    getRecommendations()
    
    // Set up interval
    const interval = setInterval(() => {
      updateTimeContext()
      getRecommendations()
    }, updateInterval)
    
    return () => clearInterval(interval)
  }, [enabled, autoUpdate, updateInterval, updateTimeContext, getRecommendations])
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
  
  return {
    // Context
    context,
    updateContext,
    setVenue,
    updateAudience,
    trackAudienceResponse,
    setEvent,
    
    // Recommendations
    recommendations,
    energyRecommendation,
    genreRecommendations,
    specialMoments,
    
    // Actions
    getRecommendations,
    adjustTrackScore,
    checkTrackMatch,
    getContextualHints,
    
    // State
    isLoading,
    isEnabled: enabled
  }
}

// Helper functions

function createDefaultContext(initial?: Partial<DJContext>): DJContext {
  const now = new Date()
  
  return {
    time: {
      current: now,
      dayOfWeek: now.getDay(),
      hour: now.getHours(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      isHoliday: false,
      season: getSeason(now),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    venue: {
      type: 'club',
      soundSystem: 'professional'
    },
    audience: {
      size: 200,
      energy: 0.5,
      demographics: {
        ageRange: { min: 21, max: 35, peak: 27 },
        musicTaste: new Map(),
        experienceLevel: 'enthusiast'
      },
      mood: {
        current: 'energetic',
        trajectory: 'building'
      },
      responseHistory: []
    },
    ...initial
  }
}

function mergeContext(
  current: DJContext,
  updates: Partial<DJContext>
): DJContext {
  return {
    ...current,
    ...updates,
    time: { ...current.time, ...updates.time },
    venue: { ...current.venue, ...updates.venue },
    audience: { ...current.audience, ...updates.audience },
    event: updates.event || current.event,
    environment: updates.environment || current.environment
  }
}

function getSeason(date: Date): 'spring' | 'summer' | 'fall' | 'winter' {
  const month = date.getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'fall'
  return 'winter'
}

function checkIfHoliday(date: Date): boolean {
  // Simplified - would check actual holiday calendar
  const month = date.getMonth()
  const day = date.getDate()
  
  // New Year's Eve/Day
  if (month === 11 && day === 31) return true
  if (month === 0 && day === 1) return true
  
  // Add more holidays as needed
  return false
}

function calculateTrajectory(
  history: DJContext['audience']['responseHistory']
): 'building' | 'maintaining' | 'cooling' {
  if (history.length < 3) return 'maintaining'
  
  const recent = history.slice(-5)
  const firstEnergy = recent[0].energy
  const lastEnergy = recent[recent.length - 1].energy
  const diff = lastEnergy - firstEnergy
  
  if (diff > 0.1) return 'building'
  if (diff < -0.1) return 'cooling'
  return 'maintaining'
}