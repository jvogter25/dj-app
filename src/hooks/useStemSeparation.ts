import { useState, useCallback, useRef } from 'react'
import { demucsProcessor, StemSeparationProgress, StemSeparationResult, DemucsConfig } from '../lib/demucsProcessor'
import { StemFile } from '../lib/cdnStorage'

export interface UseStemSeparationReturn {
  // Processing state
  isProcessing: boolean
  progress: StemSeparationProgress | null
  error: string | null
  
  // Results
  generatedStems: StemFile[]
  lastProcessingTime: number | null
  
  // Actions
  separateStems: (
    audioFile: File | ArrayBuffer,
    trackId: string,
    config?: Partial<DemucsConfig>
  ) => Promise<StemSeparationResult>
  
  clearError: () => void
  clearResults: () => void
  
  // Utilities
  isAvailable: boolean
  supportedFormats: string[]
  estimateProcessingTime: (durationSeconds: number) => number
  validateAudioFile: (file: File) => { valid: boolean; error?: string }
}

export const useStemSeparation = (): UseStemSeparationReturn => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<StemSeparationProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generatedStems, setGeneratedStems] = useState<StemFile[]>([])
  const [lastProcessingTime, setLastProcessingTime] = useState<number | null>(null)
  
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const separateStems = useCallback(async (
    audioFile: File | ArrayBuffer,
    trackId: string,
    config: Partial<DemucsConfig> = {}
  ): Promise<StemSeparationResult> => {
    if (isProcessing) {
      throw new Error('Stem separation already in progress')
    }

    if (!demucsProcessor.isAvailable()) {
      throw new Error('Stem separation is not available in this browser')
    }

    setIsProcessing(true)
    setError(null)
    setProgress(null)
    setGeneratedStems([])

    try {
      const result = await demucsProcessor.separateStems(
        audioFile,
        trackId,
        config,
        (progressData) => {
          setProgress(progressData)
          
          // Clear progress after completion with a delay
          if (progressData.stage === 'complete' || progressData.stage === 'error') {
            if (progressTimeoutRef.current) {
              clearTimeout(progressTimeoutRef.current)
            }
            progressTimeoutRef.current = setTimeout(() => {
              setProgress(null)
            }, 5000)
          }
        }
      )

      if (result.success) {
        setGeneratedStems(result.stems)
        setLastProcessingTime(result.processingTime)
      } else {
        setError(result.error || 'Stem separation failed')
      }

      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error occurred'
      setError(errorMessage)
      
      setProgress({
        stage: 'error',
        progress: 0,
        message: errorMessage,
        error: errorMessage
      })

      return {
        success: false,
        stems: [],
        error: errorMessage,
        processingTime: 0
      }
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearResults = useCallback(() => {
    setGeneratedStems([])
    setLastProcessingTime(null)
    setProgress(null)
    setError(null)
  }, [])

  const validateAudioFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file type
    const supportedFormats = demucsProcessor.getSupportedFormats()
    if (!supportedFormats.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file format. Supported formats: ${supportedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}`
      }
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`
      }
    }

    // Check if file is actually an audio file (basic validation)
    if (!file.name.match(/\.(wav|mp3|flac|ogg|m4a)$/i)) {
      return {
        valid: false,
        error: 'File does not appear to be a valid audio file'
      }
    }

    return { valid: true }
  }, [])

  const estimateProcessingTime = useCallback((durationSeconds: number): number => {
    return demucsProcessor.estimateProcessingTime(durationSeconds)
  }, [])

  return {
    // State
    isProcessing,
    progress,
    error,
    generatedStems,
    lastProcessingTime,
    
    // Actions
    separateStems,
    clearError,
    clearResults,
    
    // Utilities
    isAvailable: demucsProcessor.isAvailable(),
    supportedFormats: demucsProcessor.getSupportedFormats(),
    estimateProcessingTime,
    validateAudioFile
  }
}