import React, { useState } from 'react'
import { Repeat, Save, Play, Square } from 'lucide-react'

interface LoopCaptureProps {
  deckId: 'A' | 'B'
  isPlaying: boolean
  currentTime: number
  onLoopCapture: (startTime: number, endTime: number, trailOff: number) => void
  onLoopToggle: (enabled: boolean) => void
}

export const LoopCapture: React.FC<LoopCaptureProps> = ({
  deckId,
  isPlaying,
  currentTime,
  onLoopCapture,
  onLoopToggle
}) => {
  const [loopStart, setLoopStart] = useState<number | null>(null)
  const [loopEnd, setLoopEnd] = useState<number | null>(null)
  const [loopLength, setLoopLength] = useState(4) // beats
  const [trailOff, setTrailOff] = useState(2) // seconds
  const [isLooping, setIsLooping] = useState(false)

  const loopLengths = [1, 2, 4, 8, 16, 32] // beats

  const handleSetLoopIn = () => {
    setLoopStart(currentTime)
    // Auto-set loop out based on loop length (assuming 128 BPM for now)
    const beatsPerSecond = 128 / 60
    setLoopEnd(currentTime + (loopLength / beatsPerSecond))
  }

  const handleSetLoopOut = () => {
    if (loopStart !== null) {
      setLoopEnd(currentTime)
    }
  }

  const handleLoopToggle = () => {
    if (loopStart !== null && loopEnd !== null) {
      setIsLooping(!isLooping)
      onLoopToggle(!isLooping)
    }
  }

  const handleSaveLoop = () => {
    if (loopStart !== null && loopEnd !== null) {
      onLoopCapture(loopStart, loopEnd, trailOff)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Repeat className="w-4 h-4 text-purple-500" />
        Loop Capture - Deck {deckId}
      </h4>

      {/* Loop Length Selector */}
      <div className="mb-3">
        <label className="text-xs text-gray-400 mb-1 block">Loop Length</label>
        <div className="grid grid-cols-6 gap-1">
          {loopLengths.map(length => (
            <button
              key={length}
              onClick={() => setLoopLength(length)}
              className={`py-1 text-xs rounded transition-colors ${
                loopLength === length 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {length}
            </button>
          ))}
        </div>
      </div>

      {/* Loop Controls */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={handleSetLoopIn}
          className="py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Square className="w-3 h-3" />
          Loop In
        </button>
        <button
          onClick={handleSetLoopOut}
          disabled={loopStart === null}
          className="py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Square className="w-3 h-3" />
          Loop Out
        </button>
      </div>

      {/* Loop Status */}
      {loopStart !== null && loopEnd !== null && (
        <div className="mb-3 p-2 bg-gray-700 rounded text-xs text-gray-300">
          Loop: {loopStart.toFixed(1)}s - {loopEnd.toFixed(1)}s ({(loopEnd - loopStart).toFixed(1)}s)
        </div>
      )}

      {/* Loop Toggle */}
      <button
        onClick={handleLoopToggle}
        disabled={loopStart === null || loopEnd === null}
        className={`w-full py-2 mb-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
          isLooping 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:opacity-50'
        }`}
      >
        {isLooping ? <Play className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
        {isLooping ? 'Loop Active' : 'Activate Loop'}
      </button>

      {/* Trail Off Control */}
      <div className="mb-3">
        <label className="text-xs text-gray-400 mb-1 block">
          Trail Off: {trailOff}s
        </label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={trailOff}
          onChange={(e) => setTrailOff(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Save Loop */}
      <button
        onClick={handleSaveLoop}
        disabled={loopStart === null || loopEnd === null}
        className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        Save Loop
      </button>
    </div>
  )
}