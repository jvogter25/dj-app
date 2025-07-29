import React, { useState } from 'react'
import { Shuffle, Zap, Music, Waves, Layers } from 'lucide-react'

export type TransitionType = 'crossfade' | 'bassline_swap' | 'stutter_cut' | 'harmonic_blend' | 'stem_layer'

interface SmartTransitionProps {
  deckATempo?: number
  deckBTempo?: number
  deckAKey?: number
  deckBKey?: number
  onTransition: (type: TransitionType, duration: number) => void
}

export const SmartTransition: React.FC<SmartTransitionProps> = ({
  deckATempo,
  deckBTempo,
  deckAKey,
  deckBKey,
  onTransition
}) => {
  const [selectedTransition, setSelectedTransition] = useState<TransitionType>('crossfade')
  const [duration, setDuration] = useState(8) // beats

  const transitions = [
    { type: 'crossfade' as TransitionType, icon: Shuffle, name: 'Crossfade', color: 'bg-blue-600' },
    { type: 'bassline_swap' as TransitionType, icon: Waves, name: 'Bassline Swap', color: 'bg-purple-600' },
    { type: 'stutter_cut' as TransitionType, icon: Zap, name: 'Stutter Cut', color: 'bg-yellow-600' },
    { type: 'harmonic_blend' as TransitionType, icon: Music, name: 'Harmonic Blend', color: 'bg-green-600' },
    { type: 'stem_layer' as TransitionType, icon: Layers, name: 'Stem Layer', color: 'bg-pink-600' }
  ]

  // Calculate tempo match quality
  const getTempoMatch = () => {
    if (!deckATempo || !deckBTempo) return null
    const diff = Math.abs(deckATempo - deckBTempo)
    if (diff < 2) return { quality: 'perfect', color: 'text-green-400' }
    if (diff < 5) return { quality: 'good', color: 'text-yellow-400' }
    return { quality: 'challenging', color: 'text-red-400' }
  }

  // Calculate harmonic compatibility
  const getHarmonicMatch = () => {
    if (!deckAKey || !deckBKey) return null
    // Simplified Camelot wheel compatibility
    const compatible = Math.abs(deckAKey - deckBKey) <= 1 || Math.abs(deckAKey - deckBKey) === 11
    return compatible 
      ? { quality: 'compatible', color: 'text-green-400' }
      : { quality: 'clashing', color: 'text-yellow-400' }
  }

  const tempoMatch = getTempoMatch()
  const harmonicMatch = getHarmonicMatch()

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Shuffle className="w-5 h-5 text-purple-500" />
        Smart Transition
      </h3>

      {/* Compatibility Analysis */}
      <div className="mb-4 p-3 bg-gray-700 rounded-lg">
        <div className="text-sm space-y-2">
          {tempoMatch && (
            <div className="flex justify-between">
              <span className="text-gray-400">Tempo Match:</span>
              <span className={tempoMatch.color}>{tempoMatch.quality}</span>
            </div>
          )}
          {harmonicMatch && (
            <div className="flex justify-between">
              <span className="text-gray-400">Harmonic Match:</span>
              <span className={harmonicMatch.color}>{harmonicMatch.quality}</span>
            </div>
          )}
          {deckATempo && deckBTempo && (
            <div className="flex justify-between">
              <span className="text-gray-400">BPM:</span>
              <span className="text-gray-300">{deckATempo} → {deckBTempo}</span>
            </div>
          )}
        </div>
      </div>

      {/* Transition Types */}
      <div className="space-y-2 mb-4">
        {transitions.map(({ type, icon: Icon, name, color }) => (
          <button
            key={type}
            onClick={() => setSelectedTransition(type)}
            className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
              selectedTransition === type 
                ? `${color} text-white` 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{name}</span>
          </button>
        ))}
      </div>

      {/* Duration Control */}
      <div className="mb-4">
        <label className="text-sm text-gray-400 mb-2 block">Duration (beats)</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="4"
            max="32"
            step="4"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded">
            {duration}
          </span>
        </div>
      </div>

      {/* Execute Button */}
      <button
        onClick={() => onTransition(selectedTransition, duration)}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
      >
        Execute Transition
      </button>
    </div>
  )
}