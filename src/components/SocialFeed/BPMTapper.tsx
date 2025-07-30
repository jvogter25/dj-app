// Production BPM Tapper Component
// Tap to detect BPM and find matching mixes

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Music, Activity, RotateCcw, Search, Info,
  Zap, TrendingUp, Clock, Play
} from 'lucide-react'

interface BPMTapperProps {
  onBPMDetected?: (bpm: number) => void
  onSearchByBPM?: (bpmRange: [number, number]) => void
  className?: string
}

export const BPMTapper: React.FC<BPMTapperProps> = ({
  onBPMDetected,
  onSearchByBPM,
  className = ''
}) => {
  const [taps, setTaps] = useState<number[]>([])
  const [currentBPM, setCurrentBPM] = useState<number | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [confidence, setConfidence] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const resetTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Calculate BPM from tap intervals
  const calculateBPM = useCallback((tapTimes: number[]) => {
    if (tapTimes.length < 2) return null

    const intervals: number[] = []
    for (let i = 1; i < tapTimes.length; i++) {
      intervals.push(tapTimes[i] - tapTimes[i - 1])
    }

    // Remove outliers (intervals that deviate too much)
    const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length
    const filteredIntervals = intervals.filter(
      interval => Math.abs(interval - avgInterval) < avgInterval * 0.3
    )

    if (filteredIntervals.length === 0) return null

    // Calculate average interval and convert to BPM
    const finalAvgInterval = filteredIntervals.reduce((a, b) => a + b) / filteredIntervals.length
    const bpm = Math.round(60000 / finalAvgInterval)

    // Calculate confidence based on consistency
    const variance = filteredIntervals.reduce((sum, interval) => 
      sum + Math.pow(interval - finalAvgInterval, 2), 0
    ) / filteredIntervals.length
    const stdDev = Math.sqrt(variance)
    const consistency = Math.max(0, 1 - (stdDev / finalAvgInterval))
    
    setConfidence(Math.round(consistency * 100))

    return bpm
  }, [])

  // Handle tap
  const handleTap = useCallback(() => {
    const now = Date.now()
    const newTaps = [...taps, now]

    // Keep only taps from last 5 seconds
    const recentTaps = newTaps.filter(tap => now - tap < 5000)
    setTaps(recentTaps)

    // Calculate BPM if we have enough taps
    if (recentTaps.length >= 3) {
      const bpm = calculateBPM(recentTaps)
      if (bpm && bpm >= 60 && bpm <= 200) {
        setCurrentBPM(bpm)
        onBPMDetected?.(bpm)
      }
    }

    // Reset after 2 seconds of no taps
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current)
    }
    resetTimeoutRef.current = setTimeout(() => {
      setTaps([])
      setConfidence(0)
    }, 2000)
  }, [taps, calculateBPM, onBPMDetected])

  // Keyboard listener
  useEffect(() => {
    if (!isListening) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        handleTap()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isListening, handleTap])

  // Reset
  const reset = () => {
    setTaps([])
    setCurrentBPM(null)
    setConfidence(0)
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current)
    }
  }

  // Search by BPM range
  const searchByBPM = () => {
    if (!currentBPM) return
    
    // Create a range around the detected BPM
    const tolerance = 5
    const range: [number, number] = [
      Math.max(60, currentBPM - tolerance),
      Math.min(200, currentBPM + tolerance)
    ]
    
    onSearchByBPM?.(range)
  }

  // Get tempo classification
  const getTempoClass = (bpm: number): { name: string; color: string } => {
    if (bpm < 70) return { name: 'Slow', color: 'text-blue-400' }
    if (bpm < 100) return { name: 'Downtempo', color: 'text-green-400' }
    if (bpm < 120) return { name: 'Moderate', color: 'text-yellow-400' }
    if (bpm < 140) return { name: 'Upbeat', color: 'text-orange-400' }
    if (bpm < 160) return { name: 'Fast', color: 'text-red-400' }
    return { name: 'Very Fast', color: 'text-purple-400' }
  }

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
      <div className="text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Activity className="h-6 w-6 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">BPM Tapper</h3>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <Info className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Info */}
        {showInfo && (
          <div className="mb-4 p-3 bg-gray-700 rounded-lg text-sm text-gray-300">
            <p>Tap the button or press spacebar to the beat.</p>
            <p className="mt-1">At least 3 taps needed for accurate detection.</p>
          </div>
        )}

        {/* BPM Display */}
        <div className="mb-6">
          {currentBPM ? (
            <div>
              <div className="text-5xl font-bold text-white mb-2">
                {currentBPM}
              </div>
              <div className="text-lg text-gray-400 mb-1">BPM</div>
              {confidence > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    <span className="text-gray-400">
                      {confidence}% confidence
                    </span>
                  </div>
                  <span className="text-gray-600">•</span>
                  <span className={getTempoClass(currentBPM).color}>
                    {getTempoClass(currentBPM).name}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-5xl font-bold text-gray-600 mb-2">
              ---
            </div>
          )}
        </div>

        {/* Tap Button */}
        <button
          onClick={handleTap}
          onMouseDown={() => setIsListening(true)}
          onMouseUp={() => setIsListening(false)}
          className={`w-32 h-32 rounded-full transition-all transform active:scale-95 ${
            isListening 
              ? 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/50' 
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <div className="flex flex-col items-center justify-center">
            <Music className={`h-12 w-12 text-white ${isListening ? 'animate-pulse' : ''}`} />
            <span className="text-white font-medium mt-2">TAP</span>
          </div>
        </button>

        {/* Tap Indicators */}
        <div className="flex items-center justify-center gap-1 mt-4 h-8">
          {taps.slice(-8).map((tap, index) => (
            <div
              key={index}
              className="w-2 h-2 bg-purple-500 rounded-full animate-ping"
              style={{
                animationDelay: `${index * 50}ms`,
                opacity: 1 - (index * 0.1)
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          
          <button
            onClick={searchByBPM}
            disabled={!currentBPM}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              currentBPM
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Search className="h-4 w-4" />
            Find Mixes
          </button>
        </div>

        {/* Common BPMs */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-3">Common BPMs by Genre</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { genre: 'House', bpm: 128 },
              { genre: 'Techno', bpm: 130 },
              { genre: 'Drum & Bass', bpm: 174 },
              { genre: 'Hip Hop', bpm: 85 },
              { genre: 'Dubstep', bpm: 140 },
              { genre: 'Trance', bpm: 138 }
            ].map(({ genre, bpm }) => (
              <button
                key={genre}
                onClick={() => {
                  setCurrentBPM(bpm)
                  onBPMDetected?.(bpm)
                }}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors"
              >
                <div className="font-medium">{genre}</div>
                <div className="text-xs text-gray-500">{bpm} BPM</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BPMTapper