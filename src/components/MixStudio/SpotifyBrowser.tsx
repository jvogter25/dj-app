import React, { useState, useEffect } from 'react'
import { Search, Music, AlertCircle, Info, Replace } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { AudioSource } from '../../types/mixStudio'

interface SpotifyBrowserProps {
  onTrackSelect: (source: AudioSource) => void
}

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string }[]
  }
  duration_ms: number
  preview_url: string | null
  uri: string
  audio_features?: {
    tempo?: number
    key?: number
    mode?: number
  }
}

export const SpotifyBrowser: React.FC<SpotifyBrowserProps> = ({ onTrackSelect }) => {
  const { spotifyToken } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInfo, setShowInfo] = useState(true)

  const searchTracks = async () => {
    if (!searchQuery.trim() || !spotifyToken) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${spotifyToken}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to search tracks')
      }

      const data = await response.json()
      setTracks(data.tracks.items)
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchTracks()
    }
  }

  const handleTrackSelect = (track: SpotifyTrack) => {
    const audioSource: AudioSource = {
      id: `spotify_${track.id}`,
      type: 'spotify',
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      duration: track.duration_ms / 1000,
      previewUrl: track.preview_url || undefined,
      metadata: {
        spotifyId: track.id,
        spotifyUri: track.uri,
        albumName: track.album.name,
        albumArt: track.album.images[0]?.url,
        tempo: track.audio_features?.tempo,
        key: track.audio_features?.key,
        mode: track.audio_features?.mode
      },
      isEditable: false // Spotify tracks are not editable
    }

    onTrackSelect(audioSource)
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Info Banner */}
      {showInfo && (
        <div className="bg-yellow-900/30 border border-yellow-700 p-3 mx-3 mt-3 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-400 mb-1">Spotify Tracks as Placeholders</h4>
              <p className="text-xs text-yellow-200/80">
                Due to licensing, Spotify tracks cannot be edited or exported. Use them as references 
                in your mix, then replace with local files before exporting.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Replace className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-yellow-300">
                  Right-click any placeholder to find similar replacements
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="text-yellow-400 hover:text-yellow-300 p-1"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search Spotify tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-9 pr-3 py-2 bg-gray-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <button
            onClick={searchTracks}
            disabled={loading || !searchQuery.trim()}
            className={`px-4 py-2 rounded transition-colors text-sm ${
              loading || !searchQuery.trim()
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-400 text-sm">Searching...</div>
          </div>
        ) : tracks.length > 0 ? (
          <div className="space-y-2">
            {tracks.map((track) => (
              <div
                key={track.id}
                draggable
                onDragStart={(e) => {
                  const source = {
                    id: `spotify_${track.id}`,
                    type: 'spotify',
                    name: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    duration: track.duration_ms / 1000,
                    previewUrl: track.preview_url || undefined,
                    isEditable: false,
                    metadata: {
                      spotifyId: track.id,
                      spotifyUri: track.uri,
                      albumName: track.album.name,
                      albumArt: track.album.images[0]?.url
                    }
                  }
                  e.dataTransfer.setData('audio-source', JSON.stringify(source))
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                className="p-3 bg-gray-700 rounded hover:bg-gray-600 cursor-move transition-all group"
              >
                <div className="flex items-center gap-3">
                  {/* Album Art */}
                  {track.album.images[2]?.url && (
                    <img
                      src={track.album.images[2].url}
                      alt={track.album.name}
                      className="w-10 h-10 rounded flex-shrink-0"
                    />
                  )}
                  
                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{track.name}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {track.artists.map(a => a.name).join(', ')} • {track.album.name}
                    </div>
                  </div>

                  {/* Duration & Indicators */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-400">
                      {formatDuration(track.duration_ms)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Music className="w-3 h-3 text-green-500" />
                      <span className="text-[10px] text-green-500">Spotify</span>
                    </div>
                    {!track.preview_url && (
                      <span className="text-[10px] text-yellow-500">No preview</span>
                    )}
                  </div>
                </div>

                {/* Placeholder indicator on hover */}
                <div className="mt-2 pt-2 border-t border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 text-xs text-yellow-400">
                    <AlertCircle className="w-3 h-3" />
                    <span>Will be added as placeholder - replace with local file later</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery && !loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No tracks found for "{searchQuery}"
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-2">Search for Spotify tracks to use as placeholders</p>
            <p className="text-xs">These will help you plan your mix structure</p>
          </div>
        )}
      </div>
    </div>
  )
}