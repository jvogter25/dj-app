import React, { useState, useEffect, useCallback } from 'react'
import { Search, Music, Clock, Loader, List, User, Filter, Zap, History, Activity, Smile } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { spotifyAuthPKCE } from '../lib/spotifyPKCE'
import { trackDB, TrackAnalysis } from '../lib/trackDatabase'
import { getCamelotKey, getCamelotColor, getKeyName } from '../lib/harmonicMixing'

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

type ViewMode = 'library' | 'recent' | 'playlists' | 'artists' | 'search'
type FilterType = 'all' | 'bpm' | 'artist' | 'title'

interface TrackBrowserProps {
  onTrackSelect: (track: SpotifyTrack, deck: 'A' | 'B') => void
}

export const TrackBrowser: React.FC<TrackBrowserProps> = ({ onTrackSelect }) => {
  const { spotifyToken, refreshSpotifyToken, refreshing } = useAuth()
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
  const [retryCount, setRetryCount] = useState(0)

  // Cache for audio features to avoid repeated API calls
  const [audioFeaturesCache, setAudioFeaturesCache] = useState<Map<string, any>>(new Map())

  // Helper function to make Spotify API calls with automatic token refresh
  const spotifyFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!spotifyToken) {
      throw new Error('No Spotify token available')
    }

    const makeRequest = async (token: string) => {
      return await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        }
      })
    }

    let response = await makeRequest(spotifyToken)
    
    // If we get a 401, try to refresh the token once
    if (response.status === 401 && retryCount === 0) {
      console.log('Got 401, attempting to refresh token...')
      setRetryCount(1)
      const refreshSuccess = await refreshSpotifyToken()
      
      if (refreshSuccess) {
        // Get the new token from storage since state might not be updated yet
        const newToken = await spotifyAuthPKCE.getStoredToken()
        if (newToken) {
          response = await makeRequest(newToken)
        }
      }
      setRetryCount(0)
    }
    
    return response
  }, [spotifyToken, refreshSpotifyToken, retryCount])

  // Test Spotify API connection
  const testSpotifyAPI = useCallback(async () => {
    if (!spotifyToken) return

    try {
      console.log('Testing Spotify API connection...')
      const response = await spotifyFetch('https://api.spotify.com/v1/me')

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
  }, [spotifyToken, spotifyFetch])

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
  const fetchAudioFeatures = useCallback(async (trackIds: string[], trackData?: SpotifyTrack[]) => {
    if (!spotifyToken || trackIds.length === 0) return
    
    try {
      console.log(`Fetching audio features for ${trackIds.length} tracks`)
      
      // Check cache first
      const uncachedIds: string[] = []
      const cachedFeatures = new Map()
      
      for (const id of trackIds) {
        const cached = await trackDB.getTrack(id)
        if (cached && cached.analyzedAt > Date.now() - 30 * 24 * 60 * 60 * 1000) { // 30 days cache
          cachedFeatures.set(id, cached)
        } else {
          uncachedIds.push(id)
        }
      }
      
      console.log(`Found ${cachedFeatures.size} cached, fetching ${uncachedIds.length} new`)
      
      if (uncachedIds.length > 0) {
        const response = await spotifyFetch(
          `https://api.spotify.com/v1/audio-features?ids=${uncachedIds.join(',')}`
        )
        
        if (!response.ok) {
          console.error('Audio features API error:', response.status)
          return
        }
        
        const data = await response.json()
        const newCache = new Map(audioFeaturesCache)
        
        if (data.audio_features) {
          for (let i = 0; i < data.audio_features.length; i++) {
            const features = data.audio_features[i]
            if (features) {
              const trackId = uncachedIds[i]
              newCache.set(trackId, features)
              
              // Save to IndexedDB if we have track data
              if (trackData) {
                const track = trackData.find(t => t.id === trackId)
                if (track) {
                  const analysis: TrackAnalysis = {
                    id: trackId,
                    uri: track.uri,
                    name: track.name,
                    artists: track.artists.map(a => a.name),
                    album: track.album.name,
                    duration: track.duration_ms,
                    analyzedAt: Date.now(),
                    ...features,
                    camelotKey: getCamelotKey(features.key, features.mode),
                    energyLevel: features.energy < 0.4 ? 'low' : features.energy < 0.7 ? 'medium' : 'high',
                    moodCategory: features.valence < 0.3 ? 'dark' : features.valence < 0.7 ? 'neutral' : 'bright'
                  }
                  await trackDB.saveTrack(analysis)
                }
              }
            }
          }
        }
        
        // Merge cached and new features
        cachedFeatures.forEach((features, id) => {
          newCache.set(id, features)
        })
        
        setAudioFeaturesCache(newCache)
        console.log(`Total audio features cached: ${newCache.size}`)
      } else {
        // All from cache
        setAudioFeaturesCache(cachedFeatures)
      }
    } catch (error) {
      console.error('Error fetching audio features:', error)
    }
  }, [spotifyToken, audioFeaturesCache, spotifyFetch])

  // Fetch user's saved tracks
  const fetchUserTracks = useCallback(async () => {
    if (!spotifyToken) {
      console.log('No Spotify token available')
      return
    }
    
    console.log('Fetching user tracks...')
    setLoading(true)
    setApiError(null) // Clear any previous errors
    
    try {
      const response = await spotifyFetch('https://api.spotify.com/v1/me/tracks?limit=50')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Spotify API error:', response.status, errorText)
        setApiError(`Failed to fetch tracks: ${response.status}`)
        return
      }
      
      const data = await response.json()
      console.log('Spotify tracks response:', data)
      
      const trackList = data.items
        .map((item: any) => item.track)
        .filter((track: any) => track && track.id && track.name) // Ensure tracks have required fields
      console.log(`Loaded ${trackList.length} tracks`)
      setTracks(trackList)
      setApiError(null) // Clear error on success
      
      // Fetch audio features for these tracks
      if (trackList.length > 0) {
        const trackIds = trackList.map((track: SpotifyTrack) => track.id)
        await fetchAudioFeatures(trackIds, trackList)
      }
    } catch (error) {
      console.error('Error fetching tracks:', error)
      setApiError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [spotifyToken, spotifyFetch, fetchAudioFeatures])

  // Fetch recently played tracks
  const fetchRecentlyPlayed = useCallback(async () => {
    if (!spotifyToken) {
      console.log('No Spotify token available')
      return
    }
    
    console.log('Fetching recently played tracks...')
    setLoading(true)
    setApiError(null)
    
    try {
      const response = await spotifyFetch('https://api.spotify.com/v1/me/player/recently-played?limit=50')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Spotify API error:', response.status, errorText)
        setApiError(`Failed to fetch recent tracks: ${response.status}`)
        return
      }
      
      const data = await response.json()
      console.log('Recently played response:', data)
      
      // Extract unique tracks (remove duplicates)
      const uniqueTracks = new Map()
      data.items.forEach((item: any) => {
        if (item.track && item.track.id) {
          uniqueTracks.set(item.track.id, item.track)
        }
      })
      
      const trackList = Array.from(uniqueTracks.values())
        .filter((track: any) => track && track.id && track.name)
      
      console.log(`Loaded ${trackList.length} recent tracks`)
      setTracks(trackList)
      setApiError(null)
      
      // Fetch audio features for these tracks
      if (trackList.length > 0) {
        const trackIds = trackList.map((track: SpotifyTrack) => track.id)
        await fetchAudioFeatures(trackIds, trackList)
      }
    } catch (error) {
      console.error('Error fetching recent tracks:', error)
      setApiError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [spotifyToken, spotifyFetch, fetchAudioFeatures])

  // Fetch user's playlists
  const fetchPlaylists = useCallback(async () => {
    if (!spotifyToken) {
      console.log('fetchPlaylists: No token available')
      return
    }
    
    console.log('fetchPlaylists called - starting playlist fetch')
    setLoading(true)
    setApiError(null)
    setPlaylists([]) // Clear old playlists to prevent stale data
    
    try {
      console.log('Making API request to fetch playlists...')
      const response = await spotifyFetch('https://api.spotify.com/v1/me/playlists?limit=50')
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to fetch playlists:', response.status, errorText)
        setApiError(`Failed to fetch playlists: ${response.status}`)
        return
      }
      
      const data = await response.json()
      console.log('Playlists API response:', data)
      console.log('Playlists items:', data.items)
      console.log(`Loaded ${data.items?.length || 0} playlists`)
      
      if (data.items && Array.isArray(data.items)) {
        console.log('Setting playlists state with items:', data.items)
        setPlaylists(data.items)
      } else {
        console.warn('No items array in response')
        setPlaylists([])
      }
      setApiError(null)
    } catch (error) {
      console.error('Error fetching playlists:', error)
      setApiError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setPlaylists([]) // Ensure empty array on error
    } finally {
      console.log('fetchPlaylists complete, loading set to false')
      setLoading(false)
    }
  }, [spotifyToken, spotifyFetch])

  // Fetch tracks from a specific playlist
  const fetchPlaylistTracks = useCallback(async (playlistId: string) => {
    if (!spotifyToken) return
    
    setLoading(true)
    setApiError(null)
    
    try {
      const response = await spotifyFetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to fetch playlist tracks:', response.status, errorText)
        setApiError(`Failed to fetch playlist tracks: ${response.status}`)
        return
      }
      
      const data = await response.json()
      const trackList = data.items
        .map((item: any) => item.track)
        .filter((track: any) => track && track.id && track.name) // Ensure tracks have required fields
      setTracks(trackList || [])
      setApiError(null)
      
      // Fetch audio features for these tracks
      if (trackList.length > 0) {
        const trackIds = trackList.map((track: SpotifyTrack) => track.id)
        await fetchAudioFeatures(trackIds, trackList)
      }
    } catch (error) {
      console.error('Error fetching playlist tracks:', error)
      setApiError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTracks([])
    } finally {
      setLoading(false)
    }
  }, [spotifyToken, spotifyFetch, fetchAudioFeatures])

  // Fetch user's top artists
  const fetchTopArtists = useCallback(async () => {
    if (!spotifyToken) return
    
    setLoading(true)
    setApiError(null)
    setArtists([])
    
    try {
      const response = await spotifyFetch('https://api.spotify.com/v1/me/top/artists?limit=50')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to fetch artists:', response.status, errorText)
        setApiError(`Failed to fetch artists: ${response.status}`)
        return
      }
      
      const data = await response.json()
      console.log(`Loaded ${data.items?.length || 0} artists`)
      setArtists(data.items || [])
      setApiError(null)
    } catch (error) {
      console.error('Error fetching artists:', error)
      setApiError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setArtists([])
    } finally {
      setLoading(false)
    }
  }, [spotifyToken, spotifyFetch])

  // Fetch tracks by artist
  const fetchArtistTracks = useCallback(async (artistId: string) => {
    if (!spotifyToken) return
    
    setLoading(true)
    setApiError(null)
    
    try {
      const response = await spotifyFetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to fetch artist tracks:', response.status, errorText)
        setApiError(`Failed to fetch artist tracks: ${response.status}`)
        return
      }
      
      const data = await response.json()
      setTracks(data.tracks || [])
      setApiError(null)
      
      // Fetch audio features for these tracks
      if (data.tracks?.length > 0) {
        const trackIds = data.tracks.map((track: SpotifyTrack) => track.id)
        await fetchAudioFeatures(trackIds)
      }
    } catch (error) {
      console.error('Error fetching artist tracks:', error)
      setApiError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTracks([])
    } finally {
      setLoading(false)
    }
  }, [spotifyToken, spotifyFetch, fetchAudioFeatures])

  // Search tracks
  const searchTracks = useCallback(async (query: string) => {
    if (!spotifyToken || !query) {
      if (!query) fetchUserTracks()
      return
    }
    
    setLoading(true)
    setApiError(null)
    
    try {
      const response = await spotifyFetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=50`
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to search tracks:', response.status, errorText)
        setApiError(`Failed to search tracks: ${response.status}`)
        return
      }
      
      const data = await response.json()
      const trackList = data.tracks?.items || []
      setTracks(trackList)
      setApiError(null)
      
      // Fetch audio features for search results
      if (trackList.length > 0) {
        const trackIds = trackList.map((track: SpotifyTrack) => track.id)
        await fetchAudioFeatures(trackIds)
      }
    } catch (error) {
      console.error('Error searching tracks:', error)
      setApiError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTracks([])
    } finally {
      setLoading(false)
    }
  }, [spotifyToken, spotifyFetch, fetchAudioFeatures, fetchUserTracks])

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

  // Get enriched track with BPM and other features
  const getEnrichedTrack = (track: SpotifyTrack) => {
    const features = audioFeaturesCache.get(track.id)
    return {
      ...track,
      bpm: features ? Math.round(features.tempo) : undefined,
      audio_features: features,
      camelotKey: features ? getCamelotKey(features.key, features.mode) : undefined,
      energy: features?.energy,
      valence: features?.valence,
      source: 'spotify' as const
    }
  }

  useEffect(() => {
    console.log('TrackBrowser useEffect triggered:', { viewMode, spotifyToken: !!spotifyToken })
    if (!spotifyToken) {
      console.log('No token available, skipping fetch')
      return
    }
    
    if (viewMode === 'library') {
      fetchUserTracks()
    } else if (viewMode === 'recent') {
      fetchRecentlyPlayed()
    } else if (viewMode === 'playlists') {
      fetchPlaylists()
    } else if (viewMode === 'artists') {
      fetchTopArtists()
    }
  }, [spotifyToken, viewMode, fetchUserTracks, fetchRecentlyPlayed, fetchPlaylists, fetchTopArtists])

  useEffect(() => {
    if (viewMode === 'search') {
      const delayDebounce = setTimeout(() => {
        if (searchQuery) {
          searchTracks(searchQuery)
        }
      }, 300)
      return () => clearTimeout(delayDebounce)
    }
  }, [searchQuery, viewMode, searchTracks])

  // Show connection prompt if no token
  if (!spotifyToken) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 h-full flex flex-col items-center justify-center">
        <Music className="w-12 h-12 text-gray-500 mb-4" />
        <p className="text-gray-400 mb-4">No Spotify connection</p>
        <p className="text-sm text-gray-500 text-center mb-4">
          Please refresh your Spotify connection to load your library
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0">
        <h3 className="sr-only">Track Browser</h3>
        
        {/* View Mode Tabs */}
        <div className="flex gap-1 mb-2 px-2">
          <button
            onClick={() => { setViewMode('library'); setSelectedPlaylist(null); setSelectedArtist(null) }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'library' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Music className="w-3 h-3" />
            Liked
          </button>
          <button
            onClick={() => { setViewMode('recent'); setSelectedPlaylist(null); setSelectedArtist(null) }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'recent' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <History className="w-3 h-3" />
            Recent
          </button>
          <button
            onClick={() => { setViewMode('playlists'); setSelectedPlaylist(null); setSelectedArtist(null) }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'playlists' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <List className="w-3 h-3" />
            Playlists
          </button>
          <button
            onClick={() => { setViewMode('artists'); setSelectedPlaylist(null); setSelectedArtist(null) }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'artists' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <User className="w-3 h-3" />
            Artists
          </button>
          <button
            onClick={() => { setViewMode('search'); setSelectedPlaylist(null); setSelectedArtist(null) }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'search' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Search className="w-3 h-3" />
            Search
          </button>
        </div>

        {/* Search Bar (for search mode or filtering) */}
        {(viewMode === 'search' || viewMode === 'library' || viewMode === 'recent') && (
          <div className="relative mb-2 px-2">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={viewMode === 'search' ? "Search Spotify..." : "Filter..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 bg-gray-700 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        )}

        {/* Filter Controls */}
        {(viewMode === 'library' || viewMode === 'search') && (
          <div className="flex gap-1 mb-2 px-2">
            <button
              onClick={() => setFilterType('all')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Filter className="w-3 h-3" />
              All
            </button>
            <button
              onClick={() => setFilterType('bpm')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
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
          <div className="mb-2 px-2 py-1 bg-gray-700 rounded mx-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-300">BPM Range</span>
              <span className="text-xs text-gray-400 font-mono">{bpmFilter.min} - {bpmFilter.max}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-8">Min:</span>
                <input
                  type="range"
                  min="60"
                  max="200"
                  value={bpmFilter.min}
                  onChange={(e) => {
                    const newMin = parseInt(e.target.value)
                    setBpmFilter(prev => ({ 
                      min: Math.min(newMin, prev.max - 10), 
                      max: prev.max 
                    }))
                  }}
                  className="flex-1 h-1"
                />
                <span className="text-xs text-purple-400 font-mono w-8">{bpmFilter.min}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-8">Max:</span>
                <input
                  type="range"
                  min="60"
                  max="200"
                  value={bpmFilter.max}
                  onChange={(e) => {
                    const newMax = parseInt(e.target.value)
                    setBpmFilter(prev => ({ 
                      min: prev.min,
                      max: Math.max(newMax, prev.min + 10)
                    }))
                  }}
                  className="flex-1 h-1"
                />
                <span className="text-xs text-purple-400 font-mono w-8">{bpmFilter.max}</span>
              </div>
            </div>
          </div>
        )}

        {/* API Error Display */}
        {apiError && (
          <div className="mb-2 mx-2 p-2 bg-red-900 border border-red-700 rounded">
            <div className="text-red-200 text-xs mb-1">{apiError}</div>
            <div className="flex gap-1">
              <button
                onClick={async () => {
                  setApiError(null)
                  const success = await refreshSpotifyToken()
                  if (success) {
                    // Retry the current view's fetch
                    if (viewMode === 'library') {
                      await fetchUserTracks()
                    } else if (viewMode === 'recent') {
                      await fetchRecentlyPlayed()
                    } else if (viewMode === 'playlists') {
                      await fetchPlaylists()
                    } else if (viewMode === 'artists') {
                      await fetchTopArtists()
                    }
                  } else {
                    setApiError('Failed to refresh token. Please sign in again.')
                  }
                }}
                className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded disabled:opacity-50"
                disabled={refreshing || loading}
              >
                {refreshing ? 'Refreshing...' : 'Retry'}
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* Manual Refresh Button */}
        {(viewMode === 'library' || viewMode === 'recent' || viewMode === 'playlists') && (
          <div className="mb-2 px-2">
            <button
              onClick={() => {
                if (viewMode === 'library') {
                  fetchUserTracks()
                } else if (viewMode === 'recent') {
                  fetchRecentlyPlayed()
                } else if (viewMode === 'playlists') {
                  fetchPlaylists()
                }
              }}
              className="w-full py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
              disabled={loading}
            >
              {loading ? 'Loading...' : `Refresh ${viewMode === 'library' ? 'Liked' : viewMode === 'recent' ? 'Recent' : 'Playlists'}`}
            </button>
          </div>
        )}

        {/* Deck Selector */}
        <div className="flex gap-1 mb-2 px-2">
          <button
            onClick={() => setSelectedDeck('A')}
            className={`flex-1 py-1 rounded text-sm font-medium transition-colors ${
              selectedDeck === 'A' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Deck A
          </button>
          <button
            onClick={() => setSelectedDeck('B')}
            className={`flex-1 py-1 rounded text-sm font-medium transition-colors ${
              selectedDeck === 'B' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Deck B
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
          <div className="p-2">
            {playlists.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <List className="w-12 h-12 mx-auto mb-2" />
                <p>No playlists found</p>
                <p className="text-xs mt-2">Try refreshing or check your Spotify account</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => { setSelectedPlaylist(playlist.id); fetchPlaylistTracks(playlist.id) }}
                className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 cursor-pointer transition-colors"
              >
                {playlist.images && playlist.images.length > 0 && playlist.images[0]?.url ? (
                  <img
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    className="w-full aspect-square rounded mb-2 object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square rounded mb-2 bg-gray-600 flex items-center justify-center">
                    <List className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="text-sm font-semibold text-white truncate">{playlist.name}</div>
                <div className="text-xs text-gray-400">{playlist.tracks.total} tracks</div>
              </div>
            ))}
          </div>
            )}
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
          <div className="space-y-1 px-2 py-2">
            {(selectedPlaylist || selectedArtist ? tracks : getFilteredTracks()).map((track) => {
              const enrichedTrack = getEnrichedTrack(track)
              return (
                <div
                  key={track.id}
                  onClick={() => onTrackSelect(enrichedTrack, selectedDeck)}
                  className="flex items-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors"
                >
                  {/* Album Art */}
                  <img
                    src={track.album.images[2]?.url || '/placeholder-album.png'}
                    alt={track.album.name}
                    className="w-10 h-10 rounded flex-shrink-0"
                  />
                  
                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white truncate">
                      {track.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate flex items-center gap-1">
                      <span className="flex items-center gap-0.5">
                        <Music className="w-3 h-3 text-green-500" />
                        <span className="text-green-500 text-[10px]">Spotify</span>
                      </span>
                      <span>•</span>
                      <span className="truncate">{track.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}</span>
                    </div>
                  </div>
                  
                  {/* Track Features */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Camelot Key */}
                    {enrichedTrack.camelotKey && enrichedTrack.camelotKey !== 'Unknown' && (
                      <div 
                        className="text-xs font-mono px-1.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: getCamelotColor(enrichedTrack.camelotKey),
                          color: '#000'
                        }}
                        title={getKeyName(enrichedTrack.audio_features?.key || 0, enrichedTrack.audio_features?.mode || 0)}
                      >
                        {enrichedTrack.camelotKey}
                      </div>
                    )}
                    
                    {/* BPM */}
                    {enrichedTrack.bpm && (
                      <div className={`text-xs font-mono ${getBpmColor(enrichedTrack.bpm)}`}>
                        {enrichedTrack.bpm}
                      </div>
                    )}
                    
                    {/* Energy */}
                    {enrichedTrack.energy !== undefined && (
                      <div className="flex items-center gap-0.5" title={`Energy: ${Math.round(enrichedTrack.energy * 100)}%`}>
                        <Activity className="w-3 h-3 text-orange-400" />
                        <div className="w-8 h-1 bg-gray-600 rounded-full relative">
                          <div 
                            className="absolute h-full bg-orange-400 rounded-full"
                            style={{ width: `${enrichedTrack.energy * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Mood */}
                    {enrichedTrack.valence !== undefined && (
                      <div className="flex items-center" title={`Mood: ${Math.round(enrichedTrack.valence * 100)}%`}>
                        <Smile className={`w-3 h-3 ${
                          enrichedTrack.valence < 0.3 ? 'text-blue-400' :
                          enrichedTrack.valence < 0.7 ? 'text-gray-400' :
                          'text-yellow-400'
                        }`} />
                      </div>
                    )}
                  </div>
                  
                  {/* Duration */}
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    <Clock className="w-3 h-3 inline mr-1" />
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