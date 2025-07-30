import React, { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, Zap, Music, Cloud } from 'lucide-react'
import { useGestureControls, useJogWheel } from '../hooks/useGestureControls'
import { WaveformDisplay } from './WaveformDisplay'
import { waveformGenerator, WaveformData } from '../lib/waveformGenerator'
import { processedTracksService } from '../lib/processedTracksService'
import { EnhancedSlider, EnhancedKnob } from './EnhancedSlider'

interface DeckProps {
  deckId: 'A' | 'B'
  isPlaying: boolean
  onPlayPause: () => void
  onCue: () => void
  tempo: number
  onTempoChange: (tempo: number) => void
  onSeek?: (position: number) => void
  loadedTrack?: {
    id?: string
    name: string
    artists: { name: string }[]
    album: { images: { url: string }[] }
    bpm?: number
    isEnhanced?: boolean
    preview_url?: string
    spotify_id?: string
    source?: 'spotify' | 'soundcloud'
    uri?: string
  }
  playerState?: {
    position: number
    duration: number
    isReady: boolean
  }
  onEQChange?: (eq: { high: number; mid: number; low: number }) => void
  isEnhanced?: boolean
  onEnhancedToggle?: () => void
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
  playerState,
  onEQChange,
  isEnhanced = false,
  onEnhancedToggle
}) => {
  const deckColor = deckId === 'A' ? 'blue' : 'green'
  
  // EQ states
  const [highEQ, setHighEQ] = React.useState(0)
  const [midEQ, setMidEQ] = React.useState(0)
  const [lowEQ, setLowEQ] = React.useState(0)
  
  // Waveform state
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null)
  const [waveformLoading, setWaveformLoading] = useState(false)
  
  // Generate waveform when track loads
  useEffect(() => {
    const generateWaveform = async () => {
      if (!loadedTrack) {
        setWaveformData(null)
        return
      }
      
      setWaveformLoading(true)
      
      try {
        // First check if we have a processed track with waveform
        if (loadedTrack.spotify_id || loadedTrack.id) {
          const spotifyId = loadedTrack.spotify_id || loadedTrack.id
          
          // Check cache first
          const cachedWaveform = await waveformGenerator.getCachedWaveform(spotifyId!)
          if (cachedWaveform) {
            setWaveformData(cachedWaveform)
            setWaveformLoading(false)
            return
          }
          
          // Check processed tracks database
          const processedTrack = await processedTracksService.getProcessedTrack(spotifyId!)
          if (processedTrack?.waveform) {
            setWaveformData(processedTrack.waveform)
            // Cache it
            await waveformGenerator.cacheWaveform(spotifyId!, processedTrack.waveform)
            setWaveformLoading(false)
            return
          }
        }
        
        // For preview URLs (30 second clips), generate waveform
        if (loadedTrack.preview_url) {
          const waveform = await waveformGenerator.generateFromUrl(loadedTrack.preview_url)
          setWaveformData(waveform)
          
          // Cache if we have an ID
          if (loadedTrack.spotify_id || loadedTrack.id) {
            await waveformGenerator.cacheWaveform(loadedTrack.spotify_id || loadedTrack.id!, waveform)
          }
        } else {
          // No waveform available
          setWaveformData(null)
        }
      } catch (error) {
        console.error('Error generating waveform:', error)
        setWaveformData(null)
      } finally {
        setWaveformLoading(false)
      }
    }
    
    generateWaveform()
  }, [loadedTrack])
  
  // Remove individual gesture controls since EnhancedSlider handles this internally
  
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
    <div className={`bg-gray-800 rounded-lg p-3 sm:p-6 border-2 border-${deckColor}-500`}>
      <div className="mb-3 sm:mb-4 flex items-center justify-between">
        <h2 className={`text-lg sm:text-2xl font-bold text-${deckColor}-400`}>Deck {deckId}</h2>
        <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${playerState?.isReady ? 'bg-green-500' : 'bg-red-500'}`} 
             title={playerState?.isReady ? 'Player Ready' : 'Player Not Ready'} />
      </div>
      
      {/* Jog Wheel */}
      <div className="flex justify-center mb-3 sm:mb-4">
        <div 
          className={`w-24 h-24 sm:w-32 sm:h-32 bg-gray-900 rounded-full border-2 sm:border-4 border-${deckColor}-500 relative cursor-pointer touch-none select-none`}
          {...jogWheelGestures()}
        >
          <div className="absolute inset-1 sm:inset-2 bg-gray-800 rounded-full flex items-center justify-center">
            <div className={`w-0.5 h-6 sm:w-1 sm:h-8 bg-${deckColor}-400 rounded`} style={{ transform: `rotate(${(playerState?.position || 0) / 1000}rad)` }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] sm:text-xs text-gray-400 font-mono">JOG</span>
          </div>
        </div>
      </div>

      {/* Waveform Display */}
      <div className="mb-3 sm:mb-4 relative">
        {loadedTrack ? (
          <>
            <WaveformDisplay
              waveformData={waveformLoading ? null : waveformData}
              progress={progress / 100}
              height={64}
              color={deckColor === 'blue' ? '#3B82F6' : '#10B981'}
              progressColor={deckColor === 'blue' ? '#60A5FA' : '#34D399'}
              onSeek={(progress) => {
                if (onSeek && playerState) {
                  onSeek(progress * playerState.duration)
                }
              }}
              className="mb-2 sm:h-24"
            />
            
            {/* Time display overlay */}
            <div className="absolute bottom-1 left-1 sm:left-2 text-[10px] sm:text-xs text-white font-mono bg-black bg-opacity-50 px-1 rounded">
              {playerState ? formatTime(playerState.position) : '0:00'}
            </div>
            <div className="absolute bottom-1 right-1 sm:right-2 text-[10px] sm:text-xs text-white font-mono bg-black bg-opacity-50 px-1 rounded">
              {playerState ? formatTime(playerState.duration) : '0:00'}
            </div>
            
            {/* Status indicator */}
            {!playerState?.isReady && (
              <div className="absolute top-1 sm:top-2 left-1 sm:left-2 text-[10px] sm:text-xs text-yellow-400 bg-black bg-opacity-75 rounded px-1 sm:px-2 py-1">
                Activating Spotify device...
              </div>
            )}
            
            {/* No waveform indicator */}
            {!waveformLoading && !waveformData && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 rounded">
                <span className="text-gray-500 text-xs sm:text-sm">
                  {loadedTrack.preview_url ? 'Generating waveform...' : 'Waveform not available'}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="bg-gray-900 h-16 sm:h-24 rounded flex items-center justify-center">
            <span className="text-gray-500 text-xs sm:text-sm">No Track Loaded</span>
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
            <div className="flex items-center gap-2 mt-1">
              {loadedTrack.bpm && (
                <div className="text-xs text-gray-500">
                  BPM: <span className="text-purple-400 font-mono">{loadedTrack.bpm}</span>
                </div>
              )}
              {/* Source indicator */}
              {(loadedTrack.source || (loadedTrack.uri && loadedTrack.uri.includes('spotify'))) && (
                <div className="flex items-center gap-0.5">
                  {loadedTrack.source === 'soundcloud' || loadedTrack.uri?.includes('soundcloud') ? (
                    <>
                      <Cloud className="w-3 h-3 text-orange-500" />
                      <span className="text-orange-500 text-[10px]">SoundCloud</span>
                    </>
                  ) : (
                    <>
                      <Music className="w-3 h-3 text-green-500" />
                      <span className="text-green-500 text-[10px]">Spotify</span>
                    </>
                  )}
                </div>
              )}
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
          className={`p-3 bg-${deckColor}-600 hover:bg-${deckColor}-700 active:bg-${deckColor}-800 rounded-lg transition-all transform active:scale-95`}
          title="Cue (Reset to start)"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={onPlayPause}
          className={`p-3 bg-${deckColor}-600 hover:bg-${deckColor}-700 active:bg-${deckColor}-800 rounded-lg transition-all transform active:scale-95 flex-1`}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-5 h-5 mx-auto" /> : <Play className="w-5 h-5 mx-auto" />}
        </button>
      </div>
      
      {/* Tempo Slider */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Tempo</span>
          <div className="flex items-center gap-2">
            <span>{tempo > 0 ? '+' : ''}{tempo.toFixed(1)}%</span>
            {isEnhanced && (
              <span className="text-xs bg-yellow-600 px-1 rounded">ENHANCED</span>
            )}
            {loadedTrack?.preview_url && onEnhancedToggle && (
              <button
                onClick={onEnhancedToggle}
                className={`p-1 rounded transition-colors ${
                  isEnhanced 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
                }`}
                title={isEnhanced ? "Disable Enhanced Mode" : "Enable Enhanced Mode (Tempo Control)"}
              >
                <Zap className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <EnhancedSlider
          min={-50}
          max={100}
          step={1}
          value={tempo}
          onChange={onTempoChange}
          sensitivity={0.3}
          className="mb-1"
          title="Tempo control - supports click-and-drag and trackpad gestures"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>-50%</span>
          <span>0%</span>
          <span>+100%</span>
        </div>
      </div>
      
      {/* EQ Knobs */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { band: 'High', value: highEQ, setValue: setHighEQ, color: 'red' },
          { band: 'Mid', value: midEQ, setValue: setMidEQ, color: 'yellow' },
          { band: 'Low', value: lowEQ, setValue: setLowEQ, color: 'blue' }
        ].map(({ band, value, setValue, color: bandColor }) => (
          <EnhancedKnob
            key={band}
            min={-20}
            max={20}
            value={value}
            onChange={(newValue) => {
              setValue(newValue)
              console.log(`[${deckId}] ${band} EQ:`, newValue)
              
              // Update EQ in audio processor
              if (onEQChange) {
                const newEQ = {
                  high: band === 'High' ? newValue : highEQ,
                  mid: band === 'Mid' ? newValue : midEQ,
                  low: band === 'Low' ? newValue : lowEQ
                }
                onEQChange(newEQ)
              }
            }}
            sensitivity={0.5}
            size="md"
            color={bandColor}
            label={band}
            title={`${band} frequency adjustment - supports click-and-drag and trackpad gestures`}
          />
        ))}
      </div>
    </div>
  )
}