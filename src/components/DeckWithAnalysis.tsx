// Production Deck with Real-time Analysis Component
// Extends the Deck component with real-time audio analysis capabilities

import React, { useState, useEffect, useRef } from 'react'
import { Deck } from './Deck'
import { RealtimeAnalysisDisplay } from './RealtimeAnalysisDisplay'
import { useRealtimeAnalysis } from '../hooks/useRealtimeAnalysis'
import { EnhancedAnalysisPanel } from './EnhancedAnalysisPanel'
import { ChevronDown, ChevronUp, Activity } from 'lucide-react'

interface DeckWithAnalysisProps {
  deckId: 'A' | 'B'
  isPlaying: boolean
  onPlayPause: () => void
  onCue: () => void
  tempo: number
  onTempoChange: (tempo: number) => void
  onSeek?: (position: number) => void
  loadedTrack?: any
  playerState?: any
  onEQChange?: (eq: { high: number; mid: number; low: number }) => void
  isEnhanced?: boolean
  onEnhancedToggle?: () => void
  audioContext?: AudioContext
  audioSource?: AudioNode
  analysisResult?: any
}

export const DeckWithAnalysis: React.FC<DeckWithAnalysisProps> = ({
  deckId,
  audioContext,
  audioSource,
  analysisResult,
  ...deckProps
}) => {
  const [showRealtimeAnalysis, setShowRealtimeAnalysis] = useState(false)
  const [showEnhancedAnalysis, setShowEnhancedAnalysis] = useState(false)
  const [autoAnalyze, setAutoAnalyze] = useState(true)
  
  // Real-time analysis hook
  const {
    isAnalyzing,
    currentAnalysis,
    toggleAnalysis,
    getAverageValues,
    getPeakValues,
    getSpectralTrends,
    performance,
    isReady
  } = useRealtimeAnalysis({
    audioContext,
    source: audioSource,
    autoStart: autoAnalyze && deckProps.isPlaying,
    config: {
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      bufferSize: 4096
    }
  })
  
  // Auto-start/stop analysis based on playback
  useEffect(() => {
    if (autoAnalyze && isReady) {
      if (deckProps.isPlaying && !isAnalyzing) {
        toggleAnalysis()
      } else if (!deckProps.isPlaying && isAnalyzing) {
        toggleAnalysis()
      }
    }
  }, [deckProps.isPlaying, isAnalyzing, autoAnalyze, isReady, toggleAnalysis])
  
  // Update tempo from real-time analysis
  useEffect(() => {
    if (currentAnalysis && autoAnalyze && !deckProps.loadedTrack?.bpm) {
      const avgValues = getAverageValues(60) // 60 frames = ~1 second
      if (avgValues && avgValues.tempo > 0) {
        // Only update if significantly different from current tempo
        const tempoDiff = Math.abs(avgValues.tempo - deckProps.tempo)
        if (tempoDiff > 2) {
          deckProps.onTempoChange(Math.round(avgValues.tempo))
        }
      }
    }
  }, [currentAnalysis, autoAnalyze, getAverageValues, deckProps.tempo, deckProps.onTempoChange, deckProps.loadedTrack?.bpm])
  
  return (
    <div className="space-y-4">
      {/* Main Deck */}
      <Deck deckId={deckId} {...deckProps} />
      
      {/* Analysis Controls */}
      {deckProps.loadedTrack && (
        <div className="space-y-2">
          {/* Real-time Analysis Toggle */}
          <button
            onClick={() => setShowRealtimeAnalysis(!showRealtimeAnalysis)}
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Activity className={`h-4 w-4 ${isAnalyzing ? 'text-green-400 animate-pulse' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-white">Real-time Analysis</span>
              {isAnalyzing && (
                <span className="text-xs text-green-400">Active</span>
              )}
            </div>
            {showRealtimeAnalysis ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {/* Real-time Analysis Display */}
          {showRealtimeAnalysis && (
            <div className="animate-in slide-in-from-top duration-200">
              <RealtimeAnalysisDisplay
                analysis={currentAnalysis}
                isAnalyzing={isAnalyzing}
                onToggleAnalysis={isReady ? toggleAnalysis : undefined}
              />
              
              {/* Performance Metrics */}
              {isAnalyzing && (
                <div className="mt-2 p-2 bg-gray-800/50 rounded flex items-center justify-between text-xs text-gray-400">
                  <span>FPS: {performance.fps}</span>
                  <span>Latency: {performance.latency.toFixed(1)}ms</span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoAnalyze}
                      onChange={(e) => setAutoAnalyze(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    Auto-analyze
                  </label>
                </div>
              )}
            </div>
          )}
          
          {/* Enhanced Analysis Toggle */}
          {analysisResult && (
            <>
              <button
                onClick={() => setShowEnhancedAnalysis(!showEnhancedAnalysis)}
                className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-between"
              >
                <span className="text-sm font-medium text-white">Enhanced Analysis</span>
                {showEnhancedAnalysis ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {/* Enhanced Analysis Display */}
              {showEnhancedAnalysis && deckProps.loadedTrack?.id && (
                <div className="animate-in slide-in-from-top duration-200">
                  <EnhancedAnalysisPanel
                    trackId={deckProps.loadedTrack.id}
                    className="mt-2"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}