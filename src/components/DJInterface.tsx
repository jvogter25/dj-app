import React, { useState, useEffect } from 'react'
import { Deck } from './Deck'
import { Mixer } from './Mixer'
import { TrackBrowser } from './TrackBrowser'
import { SoundCloudBrowser } from './SoundCloudBrowser'
import { GestureHelp } from './GestureHelp'
import { SmartTransition, TransitionType } from './SmartTransition'
import { LoopCapture } from './LoopCapture'
import { EffectsPanel, EffectSettings } from './EffectsPanel'
import { SetupWizard } from './SetupWizard'
import { SmartQueue } from './SmartQueue'
import ErrorBoundary from './ErrorBoundary'
import { Library, Settings, Radio, X, ChevronUp, ChevronDown, HelpCircle, Music, Cloud } from 'lucide-react'
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
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [loadedTracks, setLoadedTracks] = useState<{ A?: any, B?: any }>({})
  const [trackSource, setTrackSource] = useState<'spotify' | 'soundcloud'>('spotify')
  
  // Effects state
  const [deckAEffects, setDeckAEffects] = useState<EffectSettings>({
    reverb: 0, delay: 0, filter: 0, bitcrush: 0, phaser: 0, flanger: 0
  })
  const [deckBEffects, setDeckBEffects] = useState<EffectSettings>({
    reverb: 0, delay: 0, filter: 0, bitcrush: 0, phaser: 0, flanger: 0
  })

  // Show setup wizard on first visit
  useEffect(() => {
    const hasSeenSetup = localStorage.getItem('djStudioSetupComplete')
    if (!hasSeenSetup) {
      setShowSetupWizard(true)
    }
  }, [])

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
          <div className="flex items-center gap-2">
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
              onClick={() => setShowSetupWizard(true)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              title="Help"
            >
              <HelpCircle className="w-5 h-5" />
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
                loadedTrack={loadedTracks.A ? {
                  ...loadedTracks.A,
                  isEnhanced: deckA.isEnhanced
                } : null}
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
                loadedTrack={loadedTracks.B ? {
                  ...loadedTracks.B,
                  isEnhanced: deckB.isEnhanced
                } : null}
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

          {/* Bottom Section - Track Browser & Smart Queue */}
          {showLibrary && (
            <div className="mt-6 space-y-4">
              {/* Smart Queue */}
              {loadedTracks.A && (
                <SmartQueue
                  currentTrack={loadedTracks.A}
                  onTrackSelect={handleTrackSelect}
                  targetDeck="B"
                />
              )}
              
              {/* Track Browser */}
              <div className="bg-gray-800 rounded-lg">
                {/* Collapsible Header with Source Switcher */}
                <div className="border-b border-gray-700">
                  <button
                    onClick={() => setLibraryExpanded(!libraryExpanded)}
                    className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-700 transition-colors"
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
                  
                  {/* Source Switcher */}
                  {libraryExpanded && (
                    <div className="flex border-t border-gray-700">
                      <button
                        onClick={() => setTrackSource('spotify')}
                        className={`flex-1 px-4 py-2 flex items-center justify-center gap-2 transition-colors ${
                          trackSource === 'spotify' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        <Music className="w-4 h-4" />
                        Spotify
                      </button>
                      <button
                        onClick={() => setTrackSource('soundcloud')}
                        className={`flex-1 px-4 py-2 flex items-center justify-center gap-2 transition-colors ${
                          trackSource === 'soundcloud' 
                            ? 'bg-orange-600 text-white' 
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        <Cloud className="w-4 h-4" />
                        SoundCloud
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Collapsible Content */}
                {libraryExpanded && (
                  <div style={{ height: '350px' }} className="overflow-hidden">
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
                      {trackSource === 'spotify' ? (
                        <TrackBrowser 
                          onTrackSelect={handleTrackSelect}
                        />
                      ) : (
                        <SoundCloudBrowser
                          onTrackSelect={handleTrackSelect}
                        />
                      )}
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
                  {/* Playback Status */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-purple-500" />
                      Playback Status
                    </h3>
                    <div className="text-sm space-y-2">
                      <p className="text-gray-300">
                        Deck A: {deckA.playerState.isReady ? 
                          <span className="text-green-400">✅ Ready</span> : 
                          <span className="text-yellow-400">⏳ Connecting...</span>}
                        {deckA.deviceId && (
                          <span className="text-xs text-gray-500 ml-2">ID: {deckA.deviceId.slice(0, 8)}...</span>
                        )}
                      </p>
                      <p className="text-gray-300">
                        Deck B: {deckB.playerState.isReady ? 
                          <span className="text-green-400">✅ Ready</span> : 
                          <span className="text-yellow-400">⏳ Connecting...</span>}
                        {deckB.deviceId && (
                          <span className="text-xs text-gray-500 ml-2">ID: {deckB.deviceId.slice(0, 8)}...</span>
                        )}
                      </p>
                    </div>
                    <div className="mt-3 p-2 bg-gray-800 rounded text-xs">
                      <p className="text-yellow-400 font-semibold mb-1">⚠️ Troubleshooting Tips:</p>
                      <ul className="text-gray-400 space-y-1 ml-4 list-disc">
                        <li>Pause Spotify on all other devices first</li>
                        <li>Refresh page if players don't connect</li>
                        <li>Check browser console for errors (F12)</li>
                        <li>Premium account required for playback</li>
                      </ul>
                    </div>
                  </div>

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

          {/* Setup Wizard */}
          {showSetupWizard && (
            <SetupWizard 
              onClose={() => {
                setShowSetupWizard(false)
                localStorage.setItem('djStudioSetupComplete', 'true')
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}