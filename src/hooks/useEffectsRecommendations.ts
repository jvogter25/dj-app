// Production Effects Recommendations Hook
// Manages effect recommendations state and automation

import { useState, useEffect, useCallback, useRef } from 'react'
import { effectsRecommendationEngine, EffectAnalysisResult, EffectRecommendation } from '../lib/effectsRecommendationEngine'
import { EnhancedAnalysisResult } from '../lib/enhancedAudioAnalysis'
import { MixPointAnalysis } from '../lib/mixPointDetector'
import { TransitionSuggestion } from '../lib/transitionSuggestionEngine'

interface UseEffectsRecommendationsProps {
  trackAnalysis?: EnhancedAnalysisResult
  mixPoints?: MixPointAnalysis
  transitionSuggestion?: TransitionSuggestion
  audioContext?: AudioContext
  currentTime?: number
  bpm?: number
}

interface EffectAutomationState {
  effectId: string
  startTime: number
  endTime: number
  automationEvents: Array<{
    time: number
    action: string
    parameters: any
  }>
  isActive: boolean
}

export const useEffectsRecommendations = ({
  trackAnalysis,
  mixPoints,
  transitionSuggestion,
  audioContext,
  currentTime = 0,
  bpm = 128
}: UseEffectsRecommendationsProps) => {
  const [effectAnalysis, setEffectAnalysis] = useState<EffectAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeAutomations, setActiveAutomations] = useState<Map<string, EffectAutomationState>>(new Map())
  const [appliedEffects, setAppliedEffects] = useState<Set<string>>(new Set())
  
  // Refs for automation timing
  const animationFrameRef = useRef<number | undefined>(undefined)
  const lastUpdateTime = useRef<number>(0)

  // Analyze track for effect recommendations
  const analyzeEffects = useCallback(async () => {
    if (!trackAnalysis || !mixPoints) return

    setIsLoading(true)
    try {
      const analysis = await effectsRecommendationEngine.analyzeAndRecommendEffects(
        trackAnalysis,
        mixPoints,
        transitionSuggestion
      )
      setEffectAnalysis(analysis)
    } catch (error) {
      console.error('Error analyzing effects:', error)
    } finally {
      setIsLoading(false)
    }
  }, [trackAnalysis, mixPoints, transitionSuggestion])

  // Apply effect recommendation
  const applyEffect = useCallback(async (recommendation: EffectRecommendation) => {
    if (!audioContext || appliedEffects.has(recommendation.preset.id)) return

    // Generate automation script
    const automationScript = effectsRecommendationEngine.generateAutomationScript(
      recommendation,
      bpm
    )

    // Create automation state
    const automationState: EffectAutomationState = {
      effectId: recommendation.preset.id,
      startTime: currentTime + recommendation.timing.idealStartPoint,
      endTime: currentTime + recommendation.timing.idealStartPoint + recommendation.timing.duration,
      automationEvents: automationScript,
      isActive: false
    }

    // Add to active automations
    setActiveAutomations(prev => {
      const newMap = new Map(prev)
      newMap.set(recommendation.preset.id, automationState)
      return newMap
    })

    // Mark as applied
    setAppliedEffects(prev => {
      const newSet = new Set(prev)
      newSet.add(recommendation.preset.id)
      return newSet
    })

    // Log application
    console.log('Applied effect:', recommendation.preset.name, {
      startTime: automationState.startTime,
      duration: recommendation.timing.duration,
      automationPoints: automationScript.length
    })
  }, [audioContext, appliedEffects, currentTime, bpm])

  // Remove effect
  const removeEffect = useCallback((effectId: string) => {
    setActiveAutomations(prev => {
      const newMap = new Map(prev)
      newMap.delete(effectId)
      return newMap
    })
    setAppliedEffects(prev => {
      const newSet = new Set(prev)
      newSet.delete(effectId)
      return newSet
    })
  }, [])

  // Process automation events
  const processAutomation = useCallback(() => {
    if (!audioContext || activeAutomations.size === 0) return

    const now = currentTime

    activeAutomations.forEach((automation, effectId) => {
      // Check if automation should be active
      const shouldBeActive = now >= automation.startTime && now <= automation.endTime

      if (shouldBeActive && !automation.isActive) {
        // Activate automation
        automation.isActive = true
        console.log('Activating effect automation:', effectId)
      } else if (!shouldBeActive && automation.isActive) {
        // Deactivate and remove automation
        automation.isActive = false
        removeEffect(effectId)
        console.log('Deactivating effect automation:', effectId)
        return
      }

      // Process automation events
      if (automation.isActive) {
        automation.automationEvents.forEach(event => {
          // Check if event should fire (within 50ms window)
          const eventTime = automation.startTime + event.time
          const timeDiff = Math.abs(now - eventTime)
          
          if (timeDiff < 0.05 && lastUpdateTime.current < eventTime) {
            // Fire automation event
            console.log('Automation event:', event.action, event.parameters)
            // Here you would apply the actual effect parameter changes
            // This would integrate with your Web Audio effects chain
          }
        })
      }
    })

    lastUpdateTime.current = now
  }, [audioContext, activeAutomations, currentTime, removeEffect])

  // Animation loop for smooth automation
  const startAutomationLoop = useCallback(() => {
    const animate = () => {
      processAutomation()
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animate()
  }, [processAutomation])

  const stopAutomationLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Get creative opportunities at current time
  const getCurrentOpportunities = useCallback(() => {
    if (!effectAnalysis) return []

    return effectAnalysis.creativeOpportunities.filter(opportunity => {
      const timeDiff = Math.abs(opportunity.timestamp - currentTime)
      return timeDiff < 5 // Within 5 seconds
    })
  }, [effectAnalysis, currentTime])

  // Get effect compatibility for a specific effect type
  const getEffectCompatibility = useCallback((effectType: string): number => {
    if (!effectAnalysis) return 0.5
    return effectAnalysis.effectCompatibility.get(effectType) || 0.5
  }, [effectAnalysis])

  // Clear all active effects
  const clearAllEffects = useCallback(() => {
    setActiveAutomations(new Map())
    setAppliedEffects(new Set())
  }, [])

  // Effect to trigger analysis when inputs change
  useEffect(() => {
    analyzeEffects()
  }, [analyzeEffects])

  // Effect to manage automation loop
  useEffect(() => {
    if (activeAutomations.size > 0) {
      startAutomationLoop()
    } else {
      stopAutomationLoop()
    }

    return () => {
      stopAutomationLoop()
    }
  }, [activeAutomations.size, startAutomationLoop, stopAutomationLoop])

  return {
    // State
    effectAnalysis,
    isLoading,
    activeAutomations: Array.from(activeAutomations.values()),
    appliedEffects: Array.from(appliedEffects),
    
    // Recommendations
    recommendations: effectAnalysis?.recommendedEffects || [],
    transitionEffects: effectAnalysis?.transitionEffects || [],
    creativeOpportunities: getCurrentOpportunities(),
    
    // Actions
    applyEffect,
    removeEffect,
    clearAllEffects,
    reanalyze: analyzeEffects,
    
    // Utilities
    getEffectCompatibility,
    hasAppliedEffect: (effectId: string) => appliedEffects.has(effectId)
  }
}