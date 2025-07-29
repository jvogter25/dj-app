import React, { useState } from 'react'
import { Deck } from './Deck'
import { Mixer } from './Mixer'
import { TrackBrowser } from './TrackBrowser'
import { GestureHelp } from './GestureHelp'
import ErrorBoundary from './ErrorBoundary'
import { Library, Settings, Radio, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePlayer } from '../contexts/PlayerContext'

export const DJInterface: React.FC = () => {
  const { signOut, spotifyToken } = useAuth()
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
  const [showSettings, setShowSettings] = useState(false)
  const [loadedTracks, setLoadedTracks] = useState<{ A?: any, B?: any }>({})

  // Debug player state and auth
  console.log('Deck A state:', deckA.playerState)
  console.log('Deck B state:', deckB.playerState)
  console.log('Crossfader position:', crossfaderPosition)
  console.log('Auth state:', { spotifyToken: !!spotifyToken })

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Deck A */}
            <div className="lg:col-span-1">
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
            </div>

            {/* Mixer */}
            <div className="lg:col-span-1">
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
            </div>

            {/* Deck B */}
            <div className="lg:col-span-1">
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
            </div>
          </div>

          {/* Bottom Section - Track Browser */}
          {showLibrary && (
            <div className="mt-6 h-96">
              <ErrorBoundary
                fallback={
                  <div className="bg-gray-800 rounded-lg p-6 h-full flex items-center justify-center">
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