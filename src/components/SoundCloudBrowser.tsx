import React, { useState, useEffect, useCallback } from 'react'
import { Search, User, Heart, Music, List, Loader, AlertCircle, Cloud } from 'lucide-react'
import { soundCloudService } from '../lib/soundcloudService'
import type { SoundCloudTrack, SoundCloudPlaylist } from '../lib/soundcloudService'

interface SoundCloudBrowserProps {
  onTrackSelect: (track: any, deck: 'A' | 'B') => void
}

type ViewMode = 'tracks' | 'likes' | 'playlists' | 'artists' | 'search'

export const SoundCloudBrowser: React.FC<SoundCloudBrowserProps> = ({ onTrackSelect }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('tracks')
  const [tracks, setTracks] = useState<SoundCloudTrack[]>([])
  const [playlists, setPlaylists] = useState<SoundCloudPlaylist[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeck, setSelectedDeck] = useState<'A' | 'B'>('A')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  
  // Check auth status
  useEffect(() => {
    setIsAuthenticated(soundCloudService.isAuthenticated())
    setIsConfigured(soundCloudService.isConfigured())
  }, [])
  
  // Load initial data
  useEffect(() => {
    if (isAuthenticated && viewMode !== 'search') {
      loadData()
    }
  }, [viewMode, isAuthenticated])
  
  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      switch (viewMode) {
        case 'tracks':
          const userTracks = await soundCloudService.getUserTracks()
          setTracks(userTracks)
          break
          
        case 'likes':
          const likedTracks = await soundCloudService.getUserLikes()
          setTracks(likedTracks)
          break
          
        case 'playlists':
          const userPlaylists = await soundCloudService.getUserPlaylists()
          setPlaylists(userPlaylists)
          break
          
        case 'artists':
          // Load tracks from followed artists
          const followings = await soundCloudService.getFollowings()
          // For demo, just show first artist's tracks
          if (followings.length > 0) {
            const artistTracks = await soundCloudService.getUserTracks(followings[0].id)
            setTracks(artistTracks)
          }
          break
      }
    } catch (err) {
      console.error('Error loading SoundCloud data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setError(null)
    
    try {
      const results = await soundCloudService.searchTracks(searchQuery)
      setTracks(results)
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }
  
  const handleTrackSelect = (track: SoundCloudTrack) => {
    // Format track for our player
    const formattedTrack = soundCloudService.formatTrack(track)
    onTrackSelect(formattedTrack, selectedDeck)
  }
  
  const handleAuth = () => {
    window.location.href = soundCloudService.getAuthUrl()
  }
  
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Not configured yet
  if (!isConfigured) {
    return (
      <div className="p-6 text-center">
        <Cloud className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">SoundCloud Integration Pending</h3>
        <p className="text-sm text-gray-400 mb-4">
          SoundCloud app is under review. API keys will be available soon.
        </p>
        <p className="text-xs text-gray-500">
          Once approved, you'll be able to access your SoundCloud library
          and use advanced DJ features like tempo control and effects.
        </p>
      </div>
    )
  }
  
  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <Cloud className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Connect SoundCloud</h3>
        <p className="text-sm text-gray-400 mb-4">
          Connect your SoundCloud account to access tracks with full DJ controls
        </p>
        <button
          onClick={handleAuth}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors flex items-center gap-2 mx-auto"
        >
          <Cloud className="w-5 h-5" />
          Connect SoundCloud
        </button>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* View Mode Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setViewMode('tracks')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            viewMode === 'tracks' ? 'bg-gray-700 text-white border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Music className="w-4 h-4 mx-auto mb-1" />
          My Tracks
        </button>
        <button
          onClick={() => setViewMode('likes')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            viewMode === 'likes' ? 'bg-gray-700 text-white border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4 mx-auto mb-1" />
          Likes
        </button>
        <button
          onClick={() => setViewMode('playlists')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            viewMode === 'playlists' ? 'bg-gray-700 text-white border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          <List className="w-4 h-4 mx-auto mb-1" />
          Playlists
        </button>
        <button
          onClick={() => setViewMode('artists')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            viewMode === 'artists' ? 'bg-gray-700 text-white border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4 mx-auto mb-1" />
          Artists
        </button>
      </div>
      
      {/* Search Bar */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search SoundCloud..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2 bg-gray-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded transition-colors"
          >
            Search
          </button>
        </div>
        
        {/* Deck Selector */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setSelectedDeck('A')}
            className={`flex-1 py-1 rounded text-sm ${
              selectedDeck === 'A' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Load to Deck A
          </button>
          <button
            onClick={() => setSelectedDeck('B')}
            className={`flex-1 py-1 rounded text-sm ${
              selectedDeck === 'B' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Load to Deck B
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader className="w-6 h-6 text-orange-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        ) : viewMode === 'playlists' ? (
          /* Playlist View */
          <div className="space-y-2">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  {playlist.artwork_url && (
                    <img
                      src={playlist.artwork_url}
                      alt={playlist.title}
                      className="w-12 h-12 rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{playlist.title}</div>
                    <div className="text-sm text-gray-400">
                      {playlist.track_count} tracks • {formatDuration(playlist.duration)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Track View */
          <div className="space-y-2">
            {tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => handleTrackSelect(track)}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  {track.artwork_url && (
                    <img
                      src={track.artwork_url.replace('-large', '-t300x300')}
                      alt={track.title}
                      className="w-12 h-12 rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{track.title}</div>
                    <div className="text-sm text-gray-400 truncate flex items-center gap-1">
                      <span className="flex items-center gap-0.5">
                        <Cloud className="w-3 h-3 text-orange-500" />
                        <span className="text-orange-500 text-[10px]">SoundCloud</span>
                      </span>
                      <span>•</span>
                      <span className="truncate">{track.user.username}</span>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-400">{formatDuration(track.duration)}</div>
                    {track.bpm && (
                      <div className="text-orange-400 font-mono">{track.bpm} BPM</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}