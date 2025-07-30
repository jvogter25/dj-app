import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { StemFile } from '../lib/cdnStorage'
import { useCDNStorage } from '../hooks/useCDNStorage'
import { EnhancedSlider } from './EnhancedSlider'

interface StemPlayerProps {
  stems: StemFile[]
  onStemToggle?: (stemId: string, enabled: boolean) => void
  className?: string
}

export const StemPlayer: React.FC<StemPlayerProps> = ({
  stems,
  onStemToggle,
  className = ''
}) => {
  const { getStemUrl } = useCDNStorage()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [stemStates, setStemStates] = useState<Record<string, {
    audio: HTMLAudioElement | null
    volume: number
    muted: boolean
    loaded: boolean
    error: boolean
  }>>({})
  
  const animationFrameRef = useRef<number | null>(null)
  const masterVolumeRef = useRef<number>(0.7)

  // Initialize audio elements for each stem
  useEffect(() => {
    const initializeStems = async () => {
      const newStates: typeof stemStates = {}
      
      for (const stem of stems) {
        const url = await getStemUrl(stem.filePath, 3600)
        if (url) {
          const audio = new Audio(url)
          audio.preload = 'metadata'
          audio.volume = 0.7
          
          // Set up event listeners
          audio.addEventListener('loadedmetadata', () => {
            setDuration(audio.duration)
            setStemStates(prev => ({
              ...prev,
              [stem.id]: { ...prev[stem.id], loaded: true }
            }))
          })
          
          audio.addEventListener('error', () => {
            setStemStates(prev => ({
              ...prev,
              [stem.id]: { ...prev[stem.id], error: true }
            }))
          })
          
          audio.addEventListener('ended', () => {
            setIsPlaying(false)
          })
          
          newStates[stem.id] = {
            audio,
            volume: 0.7,
            muted: false,
            loaded: false,
            error: false
          }
        } else {
          newStates[stem.id] = {
            audio: null,
            volume: 0.7,
            muted: false,
            loaded: false,
            error: true
          }
        }
      }
      
      setStemStates(newStates)
    }

    if (stems.length > 0) {
      initializeStems()
    }

    return () => {
      // Cleanup audio elements
      Object.values(stemStates).forEach(state => {
        if (state.audio) {
          state.audio.pause()
          state.audio.src = ''
        }
      })
    }
  }, [stems, getStemUrl])

  // Update time display
  const updateTime = useCallback(() => {
    const firstAudio = Object.values(stemStates).find(state => state.audio)?.audio
    if (firstAudio) {
      setCurrentTime(firstAudio.currentTime)
    }
    
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime)
    }
  }, [isPlaying, stemStates])

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, updateTime])

  // Play/pause all stems
  const togglePlayback = useCallback(() => {
    const audioElements = Object.values(stemStates)
      .filter(state => state.audio && state.loaded && !state.error)
      .map(state => state.audio!)

    if (audioElements.length === 0) return

    if (isPlaying) {
      audioElements.forEach(audio => audio.pause())
      setIsPlaying(false)
    } else {
      // Synchronize playback
      const promises = audioElements.map(audio => {
        audio.currentTime = currentTime
        return audio.play().catch(console.error)
      })
      
      Promise.all(promises).then(() => {
        setIsPlaying(true)
      }).catch(() => {
        console.error('Failed to start playback')
      })
    }
  }, [isPlaying, currentTime, stemStates])

  // Seek to position
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration

    Object.values(stemStates).forEach(state => {
      if (state.audio && state.loaded) {
        state.audio.currentTime = newTime
      }
    })

    setCurrentTime(newTime)
  }, [duration, stemStates])

  // Reset to beginning
  const handleReset = useCallback(() => {
    Object.values(stemStates).forEach(state => {
      if (state.audio) {
        state.audio.currentTime = 0
      }
    })
    setCurrentTime(0)
  }, [stemStates])

  // Skip backward/forward
  const handleSkip = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds))
    
    Object.values(stemStates).forEach(state => {
      if (state.audio && state.loaded) {
        state.audio.currentTime = newTime
      }
    })
    
    setCurrentTime(newTime)
  }, [currentTime, duration, stemStates])

  // Toggle stem mute
  const toggleStemMute = useCallback((stemId: string) => {
    setStemStates(prev => {
      const stemState = prev[stemId]
      if (!stemState?.audio) return prev

      const newMuted = !stemState.muted
      stemState.audio.volume = newMuted ? 0 : stemState.volume * masterVolumeRef.current

      onStemToggle?.(stemId, !newMuted)

      return {
        ...prev,
        [stemId]: { ...stemState, muted: newMuted }
      }
    })
  }, [onStemToggle])

  // Adjust stem volume
  const adjustStemVolume = useCallback((stemId: string, volume: number) => {
    setStemStates(prev => {
      const stemState = prev[stemId]
      if (!stemState?.audio) return prev

      stemState.audio.volume = stemState.muted ? 0 : volume * masterVolumeRef.current

      return {
        ...prev,
        [stemId]: { ...stemState, volume }
      }
    })
  }, [])

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get stem type color
  const getStemTypeColor = (stemType: StemFile['stemType']) => {
    const colors = {
      drums: 'bg-red-500',
      bass: 'bg-purple-500',
      vocals: 'bg-blue-500',
      other: 'bg-green-500',
      full: 'bg-yellow-500'
    }
    return colors[stemType] || 'bg-gray-500'
  }

  if (stems.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 text-center ${className}`}>
        <p className="text-gray-400">No stems available to play</p>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <Play className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-semibold">Stem Player</h3>
      </div>

      {/* Main Controls */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleReset}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Reset to beginning"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => handleSkip(-10)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Skip back 10s"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={togglePlayback}
          disabled={Object.values(stemStates).every(state => !state.loaded || state.error)}
          className={`p-3 rounded-lg transition-colors ${
            Object.values(stemStates).every(state => !state.loaded || state.error)
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </button>

        <button
          onClick={() => handleSkip(10)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Skip forward 10s"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm text-gray-400 ml-4">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        className="w-full h-2 bg-gray-700 rounded-full cursor-pointer mb-6"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-100"
          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      {/* Stem Controls */}
      <div className="space-y-3">
        {stems.map((stem) => {
          const stemState = stemStates[stem.id]
          if (!stemState) return null

          return (
            <div key={stem.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-4">
                {/* Stem Type Indicator */}
                <div className={`w-3 h-3 rounded-full ${getStemTypeColor(stem.stemType)}`} />
                
                {/* Stem Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white capitalize">
                      {stem.stemType}
                    </span>
                    {stemState.error && (
                      <span className="text-xs text-red-400">Error loading</span>
                    )}
                    {!stemState.loaded && !stemState.error && (
                      <span className="text-xs text-yellow-400">Loading...</span>
                    )}
                  </div>
                </div>
                
                {/* Volume Control */}
                <div className="flex items-center gap-2 w-32">
                  <button
                    onClick={() => toggleStemMute(stem.id)}
                    disabled={stemState.error || !stemState.loaded}
                    className={`p-1 rounded transition-colors ${
                      stemState.error || !stemState.loaded
                        ? 'text-gray-500 cursor-not-allowed'
                        : stemState.muted
                        ? 'text-red-400 hover:text-red-300'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {stemState.muted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  
                  <EnhancedSlider
                    min={0}
                    max={1}
                    step={0.01}
                    value={stemState.volume}
                    onChange={(value) => adjustStemVolume(stem.id, value)}
                    disabled={stemState.error || !stemState.loaded}
                    className="flex-1 h-1"
                    title={`${stem.stemType} volume - supports click-and-drag and trackpad gestures`}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Loading State */}
      {Object.values(stemStates).some(state => !state.loaded && !state.error) && (
        <div className="mt-4 text-center text-sm text-gray-400">
          Loading stems...
        </div>
      )}
    </div>
  )
}