// Production Adaptive Suggestions Hook
// Manages intelligent AI-powered suggestions across all systems

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  adaptiveSuggestionEngine,
  AdaptiveSuggestion,
  AdaptiveEngineConfig
} from '../lib/adaptiveSuggestionEngine'
import { TrackAnalysis } from '../lib/trackDatabase'
import { DJContext } from '../lib/contextAwareSystem'
import { RealtimeAnalysisResult } from '../lib/realtimeAudioAnalyzer'
import { useSupabase } from './useSupabase'

interface UseAdaptiveSuggestionsProps {
  enabled?: boolean
  autoUpdate?: boolean
  updateInterval?: number
  config?: Partial<AdaptiveEngineConfig>
}

export const useAdaptiveSuggestions = ({
  enabled = true,
  autoUpdate = true,
  updateInterval = 5000,
  config
}: UseAdaptiveSuggestionsProps = {}) => {
  const { user } = useSupabase()
  const [suggestions, setSuggestions] = useState<AdaptiveSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Track acceptance/rejection for learning
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set())
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set())
  
  // Update interval
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  // Initialize learning system
  useEffect(() => {
    if (enabled && user?.id) {
      adaptiveSuggestionEngine.initializeLearning(user.id)
    }
  }, [enabled, user?.id])
  
  // Configure engine
  useEffect(() => {
    if (config) {
      // Would update engine config here
      // adaptiveSuggestionEngine.updateConfig(config)
    }
  }, [config])
  
  // Generate suggestions
  const generateSuggestions = useCallback(async (
    currentTrack: TrackAnalysis | null,
    nextTrack: TrackAnalysis | null,
    availableTracks: TrackAnalysis[],
    context: DJContext,
    realtimeData?: RealtimeAnalysisResult
  ) => {
    if (!enabled) return []
    
    setIsLoading(true)
    setError(null)
    
    try {
      const newSuggestions = await adaptiveSuggestionEngine.generateSuggestions(
        currentTrack,
        nextTrack,
        availableTracks,
        context,
        realtimeData
      )
      
      setSuggestions(newSuggestions)
      return newSuggestions
    } catch (err) {
      console.error('Error generating suggestions:', err)
      setError('Failed to generate suggestions')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [enabled])
  
  // Accept a suggestion
  const acceptSuggestion = useCallback((suggestionId: string) => {
    setAcceptedSuggestions(prev => new Set(prev).add(suggestionId))
    
    // Find the suggestion
    const suggestion = suggestions.find(s => s.id === suggestionId)
    if (!suggestion) return
    
    // Record acceptance for learning
    // This would be integrated with the learning system
    console.log('Accepted suggestion:', suggestion)
    
    // Handle different suggestion types
    switch (suggestion.type) {
      case 'track':
        // Track selection was accepted
        break
      case 'transition':
        // Transition technique was accepted
        break
      case 'effect':
        // Effect was applied
        break
      case 'energy':
        // Energy adjustment was made
        break
      case 'special':
        // Special moment was executed
        break
    }
  }, [suggestions])
  
  // Reject a suggestion
  const rejectSuggestion = useCallback((suggestionId: string, reason?: string) => {
    setRejectedSuggestions(prev => new Set(prev).add(suggestionId))
    
    // Find the suggestion
    const suggestion = suggestions.find(s => s.id === suggestionId)
    if (!suggestion) return
    
    // Record rejection for learning
    console.log('Rejected suggestion:', suggestion, reason)
  }, [suggestions])
  
  // Get suggestion by type
  const getSuggestionsByType = useCallback((type: AdaptiveSuggestion['type']) => {
    return suggestions.filter(s => s.type === type)
  }, [suggestions])
  
  // Get immediate suggestions
  const getImmediateSuggestions = useCallback(() => {
    return suggestions.filter(s => s.timing === 'immediate')
  }, [suggestions])
  
  // Get upcoming suggestions
  const getUpcomingSuggestions = useCallback(() => {
    return suggestions.filter(s => s.timing === 'upcoming' || s.timing === 'next')
  }, [suggestions])
  
  // Check if suggestion is still valid
  const isSuggestionValid = useCallback((suggestion: AdaptiveSuggestion): boolean => {
    return Date.now() < suggestion.metadata.expiresAt
  }, [])
  
  // Get suggestion status
  const getSuggestionStatus = useCallback((suggestionId: string): 'pending' | 'accepted' | 'rejected' => {
    if (acceptedSuggestions.has(suggestionId)) return 'accepted'
    if (rejectedSuggestions.has(suggestionId)) return 'rejected'
    return 'pending'
  }, [acceptedSuggestions, rejectedSuggestions])
  
  // Clear expired suggestions
  const clearExpiredSuggestions = useCallback(() => {
    setSuggestions(prev => prev.filter(s => isSuggestionValid(s)))
  }, [isSuggestionValid])
  
  // Get confidence statistics
  const getConfidenceStats = useCallback(() => {
    if (suggestions.length === 0) return null
    
    const totalConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0)
    const avgConfidence = totalConfidence / suggestions.length
    
    const byType = new Map<string, number>()
    suggestions.forEach(s => {
      const current = byType.get(s.type) || 0
      byType.set(s.type, current + s.confidence)
    })
    
    return {
      average: avgConfidence,
      byType: Array.from(byType.entries()).map(([type, confidence]) => ({
        type,
        confidence: confidence / suggestions.filter(s => s.type === type).length
      }))
    }
  }, [suggestions])
  
  // Auto-update setup
  useEffect(() => {
    if (!enabled || !autoUpdate) return
    
    // Clear expired suggestions periodically
    const cleanupInterval = setInterval(() => {
      clearExpiredSuggestions()
    }, 30000) // Every 30 seconds
    
    return () => {
      clearInterval(cleanupInterval)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, autoUpdate, clearExpiredSuggestions])
  
  // Clear old accepted/rejected tracking
  useEffect(() => {
    const cleanup = setInterval(() => {
      // Clear old tracking data (older than 1 hour)
      const cutoff = Date.now() - 3600000
      
      setSuggestions(prev => {
        const currentIds = new Set(prev.map(s => s.id))
        
        // Clean accepted/rejected sets
        setAcceptedSuggestions(accepted => {
          const cleaned = new Set<string>()
          accepted.forEach(id => {
            if (currentIds.has(id)) cleaned.add(id)
          })
          return cleaned
        })
        
        setRejectedSuggestions(rejected => {
          const cleaned = new Set<string>()
          rejected.forEach(id => {
            if (currentIds.has(id)) cleaned.add(id)
          })
          return cleaned
        })
        
        return prev
      })
    }, 300000) // Every 5 minutes
    
    return () => clearInterval(cleanup)
  }, [])
  
  return {
    // State
    suggestions,
    isLoading,
    error,
    
    // Actions
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    
    // Getters
    getSuggestionsByType,
    getImmediateSuggestions,
    getUpcomingSuggestions,
    isSuggestionValid,
    getSuggestionStatus,
    getConfidenceStats,
    
    // Utilities
    clearExpiredSuggestions,
    isEnabled: enabled,
    
    // Counts
    counts: {
      total: suggestions.length,
      immediate: suggestions.filter(s => s.timing === 'immediate').length,
      accepted: acceptedSuggestions.size,
      rejected: rejectedSuggestions.size
    }
  }
}