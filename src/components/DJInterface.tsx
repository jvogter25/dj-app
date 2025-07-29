import React, { useState } from 'react'
import { Deck } from './Deck'
import { Mixer } from './Mixer'
import { TrackBrowser } from './TrackBrowser'
import { GestureHelp } from './GestureHelp'
import { SmartTransition, TransitionType } from './SmartTransition'
import { LoopCapture } from './LoopCapture'
import { EffectsPanel, EffectSettings } from './EffectsPanel'
import ErrorBoundary from './ErrorBoundary'
import { Library, Settings, Radio, X, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePlayer } from '../contexts/PlayerContext'

export const DJInterface: React.FC = () => {
  const { signOut, spotifyToken, signInWithSpotify } = useAuth()
  const { 
    deckA, 
    deckB, 
    crossfaderPosition, 
    setCrossfaderPosition, 
    channelAVolume, 
    setChannelAVolume,
    channelBVolume, 
    setChannelBVolume
  } = usePlayer()
  // Tempo is now handled by the Web Audio players directly
  const [showLibrary, setShowLibrary] = useState(true)
  const [libraryExpanded, setLibraryExpanded] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [loadedTracks, setLoadedTracks] = useState<{ A?: any, B?: any }>({})
  
  // Effects state
  const [deckAEffects, setDeckAEffects] = useState<EffectSettings>({
    reverb: 0, delay: 0, filter: 0, bitcrush: 0, phaser: 0, flanger: 0
  })
  const [deckBEffects, setDeckBEffects] = useState<EffectSettings>({
    reverb: 0, delay: 0, filter: 0, bitcrush: 0, phaser: 0, flanger: 0
  })

  // Handle track loading to Spotify players
  const handleTrackSelect = async (track: any, deck: 'A' | 'B') => {
    console.log(`Loading ${track.name} to Deck ${deck}`)
    setLoadedTracks(prev => ({ ...prev, [deck]: track }))
    
    // Load to Spotify player using URI
    if (deck === 'A') {
      await deckA.loadTrack(track.uri)
    } else {
      await deckB.loadTrack(track.uri)
    }
  }

  // Handle smart transitions
  const handleTransition = (type: TransitionType, duration: number) => {
    console.log(`Executing ${type} transition for ${duration} beats`)
    // TODO: Implement actual transition logic
  }

  // Handle loop capture
  const handleLoopCapture = (deck: 'A' | 'B', start: number, end: number, trailOff: number) => {
    console.log(`Capturing loop on deck ${deck}: ${start}s - ${end}s with ${trailOff}s trail`)
    // TODO: Implement loop capture logic
  }

  // Handle effects
  const handleEffectChange = (deck: 'A' | 'B', effect: keyof EffectSettings, value: number) => {
    if (deck === 'A') {
      setDeckAEffects(prev => ({ ...prev, [effect]: value }))
    } else {
      setDeckBEffects(prev => ({ ...prev, [effect]: value }))
    }
    // TODO: Apply effects to audio
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="w-6 h-6 text-purple-500" />
            DJ Studio
          </h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowLibrary(!showLibrary)}
              className={`p-2 rounded-lg transition-colors ${
                showLibrary ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'
              }`}
              title="Toggle Library"
            >
              <Library className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'
              }`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Interface */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Top Section - Decks and Mixer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left Column - Deck A + Effects */}
            <div className="space-y-4">
              <Deck
                deckId="A"
                isPlaying={deckA.playerState.isPlaying}
                onPlayPause={deckA.togglePlay}
                onCue={deckA.cue}
                onSeek={deckA.seek}
                tempo={deckA.tempo}
                onTempoChange={deckA.setTempoAdjustment}
                loadedTrack={{
                  ...(deckA.playerState.currentTrack || loadedTracks.A),
                  isEnhanced: deckA.isEnhanced
                }}
                playerState={deckA.playerState}
              />
              <LoopCapture
                deckId="A"
                isPlaying={deckA.playerState.isPlaying}
                currentTime={deckA.playerState.position}
                onLoopCapture={(start, end, trail) => handleLoopCapture('A', start, end, trail)}
                onLoopToggle={(enabled) => console.log('Loop A:', enabled)}
              />
              <EffectsPanel
                deckId="A"
                effects={deckAEffects}
                onEffectChange={(effect, value) => handleEffectChange('A', effect, value)}
                onEffectToggle={(effect, enabled) => console.log(`Effect ${effect} on Deck A:`, enabled)}
              />
            </div>

            {/* Center Column - Mixer + Smart Transition */}
            <div className="space-y-4">
              <Mixer
                crossfaderPosition={crossfaderPosition}
                onCrossfaderChange={setCrossfaderPosition}
                channelAVolume={channelAVolume}
                channelBVolume={channelBVolume}
                onChannelVolumeChange={(channel, volume) => {
                  if (channel === 'A') {
                    setChannelAVolume(volume)
                  } else {
                    setChannelBVolume(volume)
                  }
                }}
              />
              <SmartTransition
                deckATempo={loadedTracks.A?.bpm}
                deckBTempo={loadedTracks.B?.bpm}
                deckAKey={loadedTracks.A?.audio_features?.key}
                deckBKey={loadedTracks.B?.audio_features?.key}
                onTransition={handleTransition}
              />
            </div>

            {/* Right Column - Deck B + Effects */}
            <div className="space-y-4">
              <Deck
                deckId="B"
                isPlaying={deckB.playerState.isPlaying}
                onPlayPause={deckB.togglePlay}
                onCue={deckB.cue}
                onSeek={deckB.seek}
                tempo={deckB.tempo}
                onTempoChange={deckB.setTempoAdjustment}
                loadedTrack={{
                  ...(deckB.playerState.currentTrack || loadedTracks.B),
                  isEnhanced: deckB.isEnhanced
                }}
                playerState={deckB.playerState}
              />
              <LoopCapture
                deckId="B"
                isPlaying={deckB.playerState.isPlaying}
                currentTime={deckB.playerState.position}
                onLoopCapture={(start, end, trail) => handleLoopCapture('B', start, end, trail)}
                onLoopToggle={(enabled) => console.log('Loop B:', enabled)}
              />
              <EffectsPanel
                deckId="B"
                effects={deckBEffects}
                onEffectChange={(effect, value) => handleEffectChange('B', effect, value)}
                onEffectToggle={(effect, enabled) => console.log(`Effect ${effect} on Deck B:`, enabled)}
              />
            </div>
          </div>

          {/* Bottom Section - Track Browser */}
          {showLibrary && (
            <div className="mt-6">
              <div className="bg-gray-800 rounded-lg">
                {/* Collapsible Header */}
                <button
                  onClick={() => setLibraryExpanded(!libraryExpanded)}
                  className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-700 transition-colors rounded-t-lg"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Library className="w-5 h-5 text-purple-500" />
                    Track Browser
                  </h3>
                  {libraryExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                {/* Collapsible Content */}
                {libraryExpanded && (
                  <div style={{ height: '400px' }}>
                    <ErrorBoundary
                      fallback={
                        <div className="p-6 h-full flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-red-400 mb-4">Error loading track browser</p>
                            <button
                              onClick={() => window.location.reload()}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
                            >
                              Reload Page
                            </button>
                          </div>
                        </div>
                      }
                    >
                      <TrackBrowser 
                        onTrackSelect={handleTrackSelect}
                      />
                    </ErrorBoundary>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Settings</h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 hover:bg-gray-700 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      signOut()
                      signInWithSpotify()
                    }}
                    className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    Refresh Spotify Connection
                  </button>
                  <button
                    onClick={signOut}
                    className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Gesture Help */}
          <GestureHelp />
        </div>
      </main>
    </div>
  )
}