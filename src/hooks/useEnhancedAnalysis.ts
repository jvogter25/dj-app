// React hook for enhanced audio analysis functionality
import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  enhancedAudioAnalyzer, 
  EnhancedAnalysisResult, 
  AnalysisProgress, 
  AnalysisConfig 
} from '../lib/enhancedAudioAnalysis'
import { useAuth } from '../contexts/AuthContext'

export interface UseEnhancedAnalysisReturn {
  // Analysis state
  isAnalyzing: boolean
  progress: AnalysisProgress | null
  error: string | null
  
  // Results
  analysisResult: EnhancedAnalysisResult | null
  similarTracks: Array<{
    trackId: string
    similarity: number
    features: string[]
  }>
  libraryStats: {
    totalTracks: number
    averageEnergy: number
    genreDistribution: Record<string, number>
    tempoDistribution: Record<string, number>
    keyDistribution: Record<string, number>
  } | null
  
  // Actions
  analyzeTrack: (
    audioFile: File | ArrayBuffer,
    trackId: string,
    config?: Partial<AnalysisConfig>
  ) => Promise<EnhancedAnalysisResult | null>
  
  getAnalysisResults: (trackId: string) => Promise<EnhancedAnalysisResult | null>
  findSimilarTracks: (trackId: string, limit?: number) => Promise<void>
  loadLibraryStatistics: () => Promise<void>
  cancelAnalysis: (trackId: string) => boolean
  
  // Utilities
  clearResults: () => void
  clearError: () => void
  
  // Configuration helpers
  getDefaultConfig: () => AnalysisConfig
  validateConfig: (config: Partial<AnalysisConfig>) => string[]
}

export const useEnhancedAnalysis = (): UseEnhancedAnalysisReturn => {
  const { user } = useAuth()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<EnhancedAnalysisResult | null>(null)
  const [similarTracks, setSimilarTracks] = useState<Array<{
    trackId: string
    similarity: number
    features: string[]
  }>>([])
  const [libraryStats, setLibraryStats] = useState<{
    totalTracks: number
    averageEnergy: number
    genreDistribution: Record<string, number>
    tempoDistribution: Record<string, number>
    keyDistribution: Record<string, number>
  } | null>(null)
  
  const analysisRef = useRef<string | null>(null)

  const analyzeTrack = useCallback(async (
    audioFile: File | ArrayBuffer,
    trackId: string,
    config: Partial<AnalysisConfig> = {}
  ): Promise<EnhancedAnalysisResult | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }

    if (isAnalyzing) {
      setError('Another analysis is already in progress')
      return null
    }

    setIsAnalyzing(true)
    setError(null)
    setProgress({ stage: 'uploading', progress: 0, message: 'Starting analysis...' })
    analysisRef.current = trackId

    try {
      const defaultConfig = getDefaultConfig()
      const finalConfig = { ...defaultConfig, ...config }

      const result = await enhancedAudioAnalyzer.analyzeTrack(
        audioFile,
        trackId,
        user.id,
        finalConfig,
        (progressUpdate) => {
          setProgress(progressUpdate)
        }
      )

      setAnalysisResult(result)
      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed'
      setError(errorMessage)
      return null
    } finally {
      setIsAnalyzing(false)
      analysisRef.current = null
      // Keep progress visible for a moment after completion
      setTimeout(() => {
        if (!isAnalyzing) {
          setProgress(null)
        }
      }, 3000)
    }
  }, [user, isAnalyzing])

  const getAnalysisResults = useCallback(async (
    trackId: string
  ): Promise<EnhancedAnalysisResult | null> => {
    setError(null)

    try {
      const result = await enhancedAudioAnalyzer.getAnalysisResults(trackId)
      if (result) {
        setAnalysisResult(result)
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analysis results'
      setError(errorMessage)
      return null
    }
  }, [])

  const findSimilarTracks = useCallback(async (
    trackId: string,
    limit: number = 10
  ): Promise<void> => {
    if (!user) {
      setError('User not authenticated')
      return
    }

    setError(null)

    try {
      const similar = await enhancedAudioAnalyzer.findSimilarTracks(trackId, user.id, limit)
      setSimilarTracks(similar)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find similar tracks'
      setError(errorMessage)
    }
  }, [user])

  const loadLibraryStatistics = useCallback(async (): Promise<void> => {
    if (!user) {
      setError('User not authenticated')
      return
    }

    setError(null)

    try {
      const stats = await enhancedAudioAnalyzer.getLibraryStatistics(user.id)
      setLibraryStats(stats)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load library statistics'
      setError(errorMessage)
    }
  }, [user])

  const cancelAnalysis = useCallback((trackId: string): boolean => {
    if (analysisRef.current === trackId) {
      const cancelled = enhancedAudioAnalyzer.cancelAnalysis(trackId)
      if (cancelled) {
        setIsAnalyzing(false)
        setProgress(null)
        analysisRef.current = null
        setError('Analysis cancelled')
      }
      return cancelled
    }
    return false
  }, [])

  const clearResults = useCallback(() => {
    setAnalysisResult(null)
    setSimilarTracks([])
    setLibraryStats(null)
    setProgress(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const getDefaultConfig = useCallback((): AnalysisConfig => {
    return {
      enableSpectralAnalysis: true,
      enableMoodAnalysis: true,
      enableVocalAnalysis: true,
      enableGenreClassification: true,
      enableStemSeparation: false, // Expensive operation, off by default
      enableDuplicateDetection: true,
      spectralConfig: {
        frameSize: 2048,
        hopSize: 512,
        melBands: 128,
        enableHarmonicPercussive: true
      },
      moodConfig: {
        enableEnergyAnalysis: true,
        enableEmotionalDimensions: true,
        enableGenreMarkers: true,
        energyResolution: 'medium'
      },
      stemConfig: {
        model: 'htdemucs',
        quality: 'medium'
      },
      duplicateConfig: {
        threshold: 0.85,
        algorithms: ['chromaprint', 'spectral_hash']
      }
    }
  }, [])

  const validateConfig = useCallback((config: Partial<AnalysisConfig>): string[] => {
    const errors: string[] = []

    // Validate spectral config
    if (config.spectralConfig) {
      const { frameSize, hopSize, melBands } = config.spectralConfig

      if (frameSize && (frameSize < 512 || frameSize > 8192 || !isPowerOfTwo(frameSize))) {
        errors.push('Frame size must be a power of 2 between 512 and 8192')
      }

      if (hopSize && frameSize && hopSize > frameSize / 2) {
        errors.push('Hop size must be less than or equal to half the frame size')
      }

      if (melBands && (melBands < 12 || melBands > 256)) {
        errors.push('Mel bands must be between 12 and 256')
      }
    }

    // Validate stem config
    if (config.stemConfig && config.enableStemSeparation) {
      const validModels = ['htdemucs', 'htdemucs_ft', 'mdx_extra']
      const validQualities = ['fast', 'medium', 'high']

      if (config.stemConfig.model && !validModels.includes(config.stemConfig.model)) {
        errors.push(`Stem model must be one of: ${validModels.join(', ')}`)
      }

      if (config.stemConfig.quality && !validQualities.includes(config.stemConfig.quality)) {
        errors.push(`Stem quality must be one of: ${validQualities.join(', ')}`)
      }
    }

    // Validate duplicate config
    if (config.duplicateConfig) {
      const { threshold, algorithms } = config.duplicateConfig
      const validAlgorithms = ['chromaprint', 'mfcc', 'spectral_hash']

      if (threshold && (threshold < 0 || threshold > 1)) {
        errors.push('Duplicate threshold must be between 0 and 1')
      }

      if (algorithms) {
        const invalidAlgs = algorithms.filter(alg => !validAlgorithms.includes(alg))
        if (invalidAlgs.length > 0) {
          errors.push(`Invalid algorithms: ${invalidAlgs.join(', ')}. Valid options: ${validAlgorithms.join(', ')}`)
        }
      }
    }

    return errors
  }, [])

  // Helper function
  const isPowerOfTwo = (n: number): boolean => {
    return n > 0 && (n & (n - 1)) === 0
  }

  // Auto-load library statistics on mount
  useEffect(() => {
    if (user) {
      loadLibraryStatistics()
    }
  }, [user, loadLibraryStatistics])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analysisRef.current) {
        enhancedAudioAnalyzer.cancelAnalysis(analysisRef.current)
      }
    }
  }, [])

  return {
    // State
    isAnalyzing,
    progress,
    error,
    analysisResult,
    similarTracks,
    libraryStats,
    
    // Actions
    analyzeTrack,
    getAnalysisResults,
    findSimilarTracks,
    loadLibraryStatistics,
    cancelAnalysis,
    
    // Utilities
    clearResults,
    clearError,
    getDefaultConfig,
    validateConfig
  }
}

