import React, { useState } from 'react'
import { Deck } from './Deck'
import { Mixer } from './Mixer'
import { Library, Settings, Radio } from 'lucide-react'

export const DJInterface: React.FC = () => {
  const [deckAPlaying, setDeckAPlaying] = useState(false)
  const [deckBPlaying, setDeckBPlaying] = useState(false)
  const [deckATempo, setDeckATempo] = useState(0)
  const [deckBTempo, setDeckBTempo] = useState(0)
  const [crossfaderPosition, setCrossfaderPosition] = useState(0)
  const [channelAVolume, setChannelAVolume] = useState(75)
  const [channelBVolume, setChannelBVolume] = useState(75)

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
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <Library className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
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
                isPlaying={deckAPlaying}
                onPlayPause={() => setDeckAPlaying(!deckAPlaying)}
                onCue={() => console.log('Cue Deck A')}
                tempo={deckATempo}
                onTempoChange={setDeckATempo}
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
                isPlaying={deckBPlaying}
                onPlayPause={() => setDeckBPlaying(!deckBPlaying)}
                onCue={() => console.log('Cue Deck B')}
                tempo={deckBTempo}
                onTempoChange={setDeckBTempo}
              />
            </div>
          </div>

          {/* Bottom Section - Track Browser */}
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Track Browser</h3>
            <div className="bg-gray-900 rounded p-4 min-h-[200px] flex items-center justify-center">
              <p className="text-gray-500">Connect to Spotify to browse your library</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}