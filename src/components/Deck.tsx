import React from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { useGestureControls, useJogWheel } from '../hooks/useGestureControls'

interface DeckProps {
  deckId: 'A' | 'B'
  isPlaying: boolean
  onPlayPause: () => void
  onCue: () => void
  tempo: number
  onTempoChange: (tempo: number) => void
  onSeek?: (position: number) => void
  loadedTrack?: {
    name: string
    artists: { name: string }[]
    album: { images: { url: string }[] }
  }
  playerState?: {
    position: number
    duration: number
    isReady: boolean
  }
}

export const Deck: React.FC<DeckProps> = ({
  deckId,
  isPlaying,
  onPlayPause,
  onCue,
  tempo,
  onTempoChange,
  onSeek,
  loadedTrack,
  playerState
}) => {
  const deckColor = deckId === 'A' ? 'blue' : 'green'
  
  // Gesture controls for tempo slider
  const tempoGestures = useGestureControls({
    min: -10,
    max: 10,
    value: tempo,
    onChange: onTempoChange,
    sensitivity: 0.3
  })
  
  // Jog wheel for scratching/nudging
  const jogWheelGestures = useJogWheel((delta) => {
    if (onSeek && playerState) {
      // Convert rotation to time adjustment (in milliseconds)
      const timeAdjustment = delta * 1000 // 1 second per radian
      const newPosition = Math.max(0, Math.min(playerState.duration, playerState.position + timeAdjustment))
      onSeek(newPosition)
    }
  })
  
  // Calculate progress percentage
  const progress = playerState && playerState.duration > 0 
    ? (playerState.position / playerState.duration) * 100 
    : 0
  
  // Format time display
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  return (
    <div className={`bg-gray-800 rounded-lg p-6 border-2 border-${deckColor}-500`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`text-2xl font-bold text-${deckColor}-400`}>Deck {deckId}</h2>
        <div className={`w-3 h-3 rounded-full ${playerState?.isReady ? 'bg-green-500' : 'bg-red-500'}`} 
             title={playerState?.isReady ? 'Player Ready' : 'Player Not Ready'} />
      </div>
      
      {/* Jog Wheel */}
      <div className="flex justify-center mb-4">
        <div 
          className={`w-32 h-32 bg-gray-900 rounded-full border-4 border-${deckColor}-500 relative cursor-pointer touch-none select-none`}
          {...jogWheelGestures()}
        >
          <div className="absolute inset-2 bg-gray-800 rounded-full flex items-center justify-center">
            <div className={`w-1 h-8 bg-${deckColor}-400 rounded`} style={{ transform: `rotate(${(playerState?.position || 0) / 1000}rad)` }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-gray-400 font-mono">JOG</span>
          </div>
        </div>
      </div>

      {/* Waveform Display */}
      <div className="bg-gray-900 h-24 rounded mb-4 relative overflow-hidden">
        {loadedTrack ? (
          <>
            {/* Progress bar */}
            <div 
              className={`absolute top-0 left-0 h-full bg-${deckColor}-500 opacity-20 transition-all duration-100`}
              style={{ width: `${progress}%` }}
            />
            {/* Time display */}
            <div className="absolute bottom-1 left-2 text-xs text-gray-400">
              {playerState ? formatTime(playerState.position) : '0:00'}
            </div>
            <div className="absolute bottom-1 right-2 text-xs text-gray-400">
              {playerState ? formatTime(playerState.duration) : '0:00'}
            </div>
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-500 text-sm">Waveform Loading...</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-500 text-sm">No Track Loaded</span>
          </div>
        )}
      </div>
      
      {/* Track Info */}
      <div className="mb-4">
        {loadedTrack ? (
          <>
            <div className="text-white font-semibold truncate">{loadedTrack.name}</div>
            <div className="text-gray-400 text-sm truncate">
              {loadedTrack.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
            </div>
          </>
        ) : (
          <>
            <div className="text-white font-semibold">No Track Loaded</div>
            <div className="text-gray-400 text-sm">Select a track to begin</div>
          </>
        )}
      </div>
      
      {/* Transport Controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={onCue}
          className={`p-3 bg-${deckColor}-600 hover:bg-${deckColor}-700 rounded-lg transition-colors`}
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={onPlayPause}
          className={`p-3 bg-${deckColor}-600 hover:bg-${deckColor}-700 rounded-lg transition-colors flex-1`}
        >
          {isPlaying ? <Pause className="w-5 h-5 mx-auto" /> : <Play className="w-5 h-5 mx-auto" />}
        </button>
      </div>
      
      {/* Tempo Slider */}
      <div className="mb-4 touch-none" {...tempoGestures()}>
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Tempo</span>
          <div className="flex items-center gap-2">
            <span>{tempo > 0 ? '+' : ''}{tempo.toFixed(1)}%</span>
            {(loadedTrack as any)?.isEnhanced && (
              <span className="text-xs bg-yellow-600 px-1 rounded">ENHANCED</span>
            )}
          </div>
        </div>
        <input
          type="range"
          min="-50"
          max="100"
          step="1"
          value={tempo}
          onChange={(e) => onTempoChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>-50%</span>
          <span>0%</span>
          <span>+100%</span>
        </div>
      </div>
      
      {/* EQ Knobs */}
      <div className="grid grid-cols-3 gap-2">
        {['High', 'Mid', 'Low'].map((band) => (
          <div key={band} className="text-center">
            <div className="w-12 h-12 bg-gray-700 rounded-full mx-auto mb-1 flex items-center justify-center">
              <div className="w-2 h-6 bg-gray-400 rounded"></div>
            </div>
            <span className="text-xs text-gray-400">{band}</span>
          </div>
        ))}
      </div>
    </div>
  )
}