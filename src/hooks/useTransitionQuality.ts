// Production Transition Quality Hook
// Manages ML predictions for transition quality

import { useState, useCallback, useEffect } from 'react'
import { transitionQualityPredictor, PredictionResult, TransitionOutcome } from '../lib/transitionQualityPredictor'
import { TransitionSuggestion } from '../lib/transitionSuggestionEngine'
import { EnhancedAnalysisResult } from '../lib/enhancedAudioAnalysis'
import { MixPointAnalysis } from '../lib/mixPointDetector'
import { EffectRecommendation } from '../lib/effectsRecommendationEngine'

interface UseTransitionQualityProps {
  trackAAnalysis?: EnhancedAnalysisResult
  trackBAnalysis?: EnhancedAnalysisResult
  mixPointA?: MixPointAnalysis
  mixPointB?: MixPointAnalysis
  transition?: TransitionSuggestion
  effects?: EffectRecommendation[]
  autoPredict?: boolean
}

export const useTransitionQuality = ({
  trackAAnalysis,
  trackBAnalysis,
  mixPointA,
  mixPointB,
  transition,
  effects,
  autoPredict = true
}: UseTransitionQualityProps) => {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [statistics, setStatistics] = useState(transitionQualityPredictor.getSuccessStatistics())
  const [history, setHistory] = useState<TransitionOutcome[]>([])

  // Predict transition quality
  const predictQuality = useCallback(async () => {
    if (!trackAAnalysis || !trackBAnalysis || !mixPointA || !mixPointB || !transition) {
      setPrediction(null)
      return null
    }

    setIsLoading(true)
    try {
      const result = await transitionQualityPredictor.predictTransitionQuality(
        trackAAnalysis,
        trackBAnalysis,
        mixPointA,
        mixPointB,
        transition,
        effects
      )
      setPrediction(result)
      return result
    } catch (error) {
      console.error('Error predicting transition quality:', error)
      setPrediction(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [trackAAnalysis, trackBAnalysis, mixPointA, mixPointB, transition, effects])

  // Record transition outcome
  const recordOutcome = useCallback((outcome: Partial<TransitionOutcome>) => {
    if (!transition || !prediction) return

    const fullOutcome: TransitionOutcome = {
      id: `${transition.id}-${Date.now()}`,
      timestamp: Date.now(),
      features: prediction.featureImportance as any, // Would need proper features
      overallSuccess: outcome.overallSuccess || 0.5,
      energyMaintained: outcome.energyMaintained || prediction.predictions.energyMaintenance,
      crowdEngagement: outcome.crowdEngagement || prediction.predictions.crowdEngagement,
      technicalExecution: outcome.technicalExecution || prediction.predictions.technicalSuccess,
      musicalCoherence: outcome.musicalCoherence || prediction.predictions.musicalCoherence,
      beatMatchQuality: outcome.beatMatchQuality || 0.8,
      volumeConsistency: outcome.volumeConsistency || 0.9,
      frequencyBalance: outcome.frequencyBalance || 0.85,
      userRating: outcome.userRating,
      userNotes: outcome.userNotes
    }

    transitionQualityPredictor.recordTransitionOutcome(fullOutcome)
    
    // Update statistics
    setStatistics(transitionQualityPredictor.getSuccessStatistics())
    
    // Add to local history
    setHistory(prev => [fullOutcome, ...prev].slice(0, 20))
  }, [transition, prediction])

  // Rate transition
  const rateTransition = useCallback((rating: number, notes?: string) => {
    recordOutcome({
      userRating: rating,
      userNotes: notes,
      overallSuccess: rating / 5
    })
  }, [recordOutcome])

  // Get prediction for specific technique
  const getPredictionForTechnique = useCallback(async (
    technique: string
  ): Promise<PredictionResult | null> => {
    if (!trackAAnalysis || !trackBAnalysis || !mixPointA || !mixPointB || !transition) {
      return null
    }

    // Create modified transition with different technique
    const modifiedTransition: TransitionSuggestion = {
      ...transition,
      technique: {
        ...transition.technique,
        name: technique
      }
    }

    try {
      const result = await transitionQualityPredictor.predictTransitionQuality(
        trackAAnalysis,
        trackBAnalysis,
        mixPointA,
        mixPointB,
        modifiedTransition,
        effects
      )
      return result
    } catch (error) {
      console.error('Error predicting for technique:', error)
      return null
    }
  }, [trackAAnalysis, trackBAnalysis, mixPointA, mixPointB, transition, effects])

  // Compare multiple techniques
  const compareTechniques = useCallback(async (
    techniques: string[]
  ): Promise<Map<string, PredictionResult>> => {
    const results = new Map<string, PredictionResult>()
    
    for (const technique of techniques) {
      const result = await getPredictionForTechnique(technique)
      if (result) {
        results.set(technique, result)
      }
    }
    
    return results
  }, [getPredictionForTechnique])

  // Get best transition option
  const findBestTransition = useCallback(async (): Promise<{
    technique: string
    prediction: PredictionResult
  } | null> => {
    const techniques = [
      'Classic Blend',
      'Bass Swap',
      'Echo Out',
      'Drop Swap',
      'Filter Sweep',
      'Loop & Layer'
    ]
    
    const comparisons = await compareTechniques(techniques)
    
    let best: { technique: string; prediction: PredictionResult } | null = null
    let highestScore = 0
    
    comparisons.forEach((prediction, technique) => {
      if (prediction.overallQuality > highestScore) {
        highestScore = prediction.overallQuality
        best = { technique, prediction }
      }
    })
    
    return best
  }, [compareTechniques])

  // Get historical performance for venue/time
  const getContextualPerformance = useCallback((context: {
    venueType?: string
    timeOfDay?: number
  }) => {
    const stats = transitionQualityPredictor.getSuccessStatistics()
    
    const performance = {
      overall: stats.overall,
      venue: context.venueType ? stats.byVenue.get(context.venueType) : undefined,
      timeOfDay: context.timeOfDay !== undefined ? 
        stats.byTimeOfDay.get(Math.floor(context.timeOfDay / 4) * 4) : undefined
    }
    
    return performance
  }, [])

  // Auto-predict when inputs change
  useEffect(() => {
    if (autoPredict && trackAAnalysis && trackBAnalysis && mixPointA && mixPointB && transition) {
      predictQuality()
    }
  }, [autoPredict, trackAAnalysis, trackBAnalysis, mixPointA, mixPointB, transition, predictQuality])

  // Update statistics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStatistics(transitionQualityPredictor.getSuccessStatistics())
    }, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  return {
    // State
    prediction,
    isLoading,
    statistics,
    history,
    
    // Actions
    predictQuality,
    recordOutcome,
    rateTransition,
    getPredictionForTechnique,
    compareTechniques,
    findBestTransition,
    getContextualPerformance,
    
    // Utilities
    canPredict: !!(trackAAnalysis && trackBAnalysis && mixPointA && mixPointB && transition)
  }
}