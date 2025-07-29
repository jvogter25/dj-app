import React from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface DeckProps {
  deckId: 'A' | 'B'
  isPlaying: boolean
  onPlayPause: () => void
  onCue: () => void
  tempo: number
  onTempoChange: (tempo: number) => void
  loadedTrack?: {
    name: string
    artists: { name: string }[]
    album: { images: { url: string }[] }
  }
}

export const Deck: React.FC<DeckProps> = ({
  deckId,
  isPlaying,
  onPlayPause,
  onCue,
  tempo,
  onTempoChange,
  loadedTrack
}) => {
  const deckColor = deckId === 'A' ? 'blue' : 'green'
  
  return (
    <div className={`bg-gray-800 rounded-lg p-6 border-2 border-${deckColor}-500`}>
      <div className="mb-4">
        <h2 className={`text-2xl font-bold text-${deckColor}-400`}>Deck {deckId}</h2>
      </div>
      
      {/* Waveform Display */}
      <div className="bg-gray-900 h-32 rounded mb-4 flex items-center justify-center">
        <span className="text-gray-500">Waveform Display</span>
      </div>
      
      {/* Track Info */}
      <div className="mb-4">
        {loadedTrack ? (
          <>
            <div className="text-white font-semibold truncate">{loadedTrack.name}</div>
            <div className="text-gray-400 text-sm truncate">
              {loadedTrack.artists.map(a => a.name).join(', ')}
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
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Tempo</span>
          <span>{tempo > 0 ? '+' : ''}{tempo.toFixed(1)}%</span>
        </div>
        <input
          type="range"
          min="-10"
          max="10"
          step="0.1"
          value={tempo}
          onChange={(e) => onTempoChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
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