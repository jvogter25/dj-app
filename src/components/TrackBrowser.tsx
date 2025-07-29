import React, { useState, useEffect } from 'react'
import { Search, Music, Clock, Loader } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string }[]
  }
  duration_ms: number
  uri: string
  preview_url: string | null
}

interface TrackBrowserProps {
  onTrackSelect: (track: SpotifyTrack, deck: 'A' | 'B') => void
}

export const TrackBrowser: React.FC<TrackBrowserProps> = ({ onTrackSelect }) => {
  const { spotifyToken } = useAuth()
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeck, setSelectedDeck] = useState<'A' | 'B'>('A')

  // Format duration from ms to mm:ss
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Fetch user's saved tracks
  const fetchUserTracks = async () => {
    if (!spotifyToken) return
    
    setLoading(true)
    try {
      const response = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch tracks')
      
      const data = await response.json()
      setTracks(data.items.map((item: any) => item.track))
    } catch (error) {
      console.error('Error fetching tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  // Search tracks
  const searchTracks = async (query: string) => {
    if (!spotifyToken || !query) {
      if (!query) fetchUserTracks()
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${spotifyToken}`
          }
        }
      )
      
      if (!response.ok) throw new Error('Failed to search tracks')
      
      const data = await response.json()
      setTracks(data.tracks.items)
    } catch (error) {
      console.error('Error searching tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserTracks()
  }, [spotifyToken])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery) {
        searchTracks(searchQuery)
      } else {
        fetchUserTracks()
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  return (
    <div className="bg-gray-800 rounded-lg p-6 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-4">Track Browser</h3>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Deck Selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedDeck('A')}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
              selectedDeck === 'A' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Load to Deck A
          </button>
          <button
            onClick={() => setSelectedDeck('B')}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
              selectedDeck === 'B' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Load to Deck B
          </button>
        </div>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Music className="w-12 h-12 mx-auto mb-2" />
            <p>No tracks found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onTrackSelect(track, selectedDeck)}
                className="flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors"
              >
                {/* Album Art */}
                <img
                  src={track.album.images[2]?.url || '/placeholder-album.png'}
                  alt={track.album.name}
                  className="w-12 h-12 rounded"
                />
                
                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">
                    {track.name}
                  </div>
                  <div className="text-sm text-gray-400 truncate">
                    {track.artists.map(a => a.name).join(', ')}
                  </div>
                </div>
                
                {/* Duration */}
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  {formatDuration(track.duration_ms)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}