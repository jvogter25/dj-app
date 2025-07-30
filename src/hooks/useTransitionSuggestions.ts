import { useState, useCallback, useEffect } from 'react'
import { TransitionSuggestion, transitionSuggestionEngine } from '../lib/transitionSuggestionEngine'
import { MixPointAnalysis, mixPointDetector } from '../lib/mixPointDetector'
import { EnhancedAnalysisResult } from '../lib/enhancedAudioAnalysis'
import { useEnhancedAnalysis } from './useEnhancedAnalysis'

interface UseTransitionSuggestionsReturn {
  currentSuggestion: TransitionSuggestion | null
  allSuggestions: TransitionSuggestion[]
  isAnalyzing: boolean
  error: string | null
  generateSuggestions: (trackAId: string, trackBId: string) => Promise<void>
  selectSuggestion: (index: number) => void
  clearSuggestions: () => void
}

export const useTransitionSuggestions = (): UseTransitionSuggestionsReturn => {
  const [currentSuggestion, setCurrentSuggestion] = useState<TransitionSuggestion | null>(null)
  const [allSuggestions, setAllSuggestions] = useState<TransitionSuggestion[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mixPointCache, setMixPointCache] = useState<Map<string, MixPointAnalysis>>(new Map())
  
  const { getAnalysisResults } = useEnhancedAnalysis()

  const generateSuggestions = useCallback(async (trackAId: string, trackBId: string) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      // Get enhanced analysis for both tracks
      const [analysisA, analysisB] = await Promise.all([
        getAnalysisResults(trackAId),
        getAnalysisResults(trackBId)
      ])

      if (!analysisA || !analysisB) {
        throw new Error('Missing analysis data for one or both tracks')
      }

      // Get or generate mix points for both tracks
      let mixPointA = mixPointCache.get(trackAId)
      let mixPointB = mixPointCache.get(trackBId)

      if (!mixPointA) {
        console.log('[Transition AI] Analyzing mix points for track A...')
        mixPointA = await mixPointDetector.analyzeMixPoints(analysisA)
        setMixPointCache(prev => new Map(prev).set(trackAId, mixPointA!))
      }

      if (!mixPointB) {
        console.log('[Transition AI] Analyzing mix points for track B...')
        mixPointB = await mixPointDetector.analyzeMixPoints(analysisB)
        setMixPointCache(prev => new Map(prev).set(trackBId, mixPointB!))
      }

      // Generate multiple transition options
      console.log('[Transition AI] Generating transition suggestions...')
      const suggestions = await transitionSuggestionEngine.generateMultipleOptions(
        analysisA,
        analysisB,
        mixPointA,
        mixPointB
      )

      if (suggestions.length === 0) {
        throw new Error('No suitable transitions found between these tracks')
      }

      setAllSuggestions(suggestions)
      setCurrentSuggestion(suggestions[0]) // Select highest confidence by default

      // Log the best suggestion
      const best = suggestions[0]
      console.log(
        `[Transition AI] Best technique: ${best.technique.name} ` +
        `(${Math.round(best.confidence * 100)}% confidence)`
      )
      console.log(
        `[Transition AI] Compatibility: Harmonic ${Math.round(best.compatibility.harmonic * 100)}%, ` +
        `Rhythmic ${Math.round(best.compatibility.rhythmic * 100)}%, ` +
        `Energy ${Math.round(best.compatibility.energy * 100)}%`
      )

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate transition suggestions'
      setError(errorMessage)
      console.error('Transition suggestion error:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [getAnalysisResults, mixPointCache])

  const selectSuggestion = useCallback((index: number) => {
    if (index >= 0 && index < allSuggestions.length) {
      setCurrentSuggestion(allSuggestions[index])
    }
  }, [allSuggestions])

  const clearSuggestions = useCallback(() => {
    setCurrentSuggestion(null)
    setAllSuggestions([])
    setError(null)
  }, [])

  // Clear cache if it gets too large
  useEffect(() => {
    if (mixPointCache.size > 50) {
      console.log('[Transition AI] Clearing mix point cache')
      setMixPointCache(new Map())
    }
  }, [mixPointCache.size])

  return {
    currentSuggestion,
    allSuggestions,
    isAnalyzing,
    error,
    generateSuggestions,
    selectSuggestion,
    clearSuggestions
  }
}

// Helper hook for applying transition automation
export const useTransitionAutomation = () => {
  const [isActive, setIsActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<string | null>(null)

  const applyTransition = useCallback(async (
    suggestion: TransitionSuggestion,
    onCrossfaderChange: (position: number) => void,
    onEQChange: (track: 'A' | 'B', band: 'low' | 'mid' | 'high', value: number) => void,
    onEffectChange?: (track: 'A' | 'B', effect: string, param: string, value: number) => void
  ) => {
    setIsActive(true)
    setProgress(0)

    const startTime = Date.now()
    const duration = suggestion.timing.totalDuration * 1000 // Convert to ms

    const animate = () => {
      const elapsed = Date.now() - startTime
      const normalizedTime = Math.min(elapsed / duration, 1)
      
      setProgress(normalizedTime * 100)

      // Apply crossfader automation
      const crossfaderValue = interpolateCrossfader(
        suggestion.crossfader,
        normalizedTime
      )
      onCrossfaderChange(crossfaderValue)
      setCurrentStep('Crossfader')

      // Apply EQ automation
      suggestion.eqAutomation.forEach(eq => {
        const eqProgress = Math.min(
          Math.max((elapsed - 0) / (eq.duration * 1000), 0),
          1
        )
        const value = interpolateLinear(
          eq.startValue,
          eq.endValue,
          eqProgress
        )
        onEQChange(eq.track, eq.band, value)
      })
      setCurrentStep('EQ')

      // Apply effect automation
      if (onEffectChange) {
        suggestion.effectAutomation.forEach(effect => {
          const effectProgress = Math.min(
            Math.max((elapsed - 0) / (effect.duration * 1000), 0),
            1
          )
          const value = interpolateLinear(
            effect.startValue,
            effect.endValue,
            effectProgress
          )
          onEffectChange(
            effect.track as 'A' | 'B',
            effect.effect,
            effect.parameter,
            value
          )
        })
        if (suggestion.effectAutomation.length > 0) {
          setCurrentStep('Effects')
        }
      }

      if (normalizedTime < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsActive(false)
        setProgress(100)
        setCurrentStep(null)
        console.log('[Transition AI] Transition complete')
      }
    }

    requestAnimationFrame(animate)
  }, [])

  const cancelTransition = useCallback(() => {
    setIsActive(false)
    setProgress(0)
    setCurrentStep(null)
  }, [])

  return {
    isActive,
    progress,
    currentStep,
    applyTransition,
    cancelTransition
  }
}

// Helper functions
function interpolateCrossfader(
  curve: TransitionSuggestion['crossfader'],
  normalizedTime: number
): number {
  const keyPoints = curve.keyPoints
  
  // Find surrounding keypoints
  let prevPoint = keyPoints[0]
  let nextPoint = keyPoints[keyPoints.length - 1]
  
  for (let i = 0; i < keyPoints.length - 1; i++) {
    if (keyPoints[i].time <= normalizedTime && keyPoints[i + 1].time > normalizedTime) {
      prevPoint = keyPoints[i]
      nextPoint = keyPoints[i + 1]
      break
    }
  }
  
  // Interpolate between points
  const segmentProgress = (normalizedTime - prevPoint.time) / (nextPoint.time - prevPoint.time)
  
  switch (prevPoint.curve) {
    case 'linear':
      return interpolateLinear(prevPoint.position, nextPoint.position, segmentProgress)
    
    case 'ease-in':
      return interpolateEaseIn(prevPoint.position, nextPoint.position, segmentProgress)
    
    case 'ease-out':
      return interpolateEaseOut(prevPoint.position, nextPoint.position, segmentProgress)
    
    case 'hold':
      return prevPoint.position
    
    default:
      return interpolateLinear(prevPoint.position, nextPoint.position, segmentProgress)
  }
}

function interpolateLinear(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

function interpolateEaseIn(start: number, end: number, t: number): number {
  const eased = t * t
  return start + (end - start) * eased
}

function interpolateEaseOut(start: number, end: number, t: number): number {
  const eased = 1 - Math.pow(1 - t, 2)
  return start + (end - start) * eased
}