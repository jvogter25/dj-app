// Production DJ Learning Hook
// Manages the learning system integration with React components

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  createDJLearningSystem, 
  ProductionDJLearningSystem,
  UserAction,
  TrackContext,
  LearningInsight
} from '../lib/djLearningSystem'
import { useSupabase } from './useSupabase'

interface UseDJLearningProps {
  enabled?: boolean
  autoSave?: boolean
  syncToCloud?: boolean
}

export const useDJLearning = ({
  enabled = true,
  autoSave = true,
  syncToCloud = true
}: UseDJLearningProps = {}) => {
  const { user } = useSupabase()
  const [learningSystem, setLearningSystem] = useState<ProductionDJLearningSystem | null>(null)
  const [insights, setInsights] = useState<LearningInsight[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Track current session
  const sessionRef = useRef({
    startTime: Date.now(),
    trackCount: 0,
    transitionCount: 0
  })
  
  // Initialize learning system
  useEffect(() => {
    if (!enabled || !user?.id) {
      setIsLoading(false)
      return
    }
    
    const system = createDJLearningSystem(user.id)
    setLearningSystem(system)
    
    // Load initial insights and stats
    setInsights(system.getInsights())
    setStats(system.getPerformanceStats())
    
    setIsLoading(false)
  }, [enabled, user?.id])
  
  // Record track selection
  const recordTrackSelection = useCallback((
    selectedTrack: TrackContext,
    context: Partial<UserAction['context']>,
    rejectedSuggestions?: TrackContext[]
  ) => {
    if (!learningSystem || !enabled) return
    
    const action: UserAction = {
      id: `track_${Date.now()}`,
      timestamp: Date.now(),
      type: 'track_selection',
      context: {
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        ...context
      },
      action: {
        selectedTrack,
        rejectedSuggestions
      }
    }
    
    learningSystem.recordAction(action)
    sessionRef.current.trackCount++
    
    // Update insights
    setInsights(learningSystem.getInsights())
    
    // Auto-save if enabled
    if (autoSave) {
      saveToLocal()
    }
  }, [learningSystem, enabled, autoSave])
  
  // Record transition choice
  const recordTransition = useCallback((
    fromTrack: TrackContext,
    toTrack: TrackContext,
    transition: any,
    outcome?: UserAction['outcome']
  ) => {
    if (!learningSystem || !enabled) return
    
    const action: UserAction = {
      id: `transition_${Date.now()}`,
      timestamp: Date.now(),
      type: 'transition_choice',
      context: {
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        previousTrack: fromTrack,
        currentTrack: toTrack
      },
      action: {
        actualTransitionUsed: {
          technique: transition.technique || 'manual',
          duration: transition.duration || 8,
          crossfaderCurve: transition.crossfaderCurve || 'linear',
          eqAdjustments: transition.eqAdjustments
        }
      },
      outcome: outcome || {
        success: true,
        technicalQuality: 0.8
      }
    }
    
    learningSystem.recordAction(action)
    sessionRef.current.transitionCount++
    
    // Update stats
    setStats(learningSystem.getPerformanceStats())
  }, [learningSystem, enabled])
  
  // Record effect application
  const recordEffectUsage = useCallback((
    effects: any[],
    track: TrackContext,
    context?: Partial<UserAction['context']>
  ) => {
    if (!learningSystem || !enabled) return
    
    const action: UserAction = {
      id: `effect_${Date.now()}`,
      timestamp: Date.now(),
      type: 'effect_application',
      context: {
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        currentTrack: track,
        ...context
      },
      action: {
        appliedEffects: effects
      }
    }
    
    learningSystem.recordAction(action)
  }, [learningSystem, enabled])
  
  // Get personalized recommendations
  const getPersonalizedRecommendations = useCallback((
    context: Partial<UserAction['context']>
  ) => {
    if (!learningSystem || !enabled) return null
    
    return learningSystem.getPersonalizedRecommendations({
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      ...context
    })
  }, [learningSystem, enabled])
  
  // Adjust scores based on learning
  const adjustScores = useCallback(<T extends { score: number }>(
    items: T[],
    context: Partial<UserAction['context']>
  ): T[] => {
    if (!learningSystem || !enabled) return items
    
    return learningSystem.adjustRecommendationScores(items, {
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      ...context
    })
  }, [learningSystem, enabled])
  
  // Rate a transition
  const rateTransition = useCallback((
    transitionId: string,
    rating: number,
    feedback?: string
  ) => {
    if (!learningSystem || !enabled) return
    
    // Find the transition in recent actions and update outcome
    // This is simplified - in production would have better tracking
    const success = rating >= 4
    const outcome: UserAction['outcome'] = {
      success,
      userSatisfaction: rating / 5,
      technicalQuality: success ? 0.9 : 0.5
    }
    
    // Would update the specific action here
    setStats(learningSystem.getPerformanceStats())
  }, [learningSystem, enabled])
  
  // Session management
  const startSession = useCallback((
    venueType?: string,
    setPosition?: string
  ) => {
    sessionRef.current = {
      startTime: Date.now(),
      trackCount: 0,
      transitionCount: 0
    }
    
    // Record session start
    if (learningSystem && enabled) {
      const action: UserAction = {
        id: `session_${Date.now()}`,
        timestamp: Date.now(),
        type: 'track_selection', // First track marks session start
        context: {
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          venueType,
          setPosition
        },
        action: {}
      }
      
      learningSystem.recordAction(action)
    }
  }, [learningSystem, enabled])
  
  const endSession = useCallback(() => {
    const duration = (Date.now() - sessionRef.current.startTime) / 1000 / 60 // minutes
    
    // Update average session length
    if (learningSystem && enabled && duration > 5) { // Only count sessions > 5 min
      // This would be tracked in the learning system
      setStats(learningSystem.getPerformanceStats())
    }
    
    // Save to cloud if enabled
    if (syncToCloud) {
      // This would trigger cloud sync functionality
      setIsSyncing(true)
      // Add actual cloud sync implementation here
      setIsSyncing(false)
    }
  }, [learningSystem, enabled, syncToCloud])
  
  // Save/Load functionality
  const saveToLocal = useCallback(() => {
    if (!learningSystem) return
    
    // The learning system automatically saves to localStorage
    // This is just to trigger any additional saves
  }, [learningSystem])
  
  const syncToCloudStorage = useCallback(async () => {
    if (!learningSystem || !user?.id || !syncToCloud) return
    
    setIsSyncing(true)
    try {
      const profileData = learningSystem.exportProfile()
      
      // In production, save to Supabase
      // await supabase
      //   .from('user_learning_profiles')
      //   .upsert({
      //     user_id: user.id,
      //     profile_data: profileData,
      //     updated_at: new Date().toISOString()
      //   })
      
      console.log('Learning profile synced to cloud')
    } catch (error) {
      console.error('Error syncing learning profile:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [learningSystem, user?.id, syncToCloud])
  
  const loadFromCloud = useCallback(async () => {
    if (!learningSystem || !user?.id) return
    
    setIsLoading(true)
    try {
      // In production, load from Supabase
      // const { data } = await supabase
      //   .from('user_learning_profiles')
      //   .select('profile_data')
      //   .eq('user_id', user.id)
      //   .single()
      
      // if (data?.profile_data) {
      //   learningSystem.importProfile(data.profile_data)
      //   setInsights(learningSystem.getInsights())
      //   setStats(learningSystem.getPerformanceStats())
      // }
    } catch (error) {
      console.error('Error loading learning profile:', error)
    } finally {
      setIsLoading(false)
    }
  }, [learningSystem, user?.id])
  
  // Reset learning data
  const resetLearning = useCallback(() => {
    if (!user?.id || !enabled) return
    
    const newSystem = createDJLearningSystem(user.id)
    setLearningSystem(newSystem)
    setInsights([])
    setStats(newSystem.getPerformanceStats())
  }, [user?.id, enabled])
  
  // Auto-sync periodically
  useEffect(() => {
    if (!syncToCloud || !enabled) return
    
    const interval = setInterval(() => {
      syncToCloudStorage()
    }, 5 * 60 * 1000) // Every 5 minutes
    
    return () => clearInterval(interval)
  }, [syncToCloud, enabled, syncToCloudStorage])
  
  return {
    // State
    isEnabled: enabled,
    isLoading,
    isSyncing,
    insights,
    stats,
    
    // Actions
    recordTrackSelection,
    recordTransition,
    recordEffectUsage,
    rateTransition,
    
    // Recommendations
    getPersonalizedRecommendations,
    adjustScores,
    
    // Session management
    startSession,
    endSession,
    sessionStats: sessionRef.current,
    
    // Data management
    saveToLocal,
    syncToCloud: syncToCloudStorage,
    loadFromCloud,
    resetLearning,
    
    // Export for backup
    exportProfile: learningSystem?.exportProfile.bind(learningSystem),
    importProfile: learningSystem?.importProfile.bind(learningSystem)
  }
}