// Additional hook for managing analysis preferences
interface PreferencesType {
  defaultSpectralAnalysis: boolean
  defaultStemSeparation: boolean
  defaultDuplicateDetection: boolean
  preferredStemQuality: 'fast' | 'medium' | 'high'
  preferredAnalysisDepth: 'basic' | 'standard' | 'comprehensive'
  enableMoodAnalysis: boolean
  enableVocalAnalysis: boolean
  enableGenreClassification: boolean
  enableCrowdPrediction: boolean
  enableTransitionSuggestions: boolean
  notifyOnCompletion: boolean
  notifyOnDuplicates: boolean
  autoProcessUploads: boolean
  maxConcurrentAnalyses: number
}

export interface UseAnalysisPreferencesReturn {
  preferences: PreferencesType | null
  
  loading: boolean
  error: string | null
  
  updatePreferences: (updates: Partial<PreferencesType>) => Promise<boolean>
  resetToDefaults: () => Promise<boolean>
}

export const useAnalysisPreferences = (): UseAnalysisPreferencesReturn => {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<PreferencesType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load preferences on mount
  useEffect(() => {
    if (user) {
      loadPreferences()
    }
  }, [user])

  const loadPreferences = async () => {
    // Implementation would load from Supabase
    // For now, return default preferences
    setPreferences({
      defaultSpectralAnalysis: true,
      defaultStemSeparation: false,
      defaultDuplicateDetection: true,
      preferredStemQuality: 'medium',
      preferredAnalysisDepth: 'standard',
      enableMoodAnalysis: true,
      enableVocalAnalysis: true,
      enableGenreClassification: true,
      enableCrowdPrediction: false,
      enableTransitionSuggestions: true,
      notifyOnCompletion: true,
      notifyOnDuplicates: true,
      autoProcessUploads: true,
      maxConcurrentAnalyses: 3
    })
    setLoading(false)
  }

  const updatePreferences = async (updates: Partial<PreferencesType>): Promise<boolean> => {
    try {
      // Implementation would update Supabase
      setPreferences(prev => prev ? ({ ...prev, ...updates }) : null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences')
      return false
    }
  }

  const resetToDefaults = async (): Promise<boolean> => {
    try {
      // Implementation would reset in Supabase
      await loadPreferences()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset preferences')
      return false
    }
  }

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    resetToDefaults
  }
}