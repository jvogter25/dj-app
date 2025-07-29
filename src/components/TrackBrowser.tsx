import React, { useState, useEffect, useCallback } from 'react'
import { Search, Music, Clock, Loader, List, User, Filter, Zap } from 'lucide-react'
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
  bpm?: number
  audio_features?: {
    tempo: number
    danceability: number
    energy: number
    key: number
    valence: number
  }
}

interface SpotifyPlaylist {
  id: string
  name: string
  images: { url: string }[]
  tracks: { total: number }
}

interface SpotifyArtist {
  id: string
  name: string
  images: { url: string }[]
  genres: string[]
}

type ViewMode = 'library' | 'playlists' | 'artists' | 'search'
type FilterType = 'all' | 'bpm' | 'artist' | 'title'

interface TrackBrowserProps {
  onTrackSelect: (track: SpotifyTrack, deck: 'A' | 'B') => void
}

export const TrackBrowser: React.FC<TrackBrowserProps> = ({ onTrackSelect }) => {
  const { spotifyToken } = useAuth()
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [artists, setArtists] = useState<SpotifyArtist[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeck, setSelectedDeck] = useState<'A' | 'B'>('A')
  const [viewMode, setViewMode] = useState<ViewMode>('library')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null)
  const [bpmFilter, setBpmFilter] = useState<{ min: number; max: number }>({ min: 60, max: 200 })
  const [apiError, setApiError] = useState<string | null>(null)

  // Cache for audio features to avoid repeated API calls
  const [audioFeaturesCache, setAudioFeaturesCache] = useState<Map<string, any>>(new Map())

  // Test Spotify API connection
  const testSpotifyAPI = useCallback(async () => {
    if (!spotifyToken) return

    try {
      console.log('Testing Spotify API connection...')
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Spotify API test failed:', response.status, errorText)
        setApiError(`API Error: ${response.status} - ${errorText}`)
        return
      }

      const user = await response.json()
      console.log('Spotify API test successful. User:', user)
      setApiError(null)
    } catch (error) {
      console.error('Spotify API test error:', error)
      setApiError(`Connection Error: ${error}`)
    }
  }, [spotifyToken])

  // Test API on token change
  useEffect(() => {
    if (spotifyToken) {
      testSpotifyAPI()
    }
  }, [spotifyToken, testSpotifyAPI])

  // Format duration from ms to mm:ss
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Get BPM color coding
  const getBpmColor = (bpm: number) => {
    if (bpm < 90) return 'text-blue-400'      // Slow
    if (bpm < 120) return 'text-green-400'    // Medium
    if (bpm < 140) return 'text-yellow-400'   // Fast
    return 'text-red-400'                     // Very fast
  }

  // Fetch audio features for tracks
  const fetchAudioFeatures = useCallback(async (trackIds: string[]) => {
    if (!spotifyToken || trackIds.length === 0) return
    
    try {
      console.log(`Fetching audio features for ${trackIds.length} tracks`)
      const response = await fetch(
        `https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`,
        {
          headers: {
            'Authorization': `Bearer ${spotifyToken}`
          }
        }
      )
      
      if (!response.ok) {
        console.error('Audio features API error:', response.status)
        // Don't throw error - continue without audio features
        return
      }
      
      const data = await response.json()
      const newCache = new Map(audioFeaturesCache)
      
      data.audio_features.forEach((features: any, index: number) => {
        if (features) {
          newCache.set(trackIds[index], features)
        }
      })
      
      setAudioFeaturesCache(newCache)
      console.log(`Cached audio features for ${data.audio_features.filter((f: any) => f).length} tracks`)
    } catch (error) {
      console.error('Error fetching audio features:', error)
      // Don't let audio features failure break track loading
    }
  }, [spotifyToken, audioFeaturesCache])

  // Fetch user's saved tracks
  const fetchUserTracks = async () => {
    if (!spotifyToken) {
      console.log('No Spotify token available')
      return
    }
    
    console.log('Fetching user tracks...')
    setLoading(true)
    try {
      const response = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Spotify API error:', response.status, errorText)
        throw new Error(`Failed to fetch tracks: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Spotify tracks response:', data)
      
      const trackList = data.items
        .map((item: any) => item.track)
        .filter((track: any) => track && track.id && track.name) // Ensure tracks have required fields
      console.log(`Loaded ${trackList.length} tracks`)
      setTracks(trackList)
      
      // Fetch audio features for these tracks
      if (trackList.length > 0) {
        const trackIds = trackList.map((track: SpotifyTrack) => track.id)
        await fetchAudioFeatures(trackIds)
      }
    } catch (error) {
      console.error('Error fetching tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch user's playlists
  const fetchPlaylists = async () => {
    if (!spotifyToken) return
    
    setLoading(true)
    try {
      const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch playlists')
      
      const data = await response.json()
      setPlaylists(data.items)
    } catch (error) {
      console.error('Error fetching playlists:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch tracks from a specific playlist
  const fetchPlaylistTracks = async (playlistId: string) => {
    if (!spotifyToken) return
    
    setLoading(true)
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${spotifyToken}`
          }
        }
      )
      
      if (!response.ok) throw new Error('Failed to fetch playlist tracks')
      
      const data = await response.json()
      const trackList = data.items
        .map((item: any) => item.track)
        .filter((track: any) => track && track.id && track.name) // Ensure tracks have required fields
      setTracks(trackList)
      
      // Fetch audio features for these tracks
      const trackIds = trackList.map((track: SpotifyTrack) => track.id)
      await fetchAudioFeatures(trackIds)
    } catch (error) {
      console.error('Error fetching playlist tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch user's top artists
  const fetchTopArtists = async () => {
    if (!spotifyToken) return
    
    setLoading(true)
    try {
      const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=50', {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch artists')
      
      const data = await response.json()
      setArtists(data.items)
    } catch (error) {
      console.error('Error fetching artists:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch tracks by artist
  const fetchArtistTracks = async (artistId: string) => {
    if (!spotifyToken) return
    
    setLoading(true)
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        {
          headers: {
            'Authorization': `Bearer ${spotifyToken}`
          }
        }
      )
      
      if (!response.ok) throw new Error('Failed to fetch artist tracks')
      
      const data = await response.json()
      setTracks(data.tracks)
      
      // Fetch audio features for these tracks
      const trackIds = data.tracks.map((track: SpotifyTrack) => track.id)
      await fetchAudioFeatures(trackIds)
    } catch (error) {
      console.error('Error fetching artist tracks:', error)
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
      const trackList = data.tracks.items
      setTracks(trackList)
      
      // Fetch audio features for search results
      const trackIds = trackList.map((track: SpotifyTrack) => track.id)
      await fetchAudioFeatures(trackIds)
    } catch (error) {
      console.error('Error searching tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter tracks based on current filters
  const getFilteredTracks = () => {
    let filtered = tracks

    // Apply search query filter
    if (searchQuery && viewMode !== 'search') {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(track => 
        track.name?.toLowerCase().includes(query) ||
        track.artists?.some(artist => artist.name?.toLowerCase().includes(query)) || false
      )
    }

    // Apply BPM filter
    if (filterType === 'bpm') {
      filtered = filtered.filter(track => {
        const features = audioFeaturesCache.get(track.id)
        if (!features) return false
        const bpm = Math.round(features.tempo)
        return bpm >= bpmFilter.min && bpm <= bpmFilter.max
      })
    }

    return filtered
  }

  // Get enriched track with BPM
  const getEnrichedTrack = (track: SpotifyTrack) => {
    const features = audioFeaturesCache.get(track.id)
    return {
      ...track,
      bpm: features ? Math.round(features.tempo) : undefined,
      audio_features: features
    }
  }

  useEffect(() => {
    console.log('TrackBrowser useEffect triggered:', { viewMode, spotifyToken: !!spotifyToken })
    if (viewMode === 'library') {
      fetchUserTracks()
    } else if (viewMode === 'playlists') {
      fetchPlaylists()
    } else if (viewMode === 'artists') {
      fetchTopArtists()
    }
  }, [spotifyToken, viewMode])

  useEffect(() => {
    if (viewMode === 'search') {
      const delayDebounce = setTimeout(() => {
        if (searchQuery) {
          searchTracks(searchQuery)
        }
      }, 300)
      return () => clearTimeout(delayDebounce)
    }
  }, [searchQuery, viewMode])

  return (
    <div className="bg-gray-800 rounded-lg p-6 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-4">Track Browser</h3>
        
        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setViewMode('library'); setSelectedPlaylist(null); setSelectedArtist(null) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'library' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Music className="w-4 h-4" />
            Library
          </button>
          <button
            onClick={() => { setViewMode('playlists'); setSelectedPlaylist(null); setSelectedArtist(null) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'playlists' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <List className="w-4 h-4" />
            Playlists
          </button>
          <button
            onClick={() => { setViewMode('artists'); setSelectedPlaylist(null); setSelectedArtist(null) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'artists' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <User className="w-4 h-4" />
            Artists
          </button>
          <button
            onClick={() => { setViewMode('search'); setSelectedPlaylist(null); setSelectedArtist(null) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'search' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>

        {/* Search Bar (for search mode or filtering) */}
        {(viewMode === 'search' || viewMode === 'library') && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={viewMode === 'search' ? "Search Spotify..." : "Filter library..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        )}

        {/* Filter Controls */}
        {(viewMode === 'library' || viewMode === 'search') && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilterType('all')}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Filter className="w-3 h-3" />
              All
            </button>
            <button
              onClick={() => setFilterType('bpm')}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                filterType === 'bpm' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Zap className="w-3 h-3" />
              BPM
            </button>
          </div>
        )}

        {/* BPM Range Filter */}
        {filterType === 'bpm' && (
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">BPM Range</span>
              <span className="text-sm text-gray-400">{bpmFilter.min} - {bpmFilter.max}</span>
            </div>
            <div className="flex gap-2">
              <input
                type="range"
                min="60"
                max="200"
                value={bpmFilter.min}
                onChange={(e) => setBpmFilter(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                className="flex-1"
              />
              <input
                type="range"
                min="60"
                max="200"
                value={bpmFilter.max}
                onChange={(e) => setBpmFilter(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                className="flex-1"
              />
            </div>
          </div>
        )}

        {/* API Error Display */}
        {apiError && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg">
            <div className="text-red-200 text-sm">{apiError}</div>
            <button
              onClick={testSpotifyAPI}
              className="mt-2 px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Manual Refresh Button */}
        {viewMode === 'library' && (
          <div className="mb-4">
            <button
              onClick={() => fetchUserTracks()}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh Library'}
            </button>
          </div>
        )}

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

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : viewMode === 'playlists' && !selectedPlaylist ? (
          /* Playlist Grid */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => { setSelectedPlaylist(playlist.id); fetchPlaylistTracks(playlist.id) }}
                className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 cursor-pointer transition-colors"
              >
                <img
                  src={playlist.images[0]?.url || '/placeholder-album.png'}
                  alt={playlist.name}
                  className="w-full aspect-square rounded mb-2"
                />
                <div className="text-sm font-semibold text-white truncate">{playlist.name}</div>
                <div className="text-xs text-gray-400">{playlist.tracks.total} tracks</div>
              </div>
            ))}
          </div>
        ) : viewMode === 'artists' && !selectedArtist ? (
          /* Artist Grid */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {artists.map((artist) => (
              <div
                key={artist.id}
                onClick={() => { setSelectedArtist(artist.id); fetchArtistTracks(artist.id) }}
                className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 cursor-pointer transition-colors"
              >
                <img
                  src={artist.images[0]?.url || '/placeholder-artist.png'}
                  alt={artist.name}
                  className="w-full aspect-square rounded-full mb-2"
                />
                <div className="text-sm font-semibold text-white truncate">{artist.name}</div>
                <div className="text-xs text-gray-400">{artist.genres.slice(0, 2).join(', ')}</div>
              </div>
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Music className="w-12 h-12 mx-auto mb-2" />
            <p>No tracks found</p>
          </div>
        ) : (
          /* Track List */
          <div className="space-y-2">
            {(selectedPlaylist || selectedArtist ? tracks : getFilteredTracks()).map((track) => {
              const enrichedTrack = getEnrichedTrack(track)
              return (
                <div
                  key={track.id}
                  onClick={() => onTrackSelect(enrichedTrack, selectedDeck)}
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
                      {track.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
                    </div>
                  </div>
                  
                  {/* BPM */}
                  {enrichedTrack.bpm && (
                    <div className={`text-sm font-mono ${getBpmColor(enrichedTrack.bpm)}`}>
                      {enrichedTrack.bpm} BPM
                    </div>
                  )}
                  
                  {/* Duration */}
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    {formatDuration(track.duration_ms)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Back Button for Playlist/Artist Views */}
        {(selectedPlaylist || selectedArtist) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setSelectedPlaylist(null)
                setSelectedArtist(null)
                setTracks([])
                if (viewMode === 'playlists') fetchPlaylists()
                if (viewMode === 'artists') fetchTopArtists()
              }}
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              ← Back to {viewMode}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}