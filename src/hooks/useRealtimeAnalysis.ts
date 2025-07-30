// Production Real-time Analysis Hook
// Manages real-time audio analysis state and WebAudio connections

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  realtimeAudioAnalyzer, 
  ProductionRealtimeAudioAnalyzer,
  RealtimeAnalysisResult,
  RealtimeAnalyzerConfig
} from '../lib/realtimeAudioAnalyzer'

interface UseRealtimeAnalysisProps {
  audioContext?: AudioContext
  source?: AudioNode
  config?: Partial<RealtimeAnalyzerConfig>
  autoStart?: boolean
  onAnalysis?: (result: RealtimeAnalysisResult) => void
}

export const useRealtimeAnalysis = ({
  audioContext,
  source,
  config,
  autoStart = false,
  onAnalysis
}: UseRealtimeAnalysisProps) => {
  const [analyzer, setAnalyzer] = useState<ProductionRealtimeAudioAnalyzer | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState<RealtimeAnalysisResult | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState<RealtimeAnalysisResult[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    latency: 0,
    cpuUsage: 0
  })
  
  // Refs for cleanup
  const cleanupRef = useRef<(() => void) | null>(null)
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  
  // Initialize analyzer
  useEffect(() => {
    if (!audioContext) return
    
    try {
      const newAnalyzer = realtimeAudioAnalyzer(audioContext, config)
      setAnalyzer(newAnalyzer)
      setError(null)
    } catch (err) {
      console.error('Error creating real-time analyzer:', err)
      setError('Failed to initialize audio analyzer')
    }
  }, [audioContext, config])
  
  // Connect source
  useEffect(() => {
    if (!analyzer || !source) return
    
    try {
      analyzer.connectSource(source)
      setError(null)
      
      return () => {
        analyzer.disconnectSource(source)
      }
    } catch (err) {
      console.error('Error connecting audio source:', err)
      setError('Failed to connect audio source')
    }
  }, [analyzer, source])
  
  // Handle analysis callbacks
  useEffect(() => {
    if (!analyzer) return
    
    const handleAnalysis = (result: RealtimeAnalysisResult) => {
      // Update current analysis
      setCurrentAnalysis(result)
      
      // Update history (keep last 100 frames)
      setAnalysisHistory(prev => [...prev.slice(-99), result])
      
      // Calculate FPS
      frameCountRef.current++
      const now = performance.now()
      if (now - lastFrameTimeRef.current >= 1000) {
        setPerformanceMetrics(prev => ({
          ...prev,
          fps: frameCountRef.current,
          latency: now - result.timestamp
        }))
        frameCountRef.current = 0
        lastFrameTimeRef.current = now
      }
      
      // Call external handler
      if (onAnalysis) {
        onAnalysis(result)
      }
    }
    
    cleanupRef.current = analyzer.onAnalysis(handleAnalysis)
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [analyzer, onAnalysis])
  
  // Start analysis
  const startAnalysis = useCallback(() => {
    if (!analyzer || isAnalyzing) return
    
    try {
      analyzer.startAnalysis()
      setIsAnalyzing(true)
      setError(null)
    } catch (err) {
      console.error('Error starting analysis:', err)
      setError('Failed to start analysis')
    }
  }, [analyzer, isAnalyzing])
  
  // Stop analysis
  const stopAnalysis = useCallback(() => {
    if (!analyzer || !isAnalyzing) return
    
    try {
      analyzer.stopAnalysis()
      setIsAnalyzing(false)
      setError(null)
    } catch (err) {
      console.error('Error stopping analysis:', err)
      setError('Failed to stop analysis')
    }
  }, [analyzer, isAnalyzing])
  
  // Toggle analysis
  const toggleAnalysis = useCallback(() => {
    if (isAnalyzing) {
      stopAnalysis()
    } else {
      startAnalysis()
    }
  }, [isAnalyzing, startAnalysis, stopAnalysis])
  
  // Get average values over time window
  const getAverageValues = useCallback((windowSize: number = 30) => {
    const recentFrames = analysisHistory.slice(-windowSize)
    if (recentFrames.length === 0) return null
    
    const sum = recentFrames.reduce((acc, frame) => ({
      tempo: acc.tempo + frame.tempo,
      energy: acc.energy + frame.rms,
      loudness: acc.loudness + frame.loudness,
      spectralCentroid: acc.spectralCentroid + frame.spectralCentroid,
      beatProbability: acc.beatProbability + frame.beatProbability
    }), {
      tempo: 0,
      energy: 0,
      loudness: 0,
      spectralCentroid: 0,
      beatProbability: 0
    })
    
    const count = recentFrames.length
    return {
      tempo: sum.tempo / count,
      energy: sum.energy / count,
      loudness: sum.loudness / count,
      spectralCentroid: sum.spectralCentroid / count,
      beatProbability: sum.beatProbability / count
    }
  }, [analysisHistory])
  
  // Get peak values
  const getPeakValues = useCallback((windowSize: number = 30) => {
    const recentFrames = analysisHistory.slice(-windowSize)
    if (recentFrames.length === 0) return null
    
    return {
      maxEnergy: Math.max(...recentFrames.map(f => f.rms)),
      maxLoudness: Math.max(...recentFrames.map(f => f.loudness)),
      maxOnset: Math.max(...recentFrames.map(f => f.onsetStrength)),
      beatCount: recentFrames.filter(f => f.beatProbability > 0.8).length
    }
  }, [analysisHistory])
  
  // Get spectral trends
  const getSpectralTrends = useCallback((windowSize: number = 60) => {
    const recentFrames = analysisHistory.slice(-windowSize)
    if (recentFrames.length < 2) return null
    
    const first = recentFrames[0]
    const last = recentFrames[recentFrames.length - 1]
    
    return {
      centroidDrift: last.spectralCentroid - first.spectralCentroid,
      energyTrend: last.rms - first.rms,
      bassEnergyTrend: last.spectralBandEnergy.bass - first.spectralBandEnergy.bass,
      highEnergyTrend: last.spectralBandEnergy.brilliance - first.spectralBandEnergy.brilliance
    }
  }, [analysisHistory])
  
  // Auto-start if requested
  useEffect(() => {
    if (autoStart && analyzer && !isAnalyzing) {
      startAnalysis()
    }
  }, [autoStart, analyzer, isAnalyzing, startAnalysis])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analyzer && isAnalyzing) {
        analyzer.stopAnalysis()
      }
    }
  }, [analyzer, isAnalyzing])
  
  return {
    // State
    isAnalyzing,
    currentAnalysis,
    analysisHistory,
    error,
    performance: performanceMetrics,
    
    // Actions
    startAnalysis,
    stopAnalysis,
    toggleAnalysis,
    
    // Analytics
    getAverageValues,
    getPeakValues,
    getSpectralTrends,
    
    // Status
    isReady: !!analyzer && !!source,
    historySize: analysisHistory.length
  }
}