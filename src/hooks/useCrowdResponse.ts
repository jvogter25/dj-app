import { useState, useCallback, useEffect } from 'react'
import { CrowdResponse, CrowdContext, crowdResponsePredictor } from '../lib/crowdResponsePredictor'
import { EnhancedAnalysisResult } from '../lib/enhancedAudioAnalysis'
import { useEnhancedAnalysis } from './useEnhancedAnalysis'

interface UseCrowdResponseReturn {
  crowdResponse: CrowdResponse | null
  crowdContext: CrowdContext
  isAnalyzing: boolean
  error: string | null
  predictCrowdResponse: (trackId: string, context?: CrowdContext) => Promise<void>
  updateContext: (context: CrowdContext) => void
  clearPrediction: () => void
}

const defaultContext: CrowdContext = {
  venue: {
    type: 'club',
    capacity: 500,
    atmosphere: 'energetic'
  },
  timeOfDay: {
    hour: new Date().getHours(),
    dayOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()] as any,
    isHoliday: false
  },
  audience: {
    estimatedSize: 300,
    energyLevel: 0.7,
    engagement: 0.8,
    demographics: {
      primaryAgeGroup: '25-34',
      musicPreference: 'underground'
    }
  },
  setPosition: {
    phase: 'peak',
    minutesPlayed: 60,
    minutesRemaining: 60
  }
}

export const useCrowdResponse = (): UseCrowdResponseReturn => {
  const [crowdResponse, setCrowdResponse] = useState<CrowdResponse | null>(null)
  const [crowdContext, setCrowdContext] = useState<CrowdContext>(defaultContext)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { getAnalysisResults } = useEnhancedAnalysis()

  // Load context from localStorage
  useEffect(() => {
    const savedContext = localStorage.getItem('crowdContext')
    if (savedContext) {
      try {
        setCrowdContext(JSON.parse(savedContext))
      } catch (e) {
        console.error('Failed to load saved crowd context:', e)
      }
    }
  }, [])

  const predictCrowdResponse = useCallback(async (trackId: string, context?: CrowdContext) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      // Get the enhanced analysis results
      const analysisResult = await getAnalysisResults(trackId)
      
      if (!analysisResult) {
        throw new Error('No analysis data available for this track')
      }

      const contextToUse = context || crowdContext

      // Predict crowd response
      const response = await crowdResponsePredictor.predictCrowdResponse(
        analysisResult.spectralFeatures,
        analysisResult.moodFeatures,
        analysisResult.vocalFeatures,
        analysisResult.genreAnalysis,
        contextToUse
      )

      setCrowdResponse(response)

      // Log high-confidence recommendations
      response.recommendations
        .filter(rec => rec.confidence > 0.8)
        .forEach(rec => {
          console.log(`[Crowd AI] ${rec.action} (${Math.round(rec.confidence * 100)}% confidence)`)
        })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to predict crowd response'
      setError(errorMessage)
      console.error('Crowd response prediction error:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [crowdContext, getAnalysisResults])

  const updateContext = useCallback((newContext: CrowdContext) => {
    setCrowdContext(newContext)
    // Save to localStorage
    localStorage.setItem('crowdContext', JSON.stringify(newContext))
  }, [])

  const clearPrediction = useCallback(() => {
    setCrowdResponse(null)
    setError(null)
  }, [])

  return {
    crowdResponse,
    crowdContext,
    isAnalyzing,
    error,
    predictCrowdResponse,
    updateContext,
    clearPrediction
  }
}

// Helper hook for real-time crowd monitoring
export const useCrowdMonitoring = (updateInterval: number = 30000) => {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [crowdState, setCrowdState] = useState({
    energyLevel: 0.7,
    engagement: 0.8,
    movementIntensity: 0.6
  })

  useEffect(() => {
    if (!isMonitoring) return

    const interval = setInterval(() => {
      // In production, this would connect to real sensors/cameras
      // For now, simulate crowd state changes
      setCrowdState(prev => ({
        energyLevel: Math.max(0, Math.min(1, prev.energyLevel + (Math.random() - 0.5) * 0.1)),
        engagement: Math.max(0, Math.min(1, prev.engagement + (Math.random() - 0.5) * 0.1)),
        movementIntensity: Math.max(0, Math.min(1, prev.movementIntensity + (Math.random() - 0.5) * 0.15))
      }))
    }, updateInterval)

    return () => clearInterval(interval)
  }, [isMonitoring, updateInterval])

  return {
    crowdState,
    isMonitoring,
    startMonitoring: () => setIsMonitoring(true),
    stopMonitoring: () => setIsMonitoring(false)
  }
}

// Helper hook for crowd response history
export const useCrowdResponseHistory = () => {
  const [history, setHistory] = useState<Array<{
    timestamp: Date
    trackId: string
    response: CrowdResponse
    context: CrowdContext
    actualOutcome?: {
      engagement: number
      energy: number
      notes?: string
    }
  }>>([])

  const addToHistory = useCallback((
    trackId: string,
    response: CrowdResponse,
    context: CrowdContext
  ) => {
    setHistory(prev => [...prev, {
      timestamp: new Date(),
      trackId,
      response,
      context
    }])
  }, [])

  const updateOutcome = useCallback((
    timestamp: Date,
    outcome: { engagement: number; energy: number; notes?: string }
  ) => {
    setHistory(prev => prev.map(entry => 
      entry.timestamp === timestamp 
        ? { ...entry, actualOutcome: outcome }
        : entry
    ))
  }, [])

  const getAccuracy = useCallback(() => {
    const entriesWithOutcomes = history.filter(entry => entry.actualOutcome)
    if (entriesWithOutcomes.length === 0) return null

    const totalError = entriesWithOutcomes.reduce((sum, entry) => {
      const engagementError = Math.abs(entry.response.predictedEngagement - entry.actualOutcome!.engagement)
      const energyError = Math.abs(entry.response.predictedEnergy - entry.actualOutcome!.energy)
      return sum + (engagementError + energyError) / 2
    }, 0)

    return 1 - (totalError / entriesWithOutcomes.length)
  }, [history])

  return {
    history,
    addToHistory,
    updateOutcome,
    getAccuracy
  }
}